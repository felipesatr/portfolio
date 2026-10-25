import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorFromEmbedHtml, SpotifyEmbedColors } from '../server/spotify/embed-colors.mjs';
import { spotifySurfaceColor } from '../app/lib/spotify-surface-color.ts';
import { SpotifyService } from '../server/spotify/service.mjs';

const id = '6c0RkVllf6V7FPy1EUCclz';
const other = '5zrZHMklhOXABpnBl0EMBN';
const publicHtml = (value = { red: 0, green: 86, blue: 134, alpha: 255 }, uri = `spotify:track:${id}`) => `<script type="application/json" id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { state: { data: { entity: { uri, visualIdentity: { backgroundBase: value }, audioPreview: 'must-not-return' } } } } } })}</script>`;
const fixture = fetcher => {
  const values = new Map();
  const store = { get: async key => values.get(key), put: async (key, value) => values.set(key, value) };
  let time = 1000;
  return { values, store, colors: new SpotifyEmbedColors({ store, fetcher, now: () => time }), advance: ms => { time += ms; } };
};

test('exact Spotify background is parsed without muting, tinting, or evaluating page code', () => {
  assert.equal(colorFromEmbedHtml(publicHtml(), id), '#005686');
  for (const html of ['missing', '<script id="__NEXT_DATA__">bad-json</script>', publicHtml(undefined, `spotify:track:${other}`), publicHtml({ red: -1, green: 0, blue: 0, alpha: 255 }), publicHtml({ red: '0', green: 86, blue: 134, alpha: 255 }), publicHtml({ red: 0, green: 86, blue: 134, alpha: 0 })]) assert.equal(colorFromEmbedHtml(html, id), undefined);
});

test('color requests are fixed, anonymous, selection-only, deduplicated and cached across restart', async () => {
  let requests = 0;
  const fetcher = async (url, init) => {
    requests++;
    assert.equal(url, `https://open.spotify.com/embed/track/${id}`);
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'manual');
    assert.equal(init.referrerPolicy, 'no-referrer');
    assert.deepEqual(Object.keys(init.headers), ['Accept']);
    return new Response(publicHtml(), { headers: { 'Content-Type': 'text/html' } });
  };
  const { colors, store, values } = fixture(fetcher);
  assert.equal((await colors.get(other, [id])).code, 404);
  assert.equal((await colors.get('../evil', [id])).code, 404);
  const results = await Promise.all([colors.get(id, [id]), colors.get(id, [id])]);
  assert.deepEqual(results[0], { code: 200, body: { status: 'ok', color: '#005686' } });
  assert.equal(requests, 1);
  const restarted = new SpotifyEmbedColors({ store, fetcher, now: () => 2000 });
  assert.deepEqual(await restarted.get(id, [id]), results[0]);
  assert.equal(requests, 1);
  assert.ok(!JSON.stringify([...values]).includes('must-not-return'));
});

test('missing color, oversized HTML, redirects and rate limits fail neutral with cooldown', async () => {
  for (const response of [new Response('missing', { headers: { 'Content-Type': 'text/html' } }), new Response('x'.repeat(2_097_153), { headers: { 'Content-Type': 'text/html' } }), new Response(null, { status: 302, headers: { Location: 'https://evil.example' } })]) {
    let requests = 0;
    const { colors } = fixture(async () => { requests++; return response; });
    assert.deepEqual((await colors.get(id, [id])).body, { status: 'unavailable' });
    await colors.get(id, [id]);
    assert.equal(requests, 1);
  }
  let limitedRequests = 0;
  const { colors, advance } = fixture(async () => { limitedRequests++; return new Response(null, { status: 429, headers: { 'Retry-After': '600' } }); });
  assert.equal((await colors.get(id, [id, other])).retryAfter, 600);
  assert.equal((await colors.get(other, [id, other])).retryAfter, 600);
  assert.equal(limitedRequests, 1);
  advance(600_001);
  await colors.get(other, [id, other]);
  assert.equal(limitedRequests, 2);
});

test('frontend never requests color before consent and validates exact hex-only responses', async () => {
  let requests = 0;
  const fetcher = async (url, init) => {
    requests++;
    assert.equal(url, `/__spotify/color/${id}`);
    assert.equal(init.credentials, 'omit');
    return Response.json({ status: 'ok', color: '#005686' });
  };
  const options = { endpoint: 'https://colors-test.workers.dev/v1/recent', spotifyUrl: `https://open.spotify.com/track/${id}`, development: true, fetcher };
  assert.equal(await spotifySurfaceColor({ ...options, consent: false }), undefined);
  assert.equal(requests, 0);
  assert.equal(await spotifySurfaceColor({ ...options, consent: true }), '#005686');
  assert.equal(await spotifySurfaceColor({ ...options, consent: true }), '#005686');
  assert.equal(requests, 1);
  assert.equal(await spotifySurfaceColor({ ...options, consent: true, spotifyUrl: 'https://evil.example/track/test' }), undefined);
  assert.equal(await spotifySurfaceColor({ ...options, endpoint: 'https://bad-color.workers.dev/v1/recent', consent: true, fetcher: async () => Response.json({ status: 'ok', color: 'url(https://evil.example)' }) }), undefined);
  const controller = new AbortController(); controller.abort();
  assert.equal(await spotifySurfaceColor({ ...options, consent: true, signal: controller.signal }), undefined);
});

test('the public service restricts colors to today’s twenty selected tracks and shares its rate limiter', async () => {
  const values = new Map([['daily-selection-v3', { day: '2026-10-23', body: { tracks: [{ spotifyUrl: `https://open.spotify.com/track/${id}` }] } }]]);
  let requests = 0;
  const service = new SpotifyService({
    store: { get: async key => values.get(key), put: async (key, value) => values.set(key, value) },
    now: () => Date.parse('2026-10-23T12:00:00Z'),
    fetcher: async () => { requests++; return new Response(publicHtml(), { headers: { 'Content-Type': 'text/html' } }); },
  });
  assert.equal((await service.color(other, 'visitor')).code, 404);
  assert.deepEqual((await service.color(id, 'visitor')).body, { status: 'ok', color: '#005686' });
  for (let index = 0; index < 28; index++) await service.color(id, 'visitor');
  assert.equal((await service.color(id, 'visitor')).code, 429);
  assert.equal(requests, 1);
  values.set('daily-selection-v3', { day: '2026-10-22', body: { tracks: [{ spotifyUrl: `https://open.spotify.com/track/${id}` }] } });
  assert.equal((await service.color(id, 'different-visitor')).code, 404);
});
