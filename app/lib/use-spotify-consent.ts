import { useSyncExternalStore } from 'react';
import { readSpotifyConsent, subscribeSpotifyConsent } from './spotify-consent';

export function useSpotifyConsent() {
  return useSyncExternalStore(subscribeSpotifyConsent, readSpotifyConsent, () => false);
}
