import { readSpotifyConsent } from './spotify-consent';

export interface EmbedState {
  playingURI?: string;
  isPaused: boolean;
  isBuffering: boolean;
  duration: number;
  position: number;
}
export interface EmbedController {
  loadEntity: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
  addListener: (event: 'ready' | 'playback_update' | 'playback_started', listener: (event: { data: EmbedState }) => void) => void;
}
interface EmbedApi {
  createController: (element: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: EmbedController) => void) => void;
}
declare global {
  interface Window { onSpotifyIframeApiReady?: (api: EmbedApi) => void }
}
let apiPromise: Promise<EmbedApi> | undefined;
let readyApi: EmbedApi | undefined;

export function resetSpotifyEmbed() {
  // Spotify initializes its API once per document. Keep the resolved API (or
  // an already-authorized in-flight load) reusable across route changes.
  // Destroying the controller prevents future player activity. Removing a
  // script cannot undo JavaScript that already executed or erase its cookies.
  if (readyApi) {
    document.querySelector('script[data-spotify-embed-api]')?.remove();
    document.getElementById('spotify-iframeapi-script')?.remove();
  }
}

// Loaded only after a visitor explicitly activates the Spotify player.
export function loadSpotifyEmbed(): Promise<EmbedApi> {
  if (!readSpotifyConsent()) return Promise.reject(new Error('Spotify consent required'));
  if (readyApi) return Promise.resolve(readyApi);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => fail(), 15_000);
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      // Keep the callback available if Spotify finishes after our timeout;
      // its loader initializes once, so a retry must be able to reuse it.
      apiPromise = undefined;
      reject(new Error('Spotify player unavailable'));
    };
    window.onSpotifyIframeApiReady = api => { clearTimeout(timer); readyApi = api; resolve(api); };
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.dataset.spotifyEmbedApi = '';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return apiPromise;
}

const playbackEvent = 'portfolio-music-play';
export function claimMusicPlayback(owner: string) {
  window.dispatchEvent(new CustomEvent(playbackEvent, { detail: owner }));
}
export function listenForOtherPlayer(owner: string, pause: () => void) {
  const listener = (event: Event) => { if ((event as CustomEvent<string>).detail !== owner) pause(); };
  window.addEventListener(playbackEvent, listener);
  return () => window.removeEventListener(playbackEvent, listener);
}
