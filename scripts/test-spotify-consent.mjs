import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validSpotifyConsent, acceptSpotifyConsent, readSpotifyConsent, withdrawSpotifyConsent, subscribeSpotifyConsent, SPOTIFY_CONSENT_KEY, SPOTIFY_DISCLOSURE_VERSION } from '../app/lib/spotify-consent.ts';
import { completedSpotifyPlayback, createSpotifyCompletionTracker, shouldHidePausedSpotify, SPOTIFY_PAUSED_HIDE_MS } from '../app/lib/spotify-playback-policy.ts';

const record = (extra = {}) => JSON.stringify({ accepted: true, version: SPOTIFY_DISCLOSURE_VERSION, acceptedAt: 1000, expiresAt: 2000, ...extra });
test('consent fails closed for missing, malformed, expired, future, and old-version records', () => {
  for (const raw of [null, '', '{', '{}', record({ accepted: false }), record({ version: 0 }), record({ acceptedAt: 1700 }), record({ expiresAt: 1500 })]) assert.equal(validSpotifyConsent(raw, 1500), false);
  assert.equal(validSpotifyConsent(record(), 1500), true);
});
test('acceptance persists only an explicit versioned preference; withdrawal and cross-tab events synchronize', () => {
  const target = new EventTarget();
  const storage = new Map();
  globalThis.window = Object.assign(target, { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, setInterval });
  try {
    assert.equal(readSpotifyConsent(), false);
    let changes = 0;
    const unsubscribe = subscribeSpotifyConsent(() => changes++);
    assert.equal(acceptSpotifyConsent(), true);
    assert.equal(readSpotifyConsent(), true);
    const saved = JSON.parse(storage.get(SPOTIFY_CONSENT_KEY));
    assert.deepEqual(Object.keys(saved).sort(), ['accepted', 'acceptedAt', 'expiresAt', 'version']);
    assert.ok(saved.expiresAt > saved.acceptedAt);
    withdrawSpotifyConsent();
    assert.equal(readSpotifyConsent(), false);
    assert.equal(storage.size, 0);
    storage.set(SPOTIFY_CONSENT_KEY, JSON.stringify(saved));
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: SPOTIFY_CONSENT_KEY });
    target.dispatchEvent(event);
    assert.equal(readSpotifyConsent(), true);
    assert.equal(changes, 3);
    unsubscribe();
    withdrawSpotifyConsent();
  } finally { delete globalThis.window; }
});
test('blocked browser storage uses tab memory and withdrawal still blocks', () => {
  globalThis.window = Object.assign(new EventTarget(), { localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } } });
  try {
    assert.equal(acceptSpotifyConsent(), false);
    assert.equal(readSpotifyConsent(), true);
    withdrawSpotifyConsent();
    assert.equal(readSpotifyConsent(), false);
  } finally { delete globalThis.window; }
});
test('completion requires observed playback at the actual end, not an ordinary pause', () => {
  const previous = { playing: true, duration: 30_000, position: 29_000 };
  assert.equal(completedSpotifyPlayback(previous, { playing: false, duration: 30_000, position: 30_000 }), true);
  assert.equal(completedSpotifyPlayback({ ...previous, position: 12_000 }, { playing: false, duration: 30_000, position: 12_000 }), false);
  assert.equal(completedSpotifyPlayback({ ...previous, playing: false }, { playing: false, duration: 30_000, position: 30_000 }), false);
  assert.equal(completedSpotifyPlayback(previous, { playing: false, duration: 0, position: 0 }), false);
});
test('paused widget can hide while its original card is still visible or hovered', () => {
  assert.equal(SPOTIFY_PAUSED_HIDE_MS, 5000);
  const base = { visible: true, cardInView: true, playing: false, buffering: false, pending: false, interacting: true };
  assert.equal(shouldHidePausedSpotify(base), true);
  for (const override of [{ visible: false }, { playing: true }, { buffering: true }, { pending: true }]) assert.equal(shouldHidePausedSpotify({ ...base, ...override }), false);
});

test('completion handles terminal playing events, split pause updates, and one-track loops exactly once', () => {
  const observe = createSpotifyCompletionTracker();
  const sample = (position, playing = true, source = 'track-a') => ({ source, duration: 30_000, position, playing });
  assert.equal(observe.update(sample(29_000)), false);
  assert.equal(observe.update(sample(30_000)), true);
  assert.equal(observe.update(sample(30_000, false)), false);
  assert.equal(observe.update(sample(30_000, false)), false);
  observe.reset();
  assert.equal(observe.update(sample(29_000)), false);
  assert.equal(observe.update(sample(29_500, false)), false);
  assert.equal(observe.update(sample(30_000, false)), true);
  assert.equal(observe.update(sample(30_000, false, 'track-b')), false);
  observe.reset();
  assert.equal(observe.update(sample(30_000, false)), false);
  assert.equal(completedSpotifyPlayback(sample(29_000), sample(29_800, false)), false);
});
