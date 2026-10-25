import { useEffect, useRef, useState } from 'react';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import { canSeekSpotify, createSpotifyProgress, type Playback } from '~/lib/spotify-playback-state';

export function PlayPauseIcon({ playing }: { playing: boolean }) {
  return <span className="spotify-widget__play-icon" data-playing={playing} aria-hidden="true">
    <IconPlayerPlayFilled className="spotify-widget__play-glyph" />
    <IconPlayerPauseFilled className="spotify-widget__pause-glyph" />
  </span>;
}

const elapsed = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

export function SpotifyProgress({ state, seek, label, blocked = false }: { state: Playback; seek: (position: number) => void; label: string; blocked?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [clock] = useState(createSpotifyProgress);
  const disabled = !canSeekSpotify(state, blocked);
  useEffect(() => {
    const slider = ref.current;
    if (!slider) return;
    let frame = 0;
    clock.sync(state, performance.now());
    if (disabled && clock.isDragging()) clock.cancel();
    const paint = () => {
      if (!clock.isDragging()) {
        const position = clock.read(performance.now());
        slider.value = String(position);
        slider.style.setProperty('--spotify-progress', `${state.duration ? position / state.duration * 100 : 0}%`);
        slider.setAttribute('aria-valuetext', `${elapsed(position)} of ${elapsed(state.duration)}`);
      }
      if (state.playing && !state.buffering && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const visible = () => { cancelAnimationFrame(frame); paint(); };
    paint();
    document.addEventListener('visibilitychange', visible);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visible); };
  }, [state, clock, disabled]);
  const commit = () => {
    const slider = ref.current;
    if (!slider || disabled) return;
    clock.scrub(Number(slider.value));
    seek(clock.commit(performance.now()));
  };
  return <input ref={ref} className="spotify-widget__progress" type="range" min={0} max={state.duration || 1} step={1} defaultValue={0} disabled={disabled} aria-label={label}
    onPointerDown={event => { if (!disabled) { clock.begin(performance.now()); event.currentTarget.setPointerCapture(event.pointerId); } }}
    onInput={event => {
      if (disabled) return;
      const position = Number(event.currentTarget.value);
      clock.scrub(position);
      event.currentTarget.style.setProperty('--spotify-progress', `${state.duration ? position / state.duration * 100 : 0}%`);
      event.currentTarget.setAttribute('aria-valuetext', `${elapsed(position)} of ${elapsed(state.duration)}`);
      if (!clock.isDragging()) seek(clock.commit(performance.now()));
    }}
    onPointerUp={() => { if (clock.isDragging()) commit(); }} onPointerCancel={event => {
      clock.cancel();
      const position = clock.read(performance.now());
      event.currentTarget.value = String(position);
      event.currentTarget.style.setProperty('--spotify-progress', `${state.duration ? position / state.duration * 100 : 0}%`);
    }} onBlur={() => { if (clock.isDragging()) commit(); }} />;
}
