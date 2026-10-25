import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { IconMusic, IconPlayerSkipBackFilled, IconPlayerSkipForwardFilled } from '@tabler/icons-react';
import { SpotlightCard } from './spotlight-card';
import { PlayPauseIcon, SpotifyProgress } from './spotify-playback-controls';
import { SpotifyBrand } from './spotify-brand';
import { SpotifyQueuePreview } from './spotify-queue-preview';
import { upcomingSpotifyTracks } from '~/lib/spotify-queue';
import { useSpotifyEmbed } from '~/lib/use-spotify-embed';
import { resetSpotifyEmbed } from '~/lib/spotify-embed';
import { acceptSpotifyConsent, readSpotifyConsent } from '~/lib/spotify-consent';
import { useSpotifyConsent } from '~/lib/use-spotify-consent';
import { shouldHidePausedSpotify, SPOTIFY_PAUSED_HIDE_MS } from '~/lib/spotify-playback-policy';
import { idlePlayback, type Playback } from '~/lib/spotify-playback-state';
import { publicAsset } from '~/lib/public-asset';
import { spotifySurfaceColor } from '~/lib/spotify-surface-color';
import { prepareSpotifyArtwork } from '~/lib/spotify-artwork';
import { prepareSpotifyVisual, SPOTIFY_TRACK_FADE_MS, type SpotifyTrack, type SpotifyVisual } from '~/lib/spotify-transition';
import '~/styles/spotify-widget.css';

type Track = SpotifyTrack;
type Status = 'loading' | 'ok' | 'preview' | 'empty' | 'not-connected' | 'reauthorize' | 'unavailable';
interface State { status: Status; track?: Track; tracks?: Track[] }
const endpoint = import.meta.env.VITE_SPOTIFY_ENDPOINT?.trim();
// Preview is deliberately impossible in a production build.
const preview = import.meta.env.DEV && !endpoint && import.meta.env.VITE_SPOTIFY_PREVIEW !== 'false';
const previewTrack: Track = { title: 'Novacane', artist: 'Frank Ocean', artworkUrl: publicAsset('images/spotify-novacane-preview.jpg'), spotifyUrl: 'https://open.spotify.com/track/5zrZHMklhOXABpnBl0EMBN' };
let recentCache: { state: State; expires: number } | undefined;
let recentRequest: Promise<State> | undefined;

function validTrack(value: unknown): value is Track {
  if (!value || typeof value !== 'object') return false;
  const track = value as Track;
  if (![track.title, track.artist].every(text => typeof text === 'string' && text.length > 0 && text.length <= 1024)) return false;
  try {
    const link = new URL(track.spotifyUrl);
    const art = new URL(track.artworkUrl);
    return link.origin === 'https://open.spotify.com' && /^\/track\/[a-zA-Z0-9]{22}$/.test(link.pathname) && !link.search && !link.hash && art.protocol === 'https:' && !art.username && !art.password && (art.hostname === 'i.scdn.co' || art.hostname.endsWith('.spotifycdn.com'));
  } catch { return false; }
}

function loadRecent(): Promise<State> {
  if (recentCache && recentCache.expires > Date.now()) return Promise.resolve(recentCache.state);
  if (recentRequest) return recentRequest;
  recentRequest = (async () => {
    let next: State;
    try {
      const url = new URL(endpoint!);
      if (url.protocol !== 'https:' && !(import.meta.env.DEV && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Invalid endpoint');
      const requestUrl = import.meta.env.DEV && /^https:\/\/[^/]+\.workers\.dev\/v1\/recent$/.test(url.href) ? new URL('/__spotify/recent', window.location.origin) : url;
      const response = await fetch(requestUrl, { signal: AbortSignal.timeout(8000), credentials: 'omit', referrerPolicy: 'no-referrer' });
      const payload = await response.json();
      const tracks: Track[] = Array.isArray(payload.tracks) && payload.tracks.length <= 20 ? payload.tracks.filter(validTrack) : validTrack(payload.track) ? [payload.track] : [];
      next = response.ok && payload.status === 'ok' && tracks.length ? { status: 'ok', track: tracks[0], tracks } : { status: ['empty', 'not-connected', 'reauthorize'].includes(payload.status) ? payload.status : 'unavailable' };
    } catch { next = { status: 'unavailable' }; }
    recentCache = { state: next, expires: Date.now() + 60_000 };
    return next;
  })().finally(() => { recentRequest = undefined; });
  return recentRequest;
}

const messages: Record<Exclude<Status, 'ok' | 'preview'>, string> = {
  loading: 'Finding the last track…', empty: 'A quiet moment. Music will be back soon.',
  'not-connected': 'A little music, coming soon.', reauthorize: 'My listening history will be back soon.',
  unavailable: 'Taking a short intermission.',
};

function OverflowText({ text, artist, className }: { text: string; artist?: string; className: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const label = artist ? `${text} - ${artist}` : text;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      const width = element.querySelector<HTMLElement>('.spotify-widget__scroll-copy')?.scrollWidth ?? 0;
      const overflow = Math.max(0, width - element.clientWidth);
      const travel = overflow > 1 ? width + 32 : 0;
      element.dataset.overflow = String(overflow > 1);
      element.style.setProperty('--spotify-scroll-end', `${-travel}px`);
      element.style.setProperty('--spotify-scroll-time', `${Math.max(6, travel / 30)}s`);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(element);
    const copy = element.querySelector('.spotify-widget__scroll-copy');
    if (copy) observer.observe(copy);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [label]);
  const content = <><span>{text}</span><span className="spotify-widget__artist">{artist ? ` - ${artist}` : ''}</span></>;
  return <p ref={ref} className={className} data-fluid-cursor-native-ink><span key={label} className="spotify-widget__scroll-track"><span className="spotify-widget__scroll-copy">{content}</span><span className="spotify-widget__scroll-copy spotify-widget__scroll-duplicate" aria-hidden="true">{content}</span></span></p>;
}

interface PlayerContextValue {
  track?: Track; upcoming: Track[]; count: number; status: Status; consent: boolean; saved: boolean;
  visual?: SpotifyVisual; outgoing?: SpotifyVisual; transitioning: boolean; waiting: boolean; state: Playback; busy: boolean;
  accept: () => void; toggle: () => void;
  finishTransition: () => void;
  changeTrack: (direction: number) => void; seek: (position: number) => void;
}
const PlayerContext = createContext<PlayerContextValue | null>(null);
const subscribeHydration = () => () => {};

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const consent = useSpotifyConsent();
  const id = useId();
  const [data, setData] = useState<State>(() => preview ? { status: 'preview', track: previewTrack } : endpoint ? { status: 'loading' } : { status: 'not-connected' });
  const [order, setOrder] = useState<number[]>([]);
  const position = useRef(0);
  const [visual, setVisual] = useState<SpotifyVisual>();
  const visualRef = useRef<SpotifyVisual | undefined>(undefined);
  const [outgoing, setOutgoing] = useState<SpotifyVisual>();
  const [transitioning, setTransitioning] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [preparedConsent, setPreparedConsent] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const request = useRef<AbortController | undefined>(undefined);
  const locked = useRef(false);
  const resumeAfterTransition = useRef(false);
  const [outgoingSlot, setOutgoingSlot] = useState<0 | 1 | null>(null);
  const [saved, setSaved] = useState(true);
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finishTransition = useRef<() => void>(() => {});
  const hosts = useRef<[HTMLDivElement | null, HTMLDivElement | null]>([null, null]);
  const tracks = data.tracks ?? (data.track ? [data.track] : []);
  const track = visual?.track;
  const embed = useSpotifyEmbed(id, hosts, consent, () => { void changeTrack(1, true); });
  // If Spotify reports a late start, reveal the player rather than ever
  // allowing an asynchronous provider event to leave hidden audio running.
  const visible = consent && embed.state.activeSlot !== null && (shown || embed.state.playing || embed.state.buffering);

  useEffect(() => {
    if (!endpoint) return;
    let active = true;
    // Metadata loads immediately from our backend, independently of consent.
    void loadRecent().then(next => {
      if (!active) return;
      const count = next.tracks?.length ?? (next.track ? 1 : 0);
      const rest = Array.from({ length: Math.max(0, count - 1) }, (_, index) => index + 1);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      setOrder(count ? [0, ...rest] : []);
      setData(next);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!consent) resetSpotifyEmbed();
  }, [consent]);
  useEffect(() => () => { request.current?.abort(); clearTimeout(timer.current); resetSpotifyEmbed(); }, []);
  // Initial content and consent changes use the same readiness barrier. Before
  // consent, metadata/art can still load but color/player resources cannot.
  useEffect(() => {
    const selected = data.tracks?.[order[position.current] ?? 0] ?? data.track;
    request.current?.abort(); clearTimeout(timer.current);
    locked.current = false; resumeAfterTransition.current = false;
    if (!consent) embed.deck.destroy();
    if (!selected) return;
    const controller = new AbortController();
    request.current = controller;
    void prepareSpotifyVisual(selected, {
      artwork: prepareSpotifyArtwork(selected.artworkUrl, controller.signal),
      color: spotifySurfaceColor({ endpoint, spotifyUrl: selected.spotifyUrl, consent, development: import.meta.env.DEV, signal: controller.signal }),
      signal: controller.signal,
    }).then(prepared => {
      if (controller.signal.aborted) return;
      visualRef.current = prepared; setVisual(prepared); setWaiting(false); setError('');
      setOutgoing(undefined); setOutgoingSlot(null); setTransitioning(false); setPreparedConsent(consent);
      if (!consent) setShown(false);
    }).catch(() => { if (!controller.signal.aborted) { setWaiting(false); setError('This track could not finish loading. Please try again.'); } });
    return () => { controller.abort(); };
  }, [data, order, consent, embed.deck]);
  useEffect(() => {
    if (!shouldHidePausedSpotify({ visible, playing: embed.state.playing, buffering: embed.state.buffering, pending: waiting || transitioning })) return;
    const timeout = setTimeout(() => setShown(false), SPOTIFY_PAUSED_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [visible, embed.state.playing, embed.state.buffering, waiting, transitioning]);

  async function stage(nextPosition: number, withPlayer: boolean, continuePlaying: boolean): Promise<void> {
    const selected = tracks[order[nextPosition] ?? 0];
    if (!selected || !consent || locked.current) return;
    locked.current = true;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    resumeAfterTransition.current = continuePlaying;
    setWaiting(true); setError('');
    const oldSlot = embed.deck.getSnapshot().activeSlot;
    const nextSlot = oldSlot === 0 ? 1 : 0;
    const uri = `spotify:track:${selected.spotifyUrl.split('/').pop()}`;
    try {
      const prepared = await prepareSpotifyVisual(selected, {
        artwork: prepareSpotifyArtwork(selected.artworkUrl, controller.signal),
        color: spotifySurfaceColor({ endpoint, spotifyUrl: selected.spotifyUrl, consent: true, development: import.meta.env.DEV, signal: controller.signal }),
        player: withPlayer ? embed.deck.prepare(nextSlot, uri, controller.signal) : undefined,
        signal: controller.signal,
      });
      if (controller.signal.aborted || !readSpotifyConsent()) return;
      if (withPlayer && !embed.deck.activate(nextSlot)) throw new Error('Spotify player could not finish loading. Please try again.');
      const previous = visualRef.current;
      const changed = previous?.track.spotifyUrl !== selected.spotifyUrl;
      position.current = nextPosition;
      setOutgoing(changed ? previous : undefined);
      setOutgoingSlot(withPlayer ? oldSlot : null);
      visualRef.current = prepared; setVisual(prepared);
      setWaiting(false); setTransitioning(true);
      if (withPlayer) setShown(visible || continuePlaying);
      // Both DOM buffers and the color interpolation begin in this commit.
      // Start audio only after the incoming official widget is fully visible.
      let finished = false;
      const finish = () => {
        if (finished || controller.signal.aborted || !readSpotifyConsent()) return;
        finished = true; clearTimeout(timer.current);
        if (withPlayer && oldSlot !== null) embed.deck.release(oldSlot);
        setOutgoing(undefined); setOutgoingSlot(null); setTransitioning(false);
        locked.current = false;
        if (withPlayer && resumeAfterTransition.current) embed.deck.play();
      };
      finishTransition.current = finish;
      // Animation/transition-end is authoritative. The timer is only a guard
      // for background tabs or a browser that omits its completion event.
      timer.current = setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SPOTIFY_TRACK_FADE_MS + 120);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (withPlayer) embed.deck.release(nextSlot);
      setError(failure instanceof Error ? failure.message : 'This track could not finish loading. Please try again.');
      setWaiting(false); locked.current = false;
    }
  }
  async function changeTrack(direction: number, continuePlaying = embed.deck.getSnapshot().playing): Promise<void> {
    if (!consent || !tracks.length || locked.current) return;
    if (tracks.length === 1 && continuePlaying) { embed.deck.restart(); return; }
    await stage((position.current + direction + tracks.length) % tracks.length, embed.deck.getSnapshot().activeSlot !== null, continuePlaying);
  }
  const value: PlayerContextValue = {
    track, upcoming: upcomingSpotifyTracks(tracks, order, position.current), visual, outgoing, transitioning, waiting, count: tracks.length, status: !track && data.status === 'ok' ? 'loading' : data.status, consent, saved,
    state: consent ? { ...embed.state, error: error || embed.state.error } : idlePlayback,
    busy: data.status === 'preview' || waiting || transitioning || preparedConsent !== consent,
    accept: () => { setSaved(acceptSpotifyConsent()); setShown(false); },
    finishTransition: () => finishTransition.current(),
    toggle: () => {
      if (!consent) return;
      if (embed.state.playing) { resumeAfterTransition.current = false; embed.deck.pause(); return; }
      if (locked.current || waiting) return;
      if (visible) embed.deck.toggle();
      else if (embed.state.activeSlot !== null) {
        setShown(true);
        timer.current = setTimeout(() => { if (readSpotifyConsent()) embed.deck.play(); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SPOTIFY_TRACK_FADE_MS);
      } else void stage(position.current, true, true);
    },
    changeTrack: direction => { void changeTrack(direction); }, seek: position => { if (consent && !waiting && !transitioning) embed.deck.seek(position); },
  };
  return <PlayerContext.Provider value={value}>{children}
    {hydrated && createPortal(<aside className="spotify-floating" data-visible={visible} aria-label="Spotify music player" aria-hidden={!visible} inert={!visible} data-no-reveal style={{ '--spotify-track-duration': `${SPOTIFY_TRACK_FADE_MS}ms` } as CSSProperties} onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'opacity' && visible && transitioning && outgoingSlot === null) finishTransition.current(); }}>
      {([0, 1] as const).map(slot => {
        const current = embed.state.activeSlot === slot;
        const phase = current ? transitioning && outgoingSlot !== null ? 'incoming' : 'active' : outgoingSlot === slot ? 'outgoing' : 'staged';
        return <div key={slot} ref={element => { hosts.current[slot] = element; }} className="spotify-floating__host" data-phase={phase} aria-hidden={!current} inert={!current} onAnimationEnd={event => { if (event.target === event.currentTarget && phase === 'incoming') finishTransition.current(); }} />;
      })}
      {embed.state.error && <p role="status" className="spotify-floating__error">{embed.state.error}</p>}
    </aside>, document.body)}
  </PlayerContext.Provider>;
}

function TrackContent({ visual, phase, status, layout, onEntered }: { visual: SpotifyVisual; phase: 'active' | 'incoming' | 'outgoing'; status: Status; layout: SpotifyWidgetLayout; onEntered?: () => void }) {
  const { track, artworkAvailable } = visual;
  const retired = phase === 'outgoing';
  return <div className="spotify-widget__track" data-phase={phase} aria-hidden={retired} inert={retired} data-fluid-cursor-no-ink={retired || undefined} data-fluid-cursor-mask-boundary onAnimationEnd={event => { if (event.target === event.currentTarget && phase === 'incoming') onEntered?.(); }}>
    <a className="spotify-widget__artwork" href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${track.title} by ${track.artist} on Spotify (new tab)`}>
      {artworkAvailable ? <img src={track.artworkUrl} alt={`${track.title} cover artwork`} width={300} height={300} crossOrigin="anonymous" referrerPolicy="no-referrer" decoding="async" /> : <IconMusic size={64} stroke={1.5} aria-label="Artwork unavailable" />}
    </a>
    <a className="spotify-widget__metadata" href={track.spotifyUrl} target="_blank" rel="noopener noreferrer">
      {status === 'preview' && <span className="visually-hidden">Design preview · sample track, not live listening history</span>}
      {layout === 'side-controls' ? <>
        <OverflowText text={track.title} className="spotify-widget__title" />
        <OverflowText text={track.artist} className="spotify-widget__title spotify-widget__artist" />
      </> : <OverflowText text={track.title} artist={track.artist} className="spotify-widget__title" />}
      <span className="visually-hidden">Open on Spotify in a new tab</span>
    </a>
  </div>;
}

type SpotifyWidgetLayout = 'standard' | 'timeline-controls' | 'cover' | 'side-controls';

export function SpotifyWidget({ layout = 'standard' }: { layout?: SpotifyWidgetLayout }) {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('SpotifyWidget requires SpotifyPlayerProvider');
  return <MusicCard player={player} layout={layout} />;
}

function MusicCard({ player, layout }: { player: PlayerContextValue; layout: SpotifyWidgetLayout }) {
  const id = useId();
  const card = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const { track, consent, state } = player;
  const expanded = !consent && open;
  const playbackNote = !consent ? 'Playback locked · enable Spotify to listen' : !player.saved ? 'Enabled for this tab only · browser storage unavailable' : state.error || (player.waiting ? 'Preparing the next view…' : state.buffering ? 'Loading audio…' : '');
  useEffect(() => {
    const column = card.current;
    const row = column?.closest<HTMLElement>('.about-personal-row');
    if (!column || !row) return;
    const observer = new ResizeObserver(() => row.style.setProperty('--spotify-card-height', `${column.clientWidth}px`));
    observer.observe(column);
    return () => { observer.disconnect(); row.style.removeProperty('--spotify-card-height'); };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (card.current?.contains(event.target as Node)) return;
      setOpen(false); setHovering(false); setFocused(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  const guard = (action: () => void) => { if (!consent) setOpen(true); else action(); };
  return <div className="about-media--music spotify-widget-column" ref={card} data-consent={consent} data-consent-open={expanded}
    onPointerEnter={event => { if (event.pointerType !== 'touch') { setHovering(true); if (!consent) setOpen(true); } }}
    onPointerLeave={() => { setHovering(false); if (!focused) setOpen(false); }}
    onFocusCapture={() => { setFocused(true); if (!consent) setOpen(true); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setFocused(false); if (!hovering) setOpen(false); } }}>
    <SpotlightCard className="career-spotlight-card about-card spotify-widget" aria-labelledby={`${id}-heading`} data-layout={layout} data-consent={consent} data-track-waiting={player.waiting} data-track-transitioning={player.transitioning} style={{ '--spotify-surface': consent ? player.visual?.color : undefined, '--spotify-track-duration': `${SPOTIFY_TRACK_FADE_MS}ms` } as CSSProperties}>
      <div className="spotify-widget__layout" data-consent-blurred={expanded} data-fluid-cursor-mask-boundary>
        <h2 id={`${id}-heading`} className="spotify-widget__heading" data-fluid-cursor-negative-mask>Recently played</h2>
        <a href={track?.spotifyUrl ?? 'https://open.spotify.com/'} target="_blank" rel="noopener noreferrer" aria-label="Listen on Spotify"><SpotifyBrand /></a>
        {track ? <>
          {player.outgoing && <TrackContent key={`track:${player.outgoing.track.spotifyUrl}`} visual={player.outgoing} phase="outgoing" status={player.status} layout={layout} />}
          {player.visual && <TrackContent key={`track:${track.spotifyUrl}`} visual={player.visual} phase={player.transitioning && player.outgoing ? 'incoming' : 'active'} status={player.status} layout={layout} onEntered={player.finishTransition} />}
          <div className="spotify-widget__transport">
          <div className="spotify-widget__controls" role="group" aria-label="Browse my daily music selection" aria-busy={player.waiting || player.transitioning}>
            <button type="button" className="spotify-widget__control" aria-disabled={!consent || player.count < 2 || player.busy} onClick={() => guard(() => { if (!player.busy && player.count > 1) player.changeTrack(-1); })} aria-label="Previous song in my selection" data-fluid-cursor-surface="#ffffff"><IconPlayerSkipBackFilled aria-hidden="true" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask /></button>
            <button type="button" className="spotify-widget__control spotify-widget__play" aria-disabled={!consent || (player.busy && !state.playing)} aria-describedby={!consent ? `${id}-consent-title` : undefined} onClick={() => guard(() => { if (!player.busy || state.playing) player.toggle(); })} aria-label={`${state.playing ? 'Pause' : 'Play'} ${track.title}`} aria-pressed={state.playing} data-fluid-cursor-surface="#ffffff"><PlayPauseIcon playing={state.playing} /></button>
            <button type="button" className="spotify-widget__control" aria-disabled={!consent || player.count < 2 || player.busy} onClick={() => guard(() => { if (!player.busy && player.count > 1) player.changeTrack(1); })} aria-label="Next shuffled song in my selection" data-fluid-cursor-surface="#ffffff"><IconPlayerSkipForwardFilled aria-hidden="true" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask /></button>
          </div>
          {layout !== 'side-controls' && <SpotifyProgress key={`progress:${track.spotifyUrl}`} state={state} seek={player.seek} label="Seek within Spotify playback" blocked={!consent || player.busy} />}
          </div>
          {layout === 'side-controls' && <SpotifyQueuePreview tracks={player.upcoming} />}
          {playbackNote && <p className="spotify-widget__playback-note" role="status" data-fluid-cursor-negative-mask>{playbackNote}</p>}
        </> : <div className="spotify-widget__empty" role="status"><IconMusic size={64} stroke={1.5} aria-hidden="true" /><p>Listening lately</p><span>{messages[player.status as Exclude<Status, 'ok' | 'preview'>]}</span></div>}
      </div>
      <div className="spotify-consent-layer" aria-hidden={!expanded} inert={!expanded} data-open={expanded} data-no-reveal>
      <section className="spotify-consent" aria-labelledby={`${id}-consent-title`} data-fluid-cursor-no-ink>
        <h3 id={`${id}-consent-title`}>Enable Spotify playback?</h3>
        <p>Spotify’s player may use cookies and similar technologies for playback, analytics, and advertising. Enabling it loads Spotify’s player in your browser. You can withdraw your choice on this site’s Privacy Policy page.</p>
        <p className="spotify-consent__links"><a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">Spotify privacy</a><Link to="/privacy#spotify">Site privacy policy</Link></p>
        <button type="button" className="button button--secondary" data-fluid-cursor-button onClick={() => { player.accept(); setOpen(false); }}><span className="liquid-button__surface">Accept &amp; enable Spotify</span></button>
      </section>
      </div>
    </SpotlightCard>
  </div>;
}
