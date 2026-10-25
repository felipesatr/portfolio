import type { EmbedState } from './spotify-embed';
import { canSeekSpotify, idlePlayback, spotifyPositionAt, type Playback } from './spotify-playback-state.ts';

export const SPOTIFY_TRACK_FADE_MS = 360;
export interface SpotifyTrack { title: string; artist: string; artworkUrl: string; spotifyUrl: string }
export interface SpotifyVisual<T = SpotifyTrack> { track: T; color?: string; artworkAvailable: boolean }

export function createSpotifyLoadGate(onReady: () => void) {
  const loaded = new Set<'document' | 'api'>();
  let announced = false;
  return { mark(part: 'document' | 'api') { loaded.add(part); if (!announced && loaded.size === 2) { announced = true; onReady(); } } };
}

// One barrier: a fast color response must never outrun the artwork or iframe.
export async function prepareSpotifyVisual<T>(track: T, dependencies: { artwork: Promise<boolean>; color: Promise<string | undefined>; player?: Promise<boolean>; signal?: AbortSignal }): Promise<SpotifyVisual<T>> {
  const { signal } = dependencies;
  signal?.throwIfAborted();
  const [artworkAvailable, color, ready] = await Promise.all([dependencies.artwork, dependencies.color, dependencies.player ?? Promise.resolve(true)]);
  signal?.throwIfAborted();
  if (!ready) throw new Error('Spotify player could not finish loading. Please try again.');
  return { track, color, artworkAvailable };
}

type SlotIndex = 0 | 1;
type Controller = { play(): void; resume(): void; pause(): void; restart(): void; seek(seconds: number): void; destroy(): void };
type CompletionTracker = { reset(): void; update(sample: Playback & { source: string }): boolean };
interface DeckOptions {
  mount: (slot: SlotIndex, uri: string, events: { ready(): void; update(state: EmbedState): void; isCurrent(): boolean }) => Promise<Controller>;
  hasConsent: () => boolean; claim: () => void; onComplete: () => void;
  createCompletionTracker: () => CompletionTracker;
}
interface PlayerSlot {
  uri: string; controller?: Controller; ready: boolean; valid: boolean; authorized: boolean;
  state: Playback; completion: CompletionTracker; pending: Promise<boolean>;
  finish: (ready: boolean) => void; timeout?: ReturnType<typeof setTimeout>; detachAbort: () => void;
  seekRequest?: { position: number; until: number; playing: boolean };
  pausedSeekUntil?: number;
}
const idle = (): Playback => ({ ...idlePlayback });

// Two visual iframe buffers; only the committed one may ever play. Preparation
// never changes the active snapshot, so old metadata/color can stay on screen.
export function createBufferedSpotifyPlayer(options: DeckOptions) {
  let mount = options.mount, onComplete = options.onComplete;
  const slots: [PlayerSlot | undefined, PlayerSlot | undefined] = [undefined, undefined];
  const listeners = new Set<() => void>();
  let snapshot: Playback & { activeSlot: SlotIndex | null; source: string } = { ...idle(), activeSlot: null, source: '' };
  let warning: ReturnType<typeof setTimeout> | undefined;
  const emit = (patch: Partial<typeof snapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const active = () => snapshot.activeSlot === null ? undefined : slots[snapshot.activeSlot];
  const isValid = (index: SlotIndex, slot: PlayerSlot) => slot.valid && slots[index] === slot && options.hasConsent();
  const release = (index: SlotIndex) => {
    const slot = slots[index];
    if (!slot) return;
    slot.valid = false; slot.authorized = false;
    clearTimeout(slot.timeout); slot.detachAbort(); slot.finish(false);
    slot.controller?.pause(); slot.controller?.destroy();
    slots[index] = undefined;
    if (snapshot.activeSlot === index) { clearTimeout(warning); emit({ ...idle(), activeSlot: null, source: '' }); }
  };
  const prepare = async (index: SlotIndex, uri: string, signal?: AbortSignal): Promise<boolean> => {
    if (!options.hasConsent() || signal?.aborted || !/^spotify:track:[a-zA-Z0-9]{22}$/.test(uri)) return false;
    const existing = slots[index];
    if (existing?.uri === uri && existing.valid) return existing.ready ? true : existing.pending;
    release(index);
    let settle!: (ready: boolean) => void;
    const pending = new Promise<boolean>(resolve => { settle = resolve; });
    const slot: PlayerSlot = { uri, ready: false, valid: true, authorized: false, state: idle(), completion: options.createCompletionTracker(), pending, finish: settle, detachAbort: () => {} };
    slots[index] = slot;
    const abort = () => release(index);
    signal?.addEventListener('abort', abort, { once: true });
    slot.detachAbort = () => signal?.removeEventListener('abort', abort);
    slot.timeout = setTimeout(() => { if (slots[index] === slot) release(index); }, 20_000);
    const finishReady = () => {
      if (!isValid(index, slot) || !slot.controller || !slot.ready) return;
      clearTimeout(slot.timeout); slot.detachAbort(); slot.finish(true);
    };
    void mount(index, uri, {
      isCurrent: () => isValid(index, slot),
      ready() { if (isValid(index, slot)) { slot.ready = true; finishReady(); } },
      update(data) {
        if (!isValid(index, slot) || (data.playingURI && data.playingURI !== uri)) return;
        let playing = !data.isPaused;
        if (!slot.authorized || snapshot.activeSlot !== index) {
          if (playing) slot.controller?.pause();
          return;
        }
        if (playing) { clearTimeout(warning); options.claim(); }
        const now = performance.now();
        if (playing && now < (slot.pausedSeekUntil ?? 0)) { slot.controller?.pause(); playing = false; }
        let position = Number.isFinite(data.position) ? Math.max(0, data.position) : 0;
        let seekError = '';
        if (slot.seekRequest) {
          const request = slot.seekRequest;
          if (!request.playing && playing) { slot.controller?.pause(); playing = false; }
          if (Math.abs(position - request.position) <= 1200) slot.seekRequest = undefined;
          else if (now < request.until) { position = request.position; playing = request.playing; }
          else { slot.seekRequest = undefined; seekError = 'Spotify could not seek this preview.'; }
        }
        const next = {
          playing, buffering: Boolean(data.isBuffering),
          hasPlayed: slot.state.hasPlayed || (playing && !data.isBuffering),
          duration: Number.isFinite(data.duration) ? Math.max(0, data.duration) : 0,
          position,
          sampledAt: now, error: seekError,
        };
        slot.state = next;
        emit(next);
        if (!next.buffering && slot.completion.update({ ...next, source: uri })) onComplete();
      },
    }).then(controller => {
      if (!isValid(index, slot)) { controller.pause(); controller.destroy(); return; }
      slot.controller = controller;
      finishReady();
    }).catch(() => { if (slots[index] === slot) release(index); });
    return pending;
  };
  const pause = () => {
    clearTimeout(warning);
    const slot = active();
    if (!slot) return;
    slot.completion.reset(); slot.controller?.pause();
    const now = performance.now();
    if (slot.seekRequest) slot.seekRequest.playing = false;
    slot.state = { ...slot.state, position: spotifyPositionAt(snapshot, now), sampledAt: now, playing: false, buffering: false };
    emit(slot.state);
  };
  const play = () => {
    const slot = active();
    if (!slot?.ready || !slot.authorized || !options.hasConsent()) return;
    slot.pausedSeekUntil = undefined;
    options.claim(); clearTimeout(warning);
    emit({ buffering: true, error: '' });
    if (slot.state.hasPlayed) slot.controller?.resume(); else slot.controller?.play();
    warning = setTimeout(() => {
      if (active() !== slot) return;
      slot.controller?.pause();
      emit({ playing: false, buffering: false, error: 'If playback hasn’t started, press play in the floating Spotify player.' });
    }, 8000);
  };
  return {
    prepare, release, pause, play,
    connect(nextMount: DeckOptions['mount'], nextOnComplete: DeckOptions['onComplete']) { mount = nextMount; onComplete = nextOnComplete; },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate(index: SlotIndex) {
      const next = slots[index];
      if (!next?.ready || !isValid(index, next)) return false;
      const previous = active();
      if (previous && previous !== next) { previous.authorized = false; previous.controller?.pause(); previous.completion.reset(); }
      clearTimeout(warning); next.authorized = true;
      emit({ ...next.state, activeSlot: index, source: next.uri });
      return true;
    },
    toggle() { if (snapshot.playing || snapshot.buffering) pause(); else play(); },
    restart() { const slot = active(); if (slot?.authorized && options.hasConsent()) { slot.completion.reset(); options.claim(); slot.controller?.restart(); } },
    seek(milliseconds: number) {
      const slot = active();
      if (!slot?.authorized || !options.hasConsent() || !canSeekSpotify(snapshot) || !Number.isFinite(milliseconds)) return;
      const position = Math.min(snapshot.duration, Math.max(0, Math.floor(milliseconds / 1000) * 1000));
      const now = performance.now();
      slot.completion.reset();
      slot.seekRequest = { position, until: now + 3000, playing: snapshot.playing };
      slot.pausedSeekUntil = snapshot.playing ? undefined : now + 3000;
      slot.state = { ...snapshot, position, sampledAt: now, error: '' };
      emit(slot.state);
      slot.controller?.seek(position / 1000);
    },
    destroy() { clearTimeout(warning); release(0); release(1); },
  };
}
