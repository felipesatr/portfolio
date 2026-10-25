import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createBufferedSpotifyPlayer, createSpotifyLoadGate, prepareSpotifyVisual } from '../app/lib/spotify-transition.ts';
import { createSpotifyCompletionTracker } from '../app/lib/spotify-playback-policy.ts';
import { prepareSpotifyArtwork } from '../app/lib/spotify-artwork.ts';
import { upcomingSpotifyTracks } from '../app/lib/spotify-queue.ts';
import * as playback from '../app/lib/spotify-playback-state.ts';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const a = 'spotify:track:6c0RkVllf6V7FPy1EUCclz';
const b = 'spotify:track:4dUJ7JsLy4H8PvUa6vzltN';

test('song buffers and seek control have distinct React identities', () => {
  const source = ts.createSourceFile('spotify-widget.tsx', readFileSync(new URL('../app/components/spotify-widget.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys = [];
  const visit = node => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ['TrackContent', 'SpotifyProgress'].includes(node.tagName.getText(source))) {
      const key = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'key');
      assert.ok(key?.initializer && ts.isJsxExpression(key.initializer), 'Track views and progress must have explicit identities');
      // Evaluate the actual JSX key expressions with two different tracks.
      keys.push(new Function('player', 'track', `return (${key.initializer.expression.getText(source)});`)({ outgoing: { track: { spotifyUrl: a } } }, { spotifyUrl: b }));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(keys.length, 3);
  assert.equal(new Set(keys).size, keys.length, 'A song view must never share its React key with the progress bar');
});

test('the player does not render the idle playback-availability caption', () => {
  const source = readFileSync(new URL('../app/components/spotify-widget.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Spotify controls playback availability/);
});

test('player controls never scale their glyphs on hover or press', () => {
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/\.spotify-widget__control(?::(?:hover|active))?\s*\{([^}]+)\}/g)];
  assert.ok(rules.length > 0);
  for (const [, declarations] of rules) {
    assert.doesNotMatch(declarations, /transform:\s*[^;]*scale\(/, 'Cursor proximity must not resize the playback glyph');
  }
});

test('comparison sections share one provider and only the first has inline transport', () => {
  const source = readFileSync(new URL('../app/routes/about.tsx', import.meta.url), 'utf8');
  assert.equal((source.match(/<SpotifyPlayerProvider>/g) || []).length, 1);
  assert.match(source, /\[0, 1, 2\]\.map\(\(copy\)/);
  assert.match(source, /layout=\{copy === 0 \? 'timeline-controls' : copy === 1 \? 'cover' : 'side-controls'\}/);
  for (const heading of ['expertise', 'interests', 'book']) {
    assert.ok(source.includes(`id={\`about-${heading}-heading-\${copy}\`}`), 'Copied headings must have unique IDs');
  }
});

test('full-width metadata and the two-edge fade stay scoped to the first comparison', () => {
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-layout='timeline-controls'\] \.spotify-widget__metadata\s*\{\s*inline-size: 82%;/);
  assert.match(css, /\[data-layout='timeline-controls'\] \[data-overflow='true'\]\s*\{\s*mask-image: linear-gradient\(to right, transparent, #000 8%, #000 88%, transparent\)/);
  assert.match(css, /\[data-layout='timeline-controls'\] \.spotify-widget__progress\s*\{\s*position: static; flex: 1;/);
});

test('all player hover surfaces match the lab shade in native and liquid rendering', () => {
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  const lab = readFileSync(new URL('../app/styles/components.css', import.meta.url), 'utf8');
  const cursor = readFileSync(new URL('../app/components/fluid-cursor.tsx', import.meta.url), 'utf8');
  const shade = lab.match(/\.lab-visual-memory__play:hover\s*\{\s*background: ([^;]+);/)[1];
  assert.equal(css.match(/\.spotify-widget__control:hover\s*\{\s*background: ([^;]+);/)[1], shade);
  assert.equal(shade, '#f2f2f2');
  assert.match(cursor, /matches\('\.spotify-widget__control'\)[\s\S]*?1 - \(13 \/ 255\) \* activeTarget.hoverProgress/);
});

test('the two comparison designs scope fonts and override the global heading size token', () => {
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  for (const layout of ['timeline-controls', 'cover']) {
    const heading = css.match(new RegExp(`\\.about-rebuild \\.spotify-widget\\[data-layout='${layout}'\\] \\.spotify-widget__heading\\s*\\{([^}]+)\\}`))[1];
    assert.match(heading, /--type-h2: clamp\(13px, 4cqw, 18px\)/, 'Global h2 sizing uses !important, so the local size token must change');
    assert.match(heading, /font-family: var\(--font-body\)/);
    assert.match(heading, /inset-block-end: calc\((?:32|36)% \+ 4px\)/);
  }
  assert.match(css, /\[data-layout='cover'\]\) \.spotify-widget__title\s*\{\s*font-family: var\(--font-heading\)/);
  assert.match(css, /\[data-layout='cover'\] \.spotify-widget__artwork\s*\{\s*inset: 0; inline-size: 100%; block-size: 100%/);
  assert.match(css, /\[data-layout='cover'\] \.spotify-widget__artwork::after\s*\{[^}]*linear-gradient\(to bottom/);
});

test('Spotify branding keeps its official geometry as vector cursor ink', () => {
  const brand = readFileSync(new URL('../app/components/spotify-brand.tsx', import.meta.url), 'utf8');
  const asset = readFileSync(new URL('../public/images/spotify-icon-white.svg', import.meta.url), 'utf8');
  assert.equal(brand.match(/<path d="([^"]+)"/)[1], asset.match(/ d="([^"]+)"/)[1]);
  assert.match(brand, /data-fluid-cursor-svg-mask/);
  assert.doesNotMatch(brand, /<img|data-fluid-cursor-image-mask/);
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-layout='cover'\] \.spotify-widget__brand\s*\{[^}]*drop-shadow/);
  assert.match(css, /\[data-layout='side-controls'\] \.spotify-widget__transport\s*\{[^}]*inset-inline-end: 7%;[^}]*gap: 8px/);
});

test('queue previews follow the real shuffled order and wrap without the current track', () => {
  const tracks = ['a', 'b', 'c', 'd', 'e', 'f'];
  const order = [0, 3, 1, 5, 2, 4];
  assert.deepEqual(upcomingSpotifyTracks(tracks, order, 0), ['d', 'b', 'f', 'c']);
  assert.deepEqual(upcomingSpotifyTracks(tracks, order, 4), ['e', 'a', 'd', 'b']);
  assert.deepEqual(order, [0, 3, 1, 5, 2, 4], 'Previewing must not reshuffle playback');
  assert.deepEqual(upcomingSpotifyTracks(tracks, order, 1, 2), ['b', 'f']);
});

test('a short queue never pads its four slots with fake or repeated tracks', () => {
  assert.deepEqual(upcomingSpotifyTracks([], [], 0), []);
  assert.deepEqual(upcomingSpotifyTracks(['a'], [0], 0), []);
  assert.deepEqual(upcomingSpotifyTracks(['a', 'b', 'c'], [], 0), ['b', 'c']);
  assert.deepEqual(upcomingSpotifyTracks(['a', 'b', 'c'], [0, 2, 2, 1], 1), ['b', 'a']);
});

test('only the third copy renders the four-column real-queue preview', () => {
  const source = readFileSync(new URL('../app/components/spotify-widget.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  assert.match(source, /upcoming: upcomingSpotifyTracks\(tracks, order, position.current\)/);
  assert.match(source, /layout === 'side-controls' && <SpotifyQueuePreview tracks=\{player.upcoming\}/);
  assert.match(css, /\.spotify-widget__queue\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

test('only the third layout separates title and artist into independent marquees', () => {
  const source = ts.createSourceFile('spotify-widget.tsx', readFileSync(new URL('../app/components/spotify-widget.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const trackContent = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'TrackContent');
  const labels = [];
  const visit = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'OverflowText') labels.push(node);
    ts.forEachChild(node, visit);
  };
  visit(trackContent);
  assert.equal(labels.length, 3, 'The third layout has two rows, while other layouts keep one combined row');
  const combined = labels.filter(label => label.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'artist'));
  assert.equal(combined.length, 1);
  const artist = combined[0].attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'artist');
  assert.equal(artist?.initializer?.expression?.getText(source), 'track.artist');
  assert.match(trackContent.getText(source), /layout === 'side-controls' \? <>/);
});

test('the third layout omits seeking and aligns its controls to the cover bottom', () => {
  const source = readFileSync(new URL('../app/components/spotify-widget.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  assert.match(source, /layout !== 'side-controls' && <SpotifyProgress/);
  assert.match(css, /\[data-layout='side-controls'\] \.spotify-widget__transport\s*\{[^}]*inset-block-end: calc\(100% - var\(--spotify-queue-cover-bottom\)\)/);
  assert.doesNotMatch(css, /--spotify-side-title-top/);
});

test('only the third song title uses Cal Sans below h6 sizing without restyling its artist', () => {
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-layout='side-controls'\] \.spotify-widget__title:not\(\.spotify-widget__artist\)\s*\{[^}]*font-family: var\(--font-heading\);[^}]*font-size: min\(var\(--spotify-side-title-size\), calc\(var\(--type-h6\) \* \.9\)\);[^}]*font-weight: 400/);
});

test('the standard artist uses exactly the expertise body color', () => {
  const css = readFileSync(new URL('../app/styles/spotify-widget.css', import.meta.url), 'utf8');
  const about = readFileSync(new URL('../app/styles/about.css', import.meta.url), 'utf8');
  const bodyColor = about.match(/\.about-interest-list\s*\{[^}]*?\bcolor:\s*([^;]+);/)[1];
  const artistColor = css.match(/\.spotify-widget \.spotify-widget__artist\s*\{[^}]*?\bcolor:\s*([^;]+);/)[1];
  assert.equal(artistColor, bodyColor);
});

test('custom Spotify metadata and queue covers never add native hover tooltips', () => {
  for (const file of ['spotify-widget.tsx', 'spotify-queue-preview.tsx']) {
    const source = readFileSync(new URL(`../app/components/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\btitle\s*=/, `${file} must not add browser tooltips`);
  }
  const queue = readFileSync(new URL('../app/components/spotify-queue-preview.tsx', import.meta.url), 'utf8');
  assert.match(queue, /aria-label=\{`Up next/);
});

test('mixed-color metadata gives each color its own cursor ink run', () => {
  const source = ts.createSourceFile('spotify-widget.tsx', readFileSync(new URL('../app/components/spotify-widget.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const overflow = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'OverflowText');
  let content;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'content') content = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(overflow);
  assert.ok(ts.isJsxFragment(content));
  const runs = content.children.filter(node => !ts.isJsxText(node) || node.getText(source).trim());
  assert.equal(runs.length, 2);
  assert.ok(runs.every(ts.isJsxElement), 'Direct text on the shared parent would repaint the muted artist in title ink');
});

function fixture() {
  const players = [], commands = [];
  let consent = true, completions = 0;
  const deck = createBufferedSpotifyPlayer({
    hasConsent: () => consent,
    createCompletionTracker: createSpotifyCompletionTracker,
    onComplete: () => completions++,
    claim: () => commands.push('claim'),
    mount: async (slot, uri, events) => {
      const player = { slot, uri, events, playing: false, destroyed: false };
      players.push(player);
      return {
        play() { commands.push(`play:${uri}`); player.playing = true; },
        pause() { commands.push(`pause:${uri}`); player.playing = false; },
        restart() { commands.push(`restart:${uri}`); player.playing = true; },
        resume() { commands.push(`resume:${uri}`); player.playing = true; },
        seek(seconds) { commands.push(`seek:${seconds}`); },
        destroy() { player.destroyed = true; player.playing = false; },
      };
    },
  });
  return { deck, players, commands, deny: () => { consent = false; }, completed: () => completions };
}
const update = (uri, position, isPaused = false) => ({ playingURI: uri, position, duration: 30000, isPaused, isBuffering: false });

test('seeking is locked before actual playback and while loading', () => {
  assert.equal(typeof playback.canSeekSpotify, 'function');
  const state = { ...playback.idlePlayback, duration: 30000 };
  assert.equal(playback.canSeekSpotify(state), false);
  assert.equal(playback.canSeekSpotify({ ...state, hasPlayed: true }), true);
  assert.equal(playback.canSeekSpotify({ ...state, hasPlayed: true, buffering: true }), false);
  assert.equal(playback.canSeekSpotify({ ...state, hasPlayed: true }, true), false);
});

test('the visual clock smooths sparse samples without moving backwards', () => {
  assert.equal(typeof playback.createSpotifyProgress, 'function');
  const clock = playback.createSpotifyProgress();
  const sample = { ...playback.idlePlayback, playing: true, hasPlayed: true, duration: 30000, position: 5000, sampledAt: 1000 };
  clock.sync(sample, 1000);
  assert.equal(clock.read(1500), 5500);
  clock.sync({ ...sample, position: 5400, sampledAt: 1500 }, 1500);
  assert.equal(clock.read(1500), 5500);
  assert.ok(clock.read(1516) >= 5500);
  clock.sync({ ...sample, playing: false, position: 5400, sampledAt: 1600 }, 1600);
  const paused = clock.read(1600);
  assert.equal(clock.read(2500), paused);
  clock.sync({ ...sample, playing: false, position: 5400, sampledAt: 2600 }, 2600);
  assert.equal(clock.read(2600), paused, 'A repeated stale pause sample must not pull the thumb backwards');
});

test('dragging owns the timeline until its seek is acknowledged', () => {
  assert.equal(typeof playback.createSpotifyProgress, 'function');
  const clock = playback.createSpotifyProgress();
  const sample = { ...playback.idlePlayback, playing: true, hasPlayed: true, duration: 30000, position: 5000, sampledAt: 1000 };
  clock.sync(sample, 1000); clock.begin(1000); clock.scrub(18000);
  clock.sync({ ...sample, position: 5500, sampledAt: 1500 }, 1500);
  assert.equal(clock.read(1500), 18000);
  assert.equal(clock.commit(1500), 18000);
  clock.sync({ ...sample, position: 5700, sampledAt: 1700 }, 1700);
  assert.equal(clock.read(1700), 18000);
  clock.sync({ ...sample, position: 18000, sampledAt: 1800 }, 1800);
  assert.equal(clock.read(1800), 18000);
  assert.equal(clock.read(1900), 18100);
});

test('cancelled dragging returns to the current playback clock', () => {
  assert.equal(typeof playback.createSpotifyProgress, 'function');
  const clock = playback.createSpotifyProgress();
  clock.sync({ ...playback.idlePlayback, playing: true, hasPlayed: true, duration: 30000, position: 5000, sampledAt: 1000 }, 1000);
  clock.begin(1000); clock.scrub(20000); clock.cancel();
  assert.equal(clock.read(1500), 5500);
});

test('integer-second seek acknowledgements do not snap the thumb away from the dragged point', () => {
  const clock = playback.createSpotifyProgress();
  const sample = { ...playback.idlePlayback, playing: true, hasPlayed: true, duration: 30000, position: 5000, sampledAt: 1000 };
  clock.sync(sample, 1000); clock.begin(1000); clock.scrub(18900); clock.commit(1200);
  clock.sync({ ...sample, position: 18000, sampledAt: 1250 }, 1250);
  assert.equal(clock.read(1250), 18900);
  assert.ok(clock.read(1266) >= 18900);
});

test('paused seeks stay paused, reject stale samples, and resume instead of restarting', async () => {
  const { deck, players, commands } = fixture();
  const prepared = deck.prepare(0, a); await Promise.resolve(); players[0].events.ready(); await prepared;
  deck.activate(0);
  deck.seek(15000);
  assert.equal(commands.some(command => command.startsWith('seek:')), false);
  deck.play(); players[0].events.update(update(a, 5000)); deck.pause();
  deck.seek(15000);
  assert.equal(deck.getSnapshot().position, 15000);
  assert.equal(deck.getSnapshot().playing, false);
  assert.equal(commands.at(-1), 'seek:15');
  players[0].events.update(update(a, 5000, true));
  assert.equal(deck.getSnapshot().position, 15000);
  players[0].events.update(update(a, 15000, true));
  players[0].events.update(update(a, 15010));
  assert.equal(deck.getSnapshot().playing, false, 'A paused seek must not turn into unexpected autoplay after acknowledgement');
  deck.play(); assert.equal(commands.at(-1), `resume:${a}`);
  deck.destroy();
});

test('official widget waits for both document load and Spotify ready, regardless of order', () => {
  for (const order of [['document', 'api'], ['api', 'document']]) {
    let ready = 0;
    const gate = createSpotifyLoadGate(() => ready++);
    gate.mark(order[0]); assert.equal(ready, 0);
    gate.mark(order[1]); assert.equal(ready, 1);
    gate.mark('api'); gate.mark('document'); assert.equal(ready, 1);
  }
});

test('artwork is anonymous and must decode before the next visual is ready', async () => {
  const OriginalImage = globalThis.Image;
  const images = [], decoding = deferred();
  globalThis.Image = class {
    constructor() { images.push(this); }
    decode() { return decoding.promise; }
    removeAttribute() {}
  };
  try {
    const controller = new AbortController();
    let ready = false;
    const loaded = prepareSpotifyArtwork('https://i.scdn.co/image/transition-decode', controller.signal).then(value => { ready = true; return value; });
    const image = images[0];
    assert.equal(image.crossOrigin, 'anonymous');
    assert.equal(image.referrerPolicy, 'no-referrer');
    image.onload(); await Promise.resolve();
    assert.equal(ready, false);
    decoding.resolve(); assert.equal(await loaded, true);
    assert.equal(await prepareSpotifyArtwork(image.src, controller.signal), true);
    assert.equal(images.length, 1);
    const cancelled = new AbortController();
    const pending = prepareSpotifyArtwork('https://i.scdn.co/image/cancelled', cancelled.signal);
    cancelled.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    const failed = prepareSpotifyArtwork('https://i.scdn.co/image/not-found', controller.signal);
    images[2].onerror(); assert.equal(await failed, false);
  } finally { if (OriginalImage) globalThis.Image = OriginalImage; else delete globalThis.Image; }
});

test('late completion uses current connection callbacks without recreating active audio', async () => {
  const { deck, players } = fixture();
  const first = deck.prepare(0, a); await Promise.resolve(); players[0].events.ready(); await first;
  deck.activate(0); deck.play();
  let advances = 0;
  deck.connect(async () => { throw new Error('Do not remount the current player'); }, () => advances++);
  players[0].events.update(update(a, 29000)); players[0].events.update(update(a, 30000, true));
  assert.equal(advances, 1);
  assert.equal(deck.getSnapshot().source, a);
  assert.equal(players.length, 1);
  deck.destroy();
});

test('fast color waits for decoded artwork and the ready player before becoming presentable', async () => {
  const art = deferred(), player = deferred();
  let resolved = false;
  const prepared = prepareSpotifyVisual({ title: 'Song' }, { artwork: art.promise, color: Promise.resolve('#005686'), player: player.promise }).then(value => { resolved = true; return value; });
  await Promise.resolve();
  assert.equal(resolved, false);
  art.resolve(true); await Promise.resolve();
  assert.equal(resolved, false);
  player.resolve(true);
  assert.deepEqual(await prepared, { track: { title: 'Song' }, color: '#005686', artworkAvailable: true });
});

test('failed standby preparation never exposes a half-loaded next song', async () => {
  await assert.rejects(prepareSpotifyVisual({ title: 'Song' }, { artwork: Promise.resolve(true), color: Promise.resolve('#005686'), player: Promise.resolve(false) }), /player/i);
  const controller = new AbortController();
  const art = deferred();
  const request = prepareSpotifyVisual({}, { artwork: art.promise, color: Promise.resolve('#005686'), signal: controller.signal });
  controller.abort(); art.resolve(true);
  await assert.rejects(request, { name: 'AbortError' });
  assert.deepEqual(await prepareSpotifyVisual({}, { artwork: Promise.resolve(false), color: Promise.resolve(undefined) }), { track: {}, color: undefined, artworkAvailable: false });
});

test('a newly prepared widget is paused and invisible until explicitly committed', async () => {
  const { deck, players, commands } = fixture();
  const first = deck.prepare(0, a);
  assert.equal(deck.activate(0), false);
  await Promise.resolve();
  assert.equal(deck.getSnapshot().activeSlot, null);
  assert.equal(commands.some(command => command.startsWith('play:')), false);
  players[0].events.ready();
  assert.equal(await first, true);
  assert.equal(deck.getSnapshot().activeSlot, null);
  assert.equal(deck.activate(0), true);
  assert.equal(deck.getSnapshot().source, a);
  assert.equal(commands.some(command => command.startsWith('play:')), false);
  deck.play();
  assert.equal(commands.at(-1), `play:${a}`);
  deck.destroy();
});

test('the current widget remains active while standby loads; audio never overlaps on handoff', async () => {
  const { deck, players, commands } = fixture();
  const first = deck.prepare(0, a); await Promise.resolve(); players[0].events.ready(); await first;
  deck.activate(0); deck.play(); players[0].events.update(update(a, 1000));
  const second = deck.prepare(1, b); await Promise.resolve();
  assert.equal(deck.getSnapshot().source, a);
  assert.equal(deck.getSnapshot().playing, true);
  players[1].events.update(update(b, 1)); // Reject any unexpected standby audio.
  assert.equal(players[1].playing, false);
  assert.equal(deck.getSnapshot().source, a);
  players[1].events.ready(); await second;
  assert.equal(deck.getSnapshot().source, a);
  deck.activate(1); deck.play();
  assert.equal(deck.getSnapshot().source, b);
  assert.ok(commands.lastIndexOf(`pause:${a}`) < commands.lastIndexOf(`play:${b}`));
  assert.equal(players.filter(player => player.playing).length, 1);
  deck.release(0); players[0].events.update(update(a, 2000));
  assert.equal(deck.getSnapshot().source, b);
  deck.pause(); assert.equal(players[1].playing, false);
  deck.destroy();
});

test('withdrawal, cancellation and late ready events cannot resurrect a staged player', async () => {
  const { deck, players, deny } = fixture();
  const controller = new AbortController();
  const request = deck.prepare(0, a, controller.signal); await Promise.resolve();
  controller.abort(); players[0].events.ready();
  assert.equal(await request, false);
  assert.equal(deck.activate(0), false);
  assert.equal(players[0].destroyed, true);
  deny();
  assert.equal(await deck.prepare(1, b), false);
  assert.equal(players.length, 1);
  assert.equal(deck.getSnapshot().activeSlot, null);
  deck.destroy();
});

test('only active track completion advances the queue and releases all players on unmount', async () => {
  const { deck, players, completed } = fixture();
  const first = deck.prepare(0, a); await Promise.resolve(); players[0].events.ready(); await first;
  deck.activate(0); deck.play();
  players[0].events.update(update(a, 29000));
  players[0].events.update(update(a, 30000, true));
  players[0].events.update(update(a, 30000, true));
  assert.equal(completed(), 1);
  deck.destroy();
  assert.ok(players.every(player => player.destroyed));
  assert.equal(deck.getSnapshot().activeSlot, null);
});
