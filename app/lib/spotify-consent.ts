export const SPOTIFY_CONSENT_KEY = 'portfolio-spotify-consent';
export const SPOTIFY_DISCLOSURE_VERSION = 1;
// Product setting, not a statutory retention period.
export const SPOTIFY_CONSENT_MONTHS = 6;
export const SPOTIFY_CONSENT_EVENT = 'portfolio-spotify-consent-change';

export function validSpotifyConsent(raw: string | null, now = Date.now()): boolean {
  try {
    const record = JSON.parse(raw ?? 'null');
    return record?.version === SPOTIFY_DISCLOSURE_VERSION && record.accepted === true &&
      Number.isFinite(record.acceptedAt) && Number.isFinite(record.expiresAt) &&
      record.acceptedAt <= now && record.expiresAt > now;
  } catch { return false; }
}

let memoryConsent: string | null = null;
let withdrawn = false;
export function readSpotifyConsent(): boolean {
  if (typeof window === 'undefined' || withdrawn) return false;
  try { return validSpotifyConsent(memoryConsent ?? window.localStorage.getItem(SPOTIFY_CONSENT_KEY)); }
  catch { return validSpotifyConsent(memoryConsent); }
}

export function acceptSpotifyConsent(): boolean {
  const acceptedAt = Date.now();
  const expiry = new Date(acceptedAt);
  expiry.setMonth(expiry.getMonth() + SPOTIFY_CONSENT_MONTHS);
  const record = JSON.stringify({ accepted: true, version: SPOTIFY_DISCLOSURE_VERSION, acceptedAt, expiresAt: expiry.getTime() });
  memoryConsent = record;
  withdrawn = false;
  let saved = false;
  try { window.localStorage.setItem(SPOTIFY_CONSENT_KEY, record); saved = true; } catch { /* This tab only. */ }
  window.dispatchEvent(new Event(SPOTIFY_CONSENT_EVENT));
  return saved;
}

export function withdrawSpotifyConsent() {
  memoryConsent = null;
  withdrawn = true;
  try { window.localStorage.removeItem(SPOTIFY_CONSENT_KEY); } catch { /* In-memory block still applies. */ }
  window.dispatchEvent(new Event(SPOTIFY_CONSENT_EVENT));
}

export function subscribeSpotifyConsent(listener: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== SPOTIFY_CONSENT_KEY && event.key !== null) return;
    memoryConsent = null;
    withdrawn = false;
    listener();
  };
  window.addEventListener('storage', sync);
  window.addEventListener(SPOTIFY_CONSENT_EVENT, listener);
  window.addEventListener('focus', listener);
  // Recheck expiry even if the About tab stays open across the expiry date.
  const timer = window.setInterval(listener, 30_000);
  return () => {
    window.removeEventListener('storage', sync);
    window.removeEventListener(SPOTIFY_CONSENT_EVENT, listener);
    window.removeEventListener('focus', listener);
    clearInterval(timer);
  };
}
