import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import { claimMusicPlayback, listenForOtherPlayer, loadSpotifyEmbed } from './spotify-embed';
import { createSpotifyCompletionTracker } from './spotify-playback-policy';
import { readSpotifyConsent } from './spotify-consent';
import { createBufferedSpotifyPlayer, createSpotifyLoadGate } from './spotify-transition';

export function useSpotifyEmbed(owner: string, hosts: RefObject<[HTMLDivElement | null, HTMLDivElement | null]>, enabled: boolean, onComplete: () => void) {
  const [deck] = useState(() => createBufferedSpotifyPlayer({
    hasConsent: readSpotifyConsent,
    claim: () => claimMusicPlayback(owner),
    onComplete: () => {},
    createCompletionTracker: createSpotifyCompletionTracker,
    mount: async () => { throw new Error('Spotify host is not connected'); },
  }));
  useEffect(() => {
    deck.connect(async (index, uri, events) => {
      const api = await loadSpotifyEmbed();
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const host = hosts.current[index];
      if (!host || !events.isCurrent()) throw new Error('Spotify disabled');
      const mount = document.createElement('div');
      host.replaceChildren(mount);
      return new Promise((resolve, reject) => {
        api.createController(mount, { uri, width: '100%', height: 152 }, created => {
          if (!events.isCurrent()) { created.destroy(); reject(new Error('Spotify disabled')); return; }
          const iframe = host.querySelector('iframe');
          const loaded = createSpotifyLoadGate(events.ready);
          const documentLoaded = () => loaded.mark('document');
          if (iframe) {
            iframe.title = 'Spotify music player'; iframe.loading = 'eager';
            iframe.addEventListener('load', documentLoaded, { once: true });
          }
          created.addListener('ready', () => loaded.mark('api'));
          created.addListener('playback_update', event => events.update(event.data));
          resolve({
            play: () => created.play(), resume: () => created.resume(), pause: () => created.pause(), restart: () => created.restart(), seek: seconds => created.seek(seconds),
            destroy: () => { iframe?.removeEventListener('load', documentLoaded); created.destroy(); },
          });
        });
      });
    }, onComplete);
  }, [deck, hosts, onComplete]);
  const state = useSyncExternalStore(deck.subscribe, deck.getSnapshot, deck.getSnapshot);
  useEffect(() => { if (!enabled) deck.destroy(); }, [enabled, deck]);
  useEffect(() => {
    const unsubscribe = listenForOtherPlayer(owner, deck.pause);
    return () => { unsubscribe(); deck.destroy(); };
  }, [deck, owner]);
  return { deck, state };
}
