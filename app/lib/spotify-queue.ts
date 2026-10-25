/** Preview the same circular order used by Next, excluding the current track. */
export function upcomingSpotifyTracks<T>(tracks: readonly T[], order: readonly number[], position: number, limit = 4): T[] {
  const sequence = order.length ? order : tracks.map((_, index) => index);
  if (sequence.length < 2 || limit < 1) return [];
  const current = ((position % sequence.length) + sequence.length) % sequence.length;
  const seen = new Set([sequence[current]]);
  const upcoming: T[] = [];
  for (let offset = 1; offset < sequence.length && upcoming.length < limit; offset++) {
    const index = sequence[(current + offset) % sequence.length];
    if (!Number.isInteger(index) || index < 0 || index >= tracks.length || seen.has(index)) continue;
    seen.add(index);
    upcoming.push(tracks[index]);
  }
  return upcoming;
}
