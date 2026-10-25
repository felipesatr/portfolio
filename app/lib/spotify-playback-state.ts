export interface Playback {
  playing: boolean;
  buffering: boolean;
  hasPlayed: boolean;
  position: number;
  duration: number;
  sampledAt: number;
  error: string;
}
export const idlePlayback: Playback = { playing: false, buffering: false, hasPlayed: false, position: 0, duration: 0, sampledAt: 0, error: '' };

export function canSeekSpotify(state: Playback, blocked = false) {
  return !blocked && state.hasPlayed && state.duration > 0 && !state.buffering && !state.error;
}

export function spotifyPositionAt(state: Playback, now: number) {
  return Math.min(state.duration, Math.max(0, state.position + (state.playing && !state.buffering ? Math.max(0, now - state.sampledAt) : 0)));
}

// Presentation clock: sparse iframe samples must not fight the user's pointer
// or quantize a 60Hz thumb into the API's much slower reporting cadence.
export function createSpotifyProgress() {
  let sample = idlePlayback, initialized = false, last = 0, correction = 0, correctedAt = 0;
  let dragging = false, draft = 0;
  let pending: { position: number; at: number } | undefined;
  const read = (now: number) => {
    if (dragging) return draft;
    if (pending) return pending.position;
    const position = spotifyPositionAt(sample, now) + correction * Math.exp(-(now - correctedAt) / Math.max(120, Math.abs(correction) * 2));
    last = Math.min(sample.duration, Math.max(0, sample.playing && !sample.buffering ? Math.max(last, position) : position));
    return last;
  };
  return {
    read,
    sync(next: Playback, now: number) {
      const previous = initialized ? read(now) : spotifyPositionAt(next, now);
      initialized = true;
      sample = next;
      if (dragging) return;
      if (pending) {
        if (Math.abs(next.position - pending.position) > 1200 && now - pending.at < 3000) return;
        const acknowledged = Math.abs(next.position - pending.position) <= 1200;
        pending = undefined;
        correction = acknowledged && next.playing ? previous - spotifyPositionAt(next, now) : 0;
        correctedAt = now; last = acknowledged ? previous : next.position;
        if (acknowledged && !next.playing) sample = { ...next, position: previous, sampledAt: now };
        return;
      }
      const position = spotifyPositionAt(next, now);
      if (!next.playing && Math.abs(position - previous) < 1500) {
        sample = { ...next, position: previous, sampledAt: now };
        correction = 0; last = previous;
      } else {
        correction = next.playing && Math.abs(position - previous) < 1500 ? previous - position : 0;
        correctedAt = now; last = correction ? previous : position;
      }
    },
    begin(now: number) { draft = read(now); dragging = true; },
    scrub(position: number) { draft = Math.max(0, Math.min(sample.duration, position)); },
    commit(now: number) { dragging = false; pending = { position: draft, at: now }; last = draft; correction = 0; return draft; },
    cancel() { dragging = false; pending = undefined; correction = 0; last = 0; },
    isDragging: () => dragging,
  };
}
