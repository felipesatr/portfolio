const CACHE_KEY = 'embed-colors-v1';
const DAY = 86_400_000;
const FAILURE_TTL = 300_000;
const MAX_HTML = 2_097_152;
const validColor = color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);

// Public embed hydration data, not a documented Spotify API. Fail closed if
// Spotify changes its shape. Parse only JSON; never execute returned markup.
export function colorFromEmbedHtml(html, id) {
  if (typeof html !== 'string' || html.length > MAX_HTML) return;
  const match = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script\s*>/i);
  if (!match) return;
  try {
    const entity = JSON.parse(match[1])?.props?.pageProps?.state?.data?.entity;
    if (entity?.uri !== `spotify:track:${id}`) return;
    const color = entity.visualIdentity?.backgroundBase;
    if (color?.alpha !== 255 || !['red', 'green', 'blue'].every(channel => Number.isInteger(color[channel]) && color[channel] >= 0 && color[channel] <= 255)) return;
    return `#${[color.red, color.green, color.blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  } catch { return; }
}

async function boundedHtml(response) {
  if (!response.headers.get('Content-Type')?.toLowerCase().includes('text/html') || Number(response.headers.get('Content-Length')) > MAX_HTML) { await response.body?.cancel(); return; }
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let size = 0, html = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return html + decoder.decode();
      size += value.byteLength;
      if (size > MAX_HTML) { await reader.cancel(); return; }
      html += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

export class SpotifyEmbedColors {
  constructor({ store, fetcher = (url, init) => fetch(url, init), now = Date.now }) {
    Object.assign(this, { store, fetcher, now });
    this.cache = new Map(); this.pending = new Map(); this.blockedUntil = 0;
    this.loaded = null; this.saving = Promise.resolve();
  }
  async restore() {
    const saved = await this.store.get(CACHE_KEY);
    this.blockedUntil = Number.isFinite(saved?.blockedUntil) ? saved.blockedUntil : 0;
    for (const entry of (Array.isArray(saved?.entries) ? saved.entries : []).slice(0, 20)) {
      if (Array.isArray(entry) && /^[a-zA-Z0-9]{22}$/.test(entry[0]) && entry[1]?.expires > this.now() && (entry[1].color === null || validColor(entry[1].color))) this.cache.set(entry[0], entry[1]);
    }
  }
  async save() {
    this.saving = this.saving.catch(() => {}).then(() => this.store.put(CACHE_KEY, { blockedUntil: this.blockedUntil, entries: [...this.cache].slice(-20) }));
    await this.saving;
  }
  async get(id, selection) {
    if (!/^[a-zA-Z0-9]{22}$/.test(id) || !selection.includes(id)) return { code: 404, body: { status: 'unavailable' } };
    this.loaded ??= this.restore();
    await this.loaded;
    for (const cachedId of this.cache.keys()) if (!selection.includes(cachedId)) this.cache.delete(cachedId);
    const saved = this.cache.get(id);
    if (saved?.expires > this.now() && saved.color) return { code: 200, body: { status: 'ok', color: saved.color } };
    if (this.blockedUntil > this.now()) return { code: 503, body: { status: 'unavailable' }, retryAfter: Math.ceil((this.blockedUntil - this.now()) / 1000) };
    if (saved?.expires > this.now()) return { code: 503, body: { status: 'unavailable' } };
    if (this.pending.has(id)) return this.pending.get(id);
    const request = this.load(id);
    this.pending.set(id, request);
    try { return await request; } finally { this.pending.delete(id); }
  }
  async load(id) {
    let color, retryAfter;
    try {
      const response = await this.fetcher(`https://open.spotify.com/embed/track/${id}`, {
        headers: { Accept: 'text/html' }, credentials: 'omit', referrerPolicy: 'no-referrer',
        redirect: 'manual', signal: AbortSignal.timeout(3500),
      });
      if (response.status === 429) {
        retryAfter = Math.min(3600, Math.max(30, Number(response.headers.get('Retry-After')) || 300));
        this.blockedUntil = this.now() + retryAfter * 1000;
      }
      if (response.ok) color = colorFromEmbedHtml(await boundedHtml(response), id);
      else await response.body?.cancel();
    } catch { /* Color failure must not interrupt metadata or playback. */ }
    this.cache.set(id, { color: color ?? null, expires: this.now() + (color ? DAY : FAILURE_TTL) });
    while (this.cache.size > 20) this.cache.delete(this.cache.keys().next().value);
    await this.save();
    return color ? { code: 200, body: { status: 'ok', color } } : { code: 503, body: { status: 'unavailable' }, ...(retryAfter ? { retryAfter } : {}) };
  }
}
