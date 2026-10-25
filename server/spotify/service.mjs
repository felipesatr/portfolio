import { openToken, sealToken } from './crypto.mjs';
import { SpotifyEmbedColors } from './embed-colors.mjs';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
// One fixed history endpoint. Fetch enough plays to deduplicate a 20-song queue.
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=50';
const TOKEN_STORAGE_KEY = 'encrypted-refresh-v1';
const SNAPSHOT_KEY = 'daily-selection-v3';
const DAY = 86_400_000;
const BOGOTA_OFFSET = 5 * 60 * 60 * 1000;
const selectionDay = now => new Date(now - BOGOTA_OFFSET).toISOString().slice(0, 10);
const nextDay = now => (Math.floor((now - BOGOTA_OFFSET) / DAY) + 1) * DAY + BOGOTA_OFFSET;
const ok = (body) => ({ code: 200, body });
class ConnectionError extends Error {}

function trackFrom(value) {
  if (!value || typeof value.name !== 'string' || !value.name || value.name.length > 1024 || !/^[a-zA-Z0-9]{22}$/.test(value.id)) return null;
  const artist = value.artists?.map(item => item.name).filter(name => typeof name === 'string' && name).join(', ');
  const images = value.album?.images;
  const image = images?.find(item => item.width >= 300) ?? images?.[0];
  if (!artist || artist.length > 1024 || !image) return null;
  try {
    const art = new URL(image.url);
    if (art.protocol !== 'https:' || art.username || art.password || !(art.hostname === 'i.scdn.co' || art.hostname.endsWith('.spotifycdn.com'))) return null;
    return { title: value.name, artist, artworkUrl: art.href, spotifyUrl: `https://open.spotify.com/track/${value.id}` };
  } catch { return null; }
}

export class SpotifyService {
  constructor({ store, clientId, clientSecret, tokenKey, tokenSeed, fetcher = (url, init) => fetch(url, init), now = Date.now }) {
    Object.assign(this, { store, clientId, clientSecret, tokenKey, tokenSeed, fetcher, now });
    this.access = null;
    this.cached = null;
    this.pending = null;
    this.refreshing = null;
    this.rateWindows = new Map();
    this.embedColors = new SpotifyEmbedColors({ store, fetcher, now: () => this.now() });
  }
  allow(visitor) {
    const now = this.now();
    for (const [key, window] of this.rateWindows) if (window.expires <= now) this.rateWindows.delete(key);
    if (this.rateWindows.size >= 2048 && !this.rateWindows.has(visitor)) return false;
    const window = this.rateWindows.get(visitor) ?? { count: 0, expires: now + 60_000 };
    window.count++;
    this.rateWindows.set(visitor, window);
    return window.count <= 30;
  }
  async accessToken(force = false) {
    if (!force && this.access?.expires > this.now() + 30_000) return this.access.token;
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.refreshAccess();
    try { return await this.refreshing; } finally { this.refreshing = null; }
  }
  async refreshAccess() {
    let encrypted = await this.store.get(TOKEN_STORAGE_KEY);
    if (this.tokenSeed && await this.store.get('imported-seed-v1') !== this.tokenSeed) {
      // Validate before importing. Only a local owner-only OAuth tool creates seeds.
      await openToken(this.tokenSeed, this.tokenKey);
      encrypted = this.tokenSeed;
      await this.store.put(TOKEN_STORAGE_KEY, encrypted);
      await this.store.put('imported-seed-v1', this.tokenSeed);
    }
    if (!encrypted) throw new ConnectionError();
    const refreshToken = await openToken(encrypted, this.tokenKey);
    const response = await this.fetcher(TOKEN_URL, {
      // Workers rejects redirect:"error"; manual never forwards credentials.
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}` },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    if (response.status === 400 || response.status === 401 || response.status === 403) throw new ConnectionError();
    if (response.status === 429) {
      const error = new Error('Rate limited');
      error.retryAfter = retrySeconds(response);
      throw error;
    }
    if (!response.ok) throw new Error('Spotify unavailable');
    const data = await response.json();
    if (typeof data.access_token !== 'string' || !data.access_token || !Number.isFinite(data.expires_in)) throw new Error('Invalid token response');
    if (data.scope && !data.scope.split(' ').includes('user-read-recently-played')) throw new ConnectionError();
    if (data.refresh_token && data.refresh_token !== refreshToken) await this.store.put(TOKEN_STORAGE_KEY, await sealToken(data.refresh_token, this.tokenKey));
    this.access = { token: data.access_token, expires: this.now() + data.expires_in * 1000 };
    return this.access.token;
  }
  async recent(visitor = 'local') {
    if (!this.allow(visitor)) return { code: 429, body: { status: 'unavailable' }, retryAfter: 60 };
    if (!this.clientId || !this.clientSecret || !this.tokenKey) return { code: 503, body: { status: 'not-connected' } };
    if (this.cached?.expires > this.now()) return this.cached.result;
    if (this.pending) return this.pending;
    const started = this.now();
    this.pending = this.dailySelection();
    try {
      const result = await this.pending;
      this.cached = { result, expires: result.code === 200 ? nextDay(started) : this.now() + (result.retryAfter ? result.retryAfter * 1000 : 30_000) };
      return result;
    } finally { this.pending = null; }
  }
  async color(id, visitor = 'local') {
    if (!this.allow(visitor)) return { code: 429, body: { status: 'unavailable' }, retryAfter: 60 };
    const saved = await this.store.get(SNAPSHOT_KEY) ?? await this.store.get('daily-selection-v2');
    const selection = saved?.day === selectionDay(this.now()) && Array.isArray(saved.body?.tracks)
      ? saved.body.tracks.slice(0, 20).flatMap(track => {
        const match = typeof track?.spotifyUrl === 'string' && track.spotifyUrl.match(/^https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})$/);
        return match ? [match[1]] : [];
      }) : [];
    return this.embedColors.get(id, selection);
  }
  async dailySelection() {
    const day = selectionDay(this.now());
    const current = await this.store.get(SNAPSHOT_KEY);
    const saved = current ?? await this.store.get('daily-selection-v2');
    if (saved?.day === day && saved.body && Array.isArray(saved.body.tracks)) {
      // Preserve today's selection during migration, but retire the deleted
      // direct-preview experiment's audio URLs and market data.
      const tracks = saved.body.tracks.slice(0, 20).map(({ title, artist, artworkUrl, spotifyUrl }) => ({ title, artist, artworkUrl, spotifyUrl }));
      const body = tracks.length ? { status: 'ok', track: tracks[0], tracks } : { status: 'empty', tracks: [] };
      if (!current) await this.saveSelection(day, body);
      return ok(body);
    }
    const result = await this.load();
    // Keep only the current public selection, never the upstream history or
    // listening timestamps. This survives object sleep/restarts without polling.
    if (result.code === 200) {
      await this.saveSelection(day, result.body);
    }
    return result;
  }
  async saveSelection(day, body) {
    await this.store.put(SNAPSHOT_KEY, { day, body });
    if (this.store.delete) {
      await this.store.delete('daily-selection-v1');
      await this.store.delete('daily-selection-v2');
    }
  }
  async load() {
    try {
      const request = async force => this.fetcher(RECENT_URL, { headers: { Authorization: `Bearer ${await this.accessToken(force)}` }, redirect: 'manual', signal: AbortSignal.timeout(8000) });
      let response = await request(false);
      if (response.status === 401) response = await request(true);
      if (response.status === 401 || response.status === 403) throw new ConnectionError();
      if (response.status === 429) return { code: 503, body: { status: 'unavailable' }, retryAfter: retrySeconds(response) };
      if (!response.ok) throw new Error('Spotify unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid response');
      if (!data.items.length) return ok({ status: 'empty', tracks: [] });
      const tracks = [];
      const seen = new Set();
      for (const item of data.items.slice(0, 50)) {
        const track = trackFrom(item?.track);
        if (!track) continue;
        if (!seen.has(track.spotifyUrl) && tracks.length < 20) {
          seen.add(track.spotifyUrl);
          tracks.push(track);
        }
      }
      if (!tracks.length) throw new Error('Invalid tracks');
      return ok({ status: 'ok', track: tracks[0], tracks });
    } catch (error) {
      // Never propagate upstream bodies, OAuth details, stack traces or credentials.
      return { code: 503, body: { status: error instanceof ConnectionError ? 'reauthorize' : 'unavailable' }, ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) };
    }
  }
}
function retrySeconds(response) {
  return Math.min(3600, Math.max(30, Number(response.headers.get('Retry-After')) || 60));
}
