const decoded = new Set<string>();

// Decode before committing the new song. The mounted artwork then comes from
// the browser cache instead of independently fading in after its metadata.
export function prepareSpotifyArtwork(url: string, signal: AbortSignal): Promise<boolean> {
  signal.throwIfAborted();
  if (decoded.has(url)) return Promise.resolve(true);
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const cleanup = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); image.onload = null; image.onerror = null; };
    const finish = (available: boolean) => {
      if (settled) return;
      settled = true; cleanup();
      if (available) { if (decoded.size >= 20) decoded.delete(decoded.values().next().value!); decoded.add(url); }
      resolve(available);
    };
    const abort = () => { if (!settled) { settled = true; cleanup(); image.removeAttribute('src'); reject(new DOMException('Aborted', 'AbortError')); } };
    const timeout = setTimeout(() => finish(false), 8000);
    signal.addEventListener('abort', abort, { once: true });
    image.crossOrigin = 'anonymous'; image.referrerPolicy = 'no-referrer'; image.decoding = 'async';
    image.onload = () => { void image.decode().then(() => finish(true), () => finish(false)); };
    image.onerror = () => finish(false);
    image.src = url;
  });
}
