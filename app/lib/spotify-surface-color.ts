const cache = new Map<string, { color: string; expires: number }>();

interface ColorRequest {
  endpoint?: string; spotifyUrl: string; consent: boolean; development?: boolean;
  signal?: AbortSignal; fetcher?: typeof fetch;
}

// This request goes only to our metadata backend, after consent. The backend
// returns one validated hex color, never the embed HTML or playback credentials.
export async function spotifySurfaceColor({ endpoint, spotifyUrl, consent, development = false, signal, fetcher = (url, init) => fetch(url, init) }: ColorRequest): Promise<string | undefined> {
  if (!consent || !endpoint || signal?.aborted) return;
  try {
    const track = new URL(spotifyUrl);
    const id = track.pathname.match(/^\/track\/([a-zA-Z0-9]{22})$/)?.[1];
    if (track.origin !== 'https://open.spotify.com' || !id || track.search || track.hash) return;
    const source = new URL(endpoint);
    if (source.protocol !== 'https:' && !(development && source.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(source.hostname))) return;
    if (!source.pathname.endsWith('/v1/recent') || source.search || source.hash || source.username || source.password) return;
    const url = new URL(`./color/${id}`, source);
    const key = url.href;
    const saved = cache.get(key);
    if (saved && saved.expires > Date.now()) return saved.color;
    const requestUrl = development && /^https:\/\/[^/]+\.workers\.dev\/v1\/recent$/.test(source.href) ? `/__spotify/color/${id}` : url.href;
    const response = await fetcher(requestUrl, {
      credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    });
    if (!response.ok || signal?.aborted) return;
    const data = await response.json();
    if (signal?.aborted || data.status !== 'ok' || typeof data.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(data.color)) return;
    const color = data.color.toLowerCase();
    if (cache.size >= 20) cache.delete(cache.keys().next().value!);
    cache.set(key, { color, expires: Date.now() + 86_400_000 });
    return color;
  } catch { return; }
}
