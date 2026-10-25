type PlaybackSample = { playing: boolean; position: number; duration: number };
// Spotify has no documented ended event. Only advance on observed terminal
// progress, never on a timer, an ordinary pause, or a guessed preview length.
export function completedSpotifyPlayback(previous: PlaybackSample, next: PlaybackSample) {
  return previous.playing && next.duration > 1000 && previous.duration === next.duration &&
    previous.position >= next.duration - 2000 && next.position >= next.duration;
}

export function createSpotifyCompletionTracker() {
  let source = '';
  let lastPlaying: PlaybackSample | undefined;
  let completed = false;
  return {
    reset() { source = ''; lastPlaying = undefined; completed = false; },
    update(sample: PlaybackSample & { source: string }) {
      if (sample.source !== source) { source = sample.source; lastPlaying = undefined; completed = false; }
      const finished = !completed && Boolean(lastPlaying && completedSpotifyPlayback(lastPlaying, sample));
      // Some players send a paused sample before their final progress sample.
      // Keep the last playing sample until reset, rather than losing it there.
      if (sample.playing) lastPlaying = sample;
      if (finished) completed = true;
      return finished;
    },
  };
}

export const SPOTIFY_PAUSED_HIDE_MS = 5_000;
export function shouldHidePausedSpotify(input: { visible: boolean; playing: boolean; buffering: boolean; pending: boolean }) {
  return input.visible && !input.playing && !input.buffering && !input.pending;
}
