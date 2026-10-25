import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpotifyService } from '../server/spotify/service.mjs';
import { sealToken, openToken } from '../server/spotify/crypto.mjs';
import { createAuthorization, acceptCallback, validateRedirect, redeemCode } from '../server/spotify/oauth.mjs';
const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const redirect = 'http://127.0.0.1:8788/callback';
const clientId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const track = { id: '5zrZHMklhOXABpnBl0EMBN', name: 'Novacane', artists: [{ name: 'Frank Ocean', private: 'omit' }], album: { images: [{ url: 'https://i.scdn.co/image/example', width: 640 }] }, private: 'omit' };
const json = (data, status = 200, headers) => Response.json(data, { status, headers });
async function fixture(fetcher) {
  const values = new Map();
  const store = { get: async key => values.get(key), put: async (key, value) => { values.set(key, value); }, delete: async key => values.delete(key) };
  const config = { store, clientId, clientSecret: 'test-secret-only', tokenKey: key, tokenSeed: await sealToken('test-refresh-only', key), fetcher };
  return { service: new SpotifyService(config), config, values };
}
test('refresh token encryption authenticates data and uses a fresh nonce', async () => {
  const first = await sealToken('test-refresh-only', key);
  const second = await sealToken('test-refresh-only', key);
  assert.notEqual(first, second);
  assert.ok(!first.includes('test-refresh-only'));
  assert.equal(await openToken(first, key), 'test-refresh-only');
  const damaged = JSON.parse(first); damaged.ciphertext = btoa('tampered');
  await assert.rejects(openToken(JSON.stringify(damaged), key));
});
test('OAuth uses one narrow permission and PKCE, with no secrets in authorization URL', async () => {
  const session = await createAuthorization(clientId, redirect, 1000);
  const url = new URL(session.url);
  assert.equal(url.origin, 'https://accounts.spotify.com');
  assert.equal(url.searchParams.get('scope'), 'user-read-recently-played');
  assert.equal(url.searchParams.get('redirect_uri'), redirect);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(!session.url.includes(session.verifier));
  assert.throws(() => validateRedirect('http://localhost:8788/callback'));
  assert.throws(() => validateRedirect('https://evil.example/callback'));
});
test('OAuth rejects bad state, expiry and replay before code exchange', async () => {
  const session = await createAuthorization(clientId, redirect, 1000);
  assert.throws(() => acceptCallback(`${redirect}?code=test&state=wrong`, session, 1001));
  assert.equal(session.used, false);
  assert.throws(() => acceptCallback(`${redirect}?code=test&state=${session.state}`, session, session.expires));
  const callback = `${redirect}?code=test&state=${session.state}`;
  assert.equal(acceptCallback(callback, session, 1002), 'test');
  assert.throws(() => acceptCallback(callback, session, 1003));
});
test('code exchange keeps secret and verifier in server request, not URL', async () => {
  const session = await createAuthorization(clientId, redirect);
  const token = await redeemCode({ code: 'test-code', session, clientId, clientSecret: 'test-secret-only', fetcher: async (url, init) => {
    assert.equal(url, 'https://accounts.spotify.com/api/token');
    assert.equal(init.body.get('code_verifier'), session.verifier);
    assert.equal(init.body.get('redirect_uri'), redirect);
    assert.ok(init.headers.Authorization.startsWith('Basic '));
    return json({ refresh_token: 'test-refresh-only', scope: 'user-read-recently-played' });
  } });
  assert.equal(token, 'test-refresh-only');
});
test('public response is an allowlist and concurrent requests share cached work', async () => {
  let requests = 0;
  const { service } = await fixture(async url => {
    requests++;
    return url.includes('/api/token') ? json({ access_token: 'test-access-only', expires_in: 3600 }) : json({ items: [{ track, context: 'private-context', played_at: 'private-time' }] });
  });
  const results = await Promise.all([service.recent('a'), service.recent('b')]);
  await service.recent('a');
  assert.equal(requests, 2);
  assert.deepEqual(Object.keys(results[0].body.track).sort(), ['artist', 'artworkUrl', 'spotifyUrl', 'title']);
  const output = JSON.stringify(results);
  for (const text of ['test-access-only', 'test-refresh-only', 'test-secret-only', 'private-time', 'private-context']) assert.ok(!output.includes(text));
});
test('rotated refresh token is encrypted and survives a service restart', async () => {
  const { service, config, values } = await fixture(async url => url.includes('/api/token') ? json({ access_token: 'test-access-only', expires_in: 3600, refresh_token: 'rotated-test-refresh' }) : json({ items: [] }));
  await service.recent();
  const saved = values.get('encrypted-refresh-v1');
  assert.ok(!saved.includes('rotated-test-refresh'));
  assert.equal(await openToken(saved, key), 'rotated-test-refresh');
  let refreshChecked = false;
  const restarted = new SpotifyService({ ...config, now: () => Date.now() + 86_400_000, fetcher: async (url, init) => {
    if (url.includes('/api/token')) { refreshChecked = true; assert.equal(init.body.get('refresh_token'), 'rotated-test-refresh'); return json({ access_token: 'test-new-access', expires_in: 3600 }); }
    return json({ items: [] });
  } });
  assert.equal((await restarted.recent()).body.status, 'empty');
  assert.equal(refreshChecked, true);
});
test('authorization failure returns only a safe reconnect state', async () => {
  const { service } = await fixture(async () => json({ error: 'invalid_grant', internal: 'do-not-expose' }, 400));
  assert.deepEqual((await service.recent()).body, { status: 'reauthorize' });
});
test('Spotify Retry-After prevents repeated upstream requests', async () => {
  let requests = 0;
  const { service } = await fixture(async url => {
    requests++;
    return url.includes('/api/token') ? json({ access_token: 'test-access-only', expires_in: 3600 }) : json({}, 429, { 'Retry-After': '120' });
  });
  assert.equal((await service.recent()).retryAfter, 120);
  await service.recent('b');
  assert.equal(requests, 2);
});
test('untrusted artwork and excessive visitor requests are rejected', async () => {
  const { service } = await fixture(async url => url.includes('/api/token') ? json({ access_token: 'test-access-only', expires_in: 3600 }) : json({ items: [{ track: { ...track, album: { images: [{ url: 'https://evil.example/image', width: 640 }] } } }] }));
  assert.equal((await service.recent()).body.status, 'unavailable');
  for (let i = 0; i < 29; i++) await service.recent();
  assert.equal((await service.recent()).code, 429);
});
test('Cloudflare-compatible requests use manual redirects and never follow them', async () => {
  for (const redirectStage of ['token', 'track']) {
    let requests = 0;
    const modes = [];
    const { service } = await fixture(async (url, init) => {
      requests++;
      modes.push(init.redirect);
      if (url.includes('/api/token') && redirectStage === 'track') return json({ access_token: 'test-access-only', expires_in: 3600 });
      return new Response(null, { status: 302, headers: { Location: 'https://evil.example/never-follow' } });
    });
    assert.deepEqual((await service.recent()).body, { status: 'unavailable' });
    assert.equal(requests, redirectStage === 'token' ? 1 : 2);
    assert.ok(modes.every(mode => mode === 'manual'));
  }
});
test('default fetcher preserves the native global fetch receiver', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (url) {
    if (this !== globalThis && this !== undefined) throw new TypeError('Illegal invocation');
    return Promise.resolve(url.includes('/api/token') ? json({ access_token: 'test-access-only', expires_in: 3600 }) : json({ items: [{ track }] }));
  };
  try {
    const { service } = await fixture();
    assert.equal((await service.recent()).body.status, 'ok');
  } finally { globalThis.fetch = originalFetch; }
});
test('daily selection is the latest twenty distinct valid tracks, with no private history', async () => {
  const raw = Array.from({ length: 30 }, (_, index) => ({ track: { ...track, id: String(index).padStart(22, 'a'), name: `Track ${index}` }, played_at: 'private-time' }));
  raw.splice(1, 0, raw[0], { track: null });
  const { service, values } = await fixture(async url => {
    if (url.includes('/api/token')) return json({ access_token: 'test-access-only', expires_in: 3600 });
    assert.equal(new URL(url).searchParams.get('limit'), '50');
    return json({ items: raw });
  });
  values.set('daily-selection-v1', { old: true });
  const result = await service.recent();
  assert.equal(result.body.tracks.length, 20);
  assert.equal(result.body.track.title, 'Track 0');
  assert.equal(result.body.tracks[19].title, 'Track 19');
  assert.equal(new Set(result.body.tracks.map(item => item.spotifyUrl)).size, 20);
  assert.ok(!JSON.stringify(values.get('daily-selection-v3')).includes('private-time'));
  assert.equal(values.has('daily-selection-v1'), false);
});

test('deleted preview experiment leaves no audio URLs or market data in public or persisted selection', async () => {
  const raw = Array.from({ length: 50 }, (_, index) => ({ track: {
    ...track, id: String(index).padStart(22, 'a'), name: `Track ${index}`,
    preview_url: index < 25 ? null : `https://p.scdn.co/mp3-preview/${String(index).padStart(40, 'a')}`,
    available_markets: ['CO', 'US'],
  } }));
  const { service, values } = await fixture(async url => url.includes('/api/token') ? json({ access_token: 'test-access-only', expires_in: 3600 }) : json({ items: raw }));
  const { body } = await service.recent('a');
  assert.equal(body.tracks[0].title, 'Track 0');
  assert.equal(body.tracks.length, 20);
  assert.deepEqual(Object.keys(body).sort(), ['status', 'track', 'tracks']);
  const saved = JSON.stringify(values.get('daily-selection-v3'));
  for (const obsolete of ['mp3-preview', 'previewUrl', 'markets', 'previewCandidates']) assert.ok(!saved.includes(obsolete));
});

test('legacy selection migration preserves today without requests and discards obsolete preview storage', async () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const { service, values } = await fixture(() => { throw new Error('Should use persisted selection'); });
  service.now = () => now;
  const metadata = { title: 'Saved song', artist: 'Artist', artworkUrl: 'https://i.scdn.co/image/example', spotifyUrl: `https://open.spotify.com/track/${track.id}` };
  values.set('daily-selection-v2', { day: '2026-10-23', body: { status: 'ok', track: metadata, tracks: [metadata], previewCandidates: [{ ...metadata, previewUrl: 'obsolete-audio', markets: ['CO'] }] } });
  const result = await service.recent('a');
  assert.deepEqual(result.body, { status: 'ok', track: metadata, tracks: [metadata] });
  assert.equal(values.has('daily-selection-v2'), false);
  assert.deepEqual(values.get('daily-selection-v3'), { day: '2026-10-23', body: result.body });
});
test('daily selection survives restarts and changes at midnight in Bogotá, not UTC', async () => {
  let time = Date.parse('2026-10-23T04:59:00Z');
  let historyCalls = 0;
  const fetcher = async url => {
    if (url.includes('/api/token')) return json({ access_token: 'test-access-only', expires_in: 3600 });
    historyCalls++;
    return json({ items: [{ track: { ...track, name: `Selection ${historyCalls}` } }] });
  };
  const { service, config } = await fixture(fetcher);
  service.now = () => time;
  assert.equal((await service.recent()).body.track.title, 'Selection 1');
  const restarted = new SpotifyService({ ...config, now: () => time });
  assert.equal((await restarted.recent()).body.track.title, 'Selection 1');
  assert.equal(historyCalls, 1);
  time = Date.parse('2026-10-23T05:00:01Z');
  assert.equal((await restarted.recent()).body.track.title, 'Selection 2');
  assert.equal(historyCalls, 2);
});
