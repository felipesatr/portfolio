import { useState } from 'react';
import { IconMusic } from '@tabler/icons-react';
import type { SpotifyTrack } from '~/lib/spotify-transition';

function QueueCover({ track }: { track: SpotifyTrack }) {
  const [failed, setFailed] = useState(false);
  return failed ? <IconMusic size={24} stroke={1.5} aria-hidden="true" /> : <img src={track.artworkUrl} alt="" width={96} height={96} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export function SpotifyQueuePreview({ tracks }: { tracks: readonly SpotifyTrack[] }) {
  if (!tracks.length) return null;
  return <ol className="spotify-widget__queue" aria-label="Next songs in playback queue">
    {tracks.map((track, index) => <li key={track.spotifyUrl}>
      <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Up next ${index + 1}: ${track.title} by ${track.artist}. Open on Spotify in a new tab`}><QueueCover track={track} /></a>
    </li>)}
  </ol>;
}
