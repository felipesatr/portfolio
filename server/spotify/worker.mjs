import { DurableObject } from 'cloudflare:workers';
import { SpotifyService } from './service.mjs';
import { privateVisitorKey } from './crypto.mjs';

function headers(origin, allowed) {
  return {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", Vary: 'Origin',
    ...(origin && origin === allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
}
export default {
  async scheduled(_controller, env, ctx) {
    const object = env.SPOTIFY_OWNER.get(env.SPOTIFY_OWNER.idFromName('portfolio-owner-v1'));
    ctx.waitUntil(object.fetch('https://internal/recent', { headers: { 'X-Visitor-Key': 'daily-refresh' } }).then(response => {
      if (!response.ok) throw new Error('Daily Spotify selection could not refresh');
    }));
  },
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const responseHeaders = headers(origin, env.ALLOWED_ORIGIN);
    const url = new URL(request.url);
    const color = url.pathname.match(/^\/v1\/color\/([a-zA-Z0-9]{22})$/);
    if ((url.pathname !== '/v1/recent' && !color) || url.search) return new Response('{}', { status: 404, headers: responseHeaders });
    if (origin && origin !== env.ALLOWED_ORIGIN) return new Response('{}', { status: 403, headers: responseHeaders });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...responseHeaders, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return new Response('{}', { status: 405, headers: { ...responseHeaders, Allow: 'GET, OPTIONS' } });
    try {
      const visitor = await privateVisitorKey(request.headers.get('CF-Connecting-IP') || 'local', env.SPOTIFY_TOKEN_KEY || 'unconfigured');
      const object = env.SPOTIFY_OWNER.get(env.SPOTIFY_OWNER.idFromName('portfolio-owner-v1'));
      const result = await object.fetch(`https://internal${color ? `/color/${color[1]}` : '/recent'}`, { headers: { 'X-Visitor-Key': visitor } });
      return new Response(result.body, { status: result.status, headers: { ...responseHeaders, ...(result.headers.has('Retry-After') ? { 'Retry-After': result.headers.get('Retry-After') } : {}) } });
    } catch { return new Response(JSON.stringify({ status: 'unavailable' }), { status: 503, headers: responseHeaders }); }
  },
};

// One private SQLite-backed Durable Object: supported on Workers FREE.
// There are no public setup, login, token, or account-replacement routes.
export class SpotifyOwner extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.service = new SpotifyService({ store: ctx.storage, clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET, tokenKey: env.SPOTIFY_TOKEN_KEY, tokenSeed: env.SPOTIFY_TOKEN_SEED });
  }
  async fetch(request) {
    const url = new URL(request.url);
    const color = url.pathname.match(/^\/color\/([a-zA-Z0-9]{22})$/);
    if (request.method !== 'GET' || (url.pathname !== '/recent' && !color) || url.search) return new Response(null, { status: 404 });
    const visitor = request.headers.get('X-Visitor-Key') || 'local';
    const result = color ? await this.service.color(color[1], visitor) : await this.service.recent(visitor);
    return Response.json(result.body, { status: result.code, headers: { 'Cache-Control': 'no-store', ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}) } });
  }
}
