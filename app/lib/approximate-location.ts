import { exactDistanceKm, greatCircle, spherePoint, type Coordinate } from './globe-geometry';

export type ApproximatePlace = {
  name: string; country: string; countryCode: string; coordinates: Coordinate;
  precision: 'city' | 'region' | 'country'; sources: number; networkUncertain: boolean;
};
export type LocationSample = {
  provider: string; city: string; region: string; country: string; countryCode: string;
  coordinates: Coordinate; network: string;
  proxy?: boolean; vpn?: boolean; mobile?: boolean; hosting?: boolean;
  accuracyKm?: number; cityConfidence?: number;
};
// Two small JSON requests, in parallel, once per document/session cache.
// This is a bound on how long the globe waits, not a page-loading dependency.
export const LOCATION_TIMEOUT_MS = 1600;
const STORAGE_KEY = 'portfolio-approximate-city-v4';
let pending: Promise<ApproximatePlace | null> | null = null;
const text = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 100) : '';
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const optionalBoolean = (value: unknown) => typeof value === 'boolean' ? value : undefined;
const optionalNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const validCoordinates = (value: unknown): value is Coordinate => Array.isArray(value) && value.length === 2 &&
  value.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) && Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;
function validated(sample: LocationSample): LocationSample | null {
  return validCoordinates(sample.coordinates) && /^[A-Z]{2}$/.test(sample.countryCode) && sample.country ? sample : null;
}
export function normalizeIPWhoisSample(value: unknown): LocationSample | null {
  const data = record(value), connection = record(data.connection), security = record(data.security);
  if (data.success !== true) return null;
  return validated({
    provider: 'ipwhois', city: text(data.city), region: text(data.region), country: text(data.country), countryCode: text(data.country_code).toUpperCase(),
    coordinates: [data.latitude, data.longitude] as Coordinate, network: `${text(connection.isp)} ${text(connection.org)}`,
    proxy: optionalBoolean(security.proxy), vpn: optionalBoolean(security.vpn), mobile: optionalBoolean(security.mobile), hosting: optionalBoolean(security.hosting),
    accuracyKm: optionalNumber(data.accuracy_radius), cityConfidence: optionalNumber(data.city_confidence),
  });
}
export function normalizeFreeIPAPISample(value: unknown): LocationSample | null {
  const data = record(value);
  return validated({
    provider: 'freeipapi', city: text(data.cityName), region: text(data.regionName), country: text(data.countryName), countryCode: text(data.countryCode).toUpperCase(),
    coordinates: [data.latitude, data.longitude] as Coordinate, network: text(data.asnOrganization),
    proxy: optionalBoolean(data.isProxy), vpn: optionalBoolean(data.isVpn), mobile: optionalBoolean(data.isMobile), hosting: optionalBoolean(data.isHosting),
    accuracyKm: optionalNumber(data.accuracyRadius), cityConfidence: optionalNumber(data.cityConfidence),
  });
}
export function resolveApproximateLocation(samples: LocationSample[]): ApproximatePlace | null {
  const unique = [...new Map(samples.map((sample) => [sample.provider, sample])).values()];
  if (!unique.length) return null;
  const first = unique[0];
  // Conflicting countries can indicate different proxy exits or bad data.
  if (unique.some((sample) => sample.countryCode !== first.countryCode)) return null;
  const networkUncertain = unique.some((sample) => sample.proxy === true || sample.vpn === true || sample.mobile === true || sample.hosting === true ||
    /\b(mobile|cellular|wireless|satellite|vpn|proxy|hosting|datacenter|data center|cloudflare|amazon web services|google cloud|microsoft azure|digitalocean|hetzner|ovhcloud)\b/i.test(sample.network));
  const spread = Math.max(0, ...unique.map((sample) => exactDistanceKm(first.coordinates, sample.coordinates)));
  const cityAgrees = unique.length > 1 && Boolean(first.city) && unique.every((sample) => normalized(sample.city) === normalized(first.city)) && spread <= 50;
  const regionAgrees = unique.length > 1 && Boolean(first.region) && unique.every((sample) => normalized(sample.region) === normalized(first.region));
  const lowProviderConfidence = unique.some((sample) => (sample.accuracyKm !== undefined && sample.accuracyKm > 50) || (sample.cityConfidence !== undefined && sample.cityConfidence < 70));
  const precision = cityAgrees && !networkUncertain && !lowProviderConfidence ? 'city' :
    regionAgrees && !networkUncertain && spread <= 250 ? 'region' : 'country';
  // Use the midpoint only for nearby estimates; averaging distant city guesses
  // could put a marker somewhere neither provider actually identified.
  const midpoint = unique.length === 2 && spread <= 75 ? greatCircle(spherePoint(first.coordinates), spherePoint(unique[1].coordinates), .5) : null;
  const coordinates: Coordinate = midpoint ? [Math.asin(Math.max(-1, Math.min(1, midpoint[1]))) * 180 / Math.PI, Math.atan2(midpoint[0], midpoint[2]) * 180 / Math.PI] : first.coordinates;
  return { name: precision === 'city' ? first.city : precision === 'region' ? first.region : 'Your area', country: first.country, countryCode: first.countryCode, coordinates, precision, sources: unique.length, networkUncertain };
}
export function locationDetail(place: ApproximatePlace) {
  // Public labels are intentionally country-level even when both providers
  // agree on a city. The dot may still use a better estimate for distance.
  return place.country;
}
async function lookup(url: string, parse: (data: unknown) => LocationSample | null): Promise<LocationSample | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(LOCATION_TIMEOUT_MS), credentials: 'omit', referrerPolicy: 'no-referrer', priority: 'low' });
    return response.ok ? parse(await response.json()) : null;
  } catch { return null; }
}
export function getApproximateLocation(): Promise<ApproximatePlace | null> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
      if (cached?.expires > Date.now() && validCoordinates(cached.coordinates) && typeof cached.name === 'string' && typeof cached.country === 'string' &&
        typeof cached.countryCode === 'string' && /^[A-Z]{2}$/.test(cached.countryCode) && ['city', 'region', 'country'].includes(cached.precision) &&
        typeof cached.networkUncertain === 'boolean' && (cached.sources === 1 || cached.sources === 2)) return cached as ApproximatePlace;
    } catch { /* Optional storage never blocks rendering. */ }
    const results = await Promise.all([
      lookup('https://ipwho.is/?fields=success,city,region,country,country_code,latitude,longitude,connection', normalizeIPWhoisSample),
      lookup('https://free.freeipapi.com/api/v1/json', normalizeFreeIPAPISample),
    ]);
    const place = resolveApproximateLocation(results.filter((result): result is LocationSample => result !== null));
    if (place) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...place, expires: Date.now() + (place.precision === 'city' ? 6 * 60 * 60 : 15 * 60) * 1000 })); } catch { /* Optional cache. */ }
    }
    return place;
  })();
  return pending;
}
