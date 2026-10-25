const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
export function validateRedirect(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.pathname !== '/callback' || url.search || url.hash || url.username || url.password) throw new Error('Use the registered loopback callback URI');
  return url;
}
export async function createAuthorization(clientId, redirectUri, now = Date.now()) {
  validateRedirect(redirectUri);
  if (!/^[a-zA-Z0-9]{16,128}$/.test(clientId)) throw new Error('Set your public Spotify Client ID');
  const verifier = encode(crypto.getRandomValues(new Uint8Array(48)));
  const state = encode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: 'user-read-recently-played', state, code_challenge_method: 'S256', code_challenge: challenge }).toString();
  return { url: url.href, state, verifier, redirectUri, expires: now + 300_000, used: false };
}
export function acceptCallback(url, session, now = Date.now()) {
  const target = validateRedirect(session.redirectUri);
  const received = new URL(url);
  if (session.used || now >= session.expires || received.origin !== target.origin || received.pathname !== target.pathname) throw new Error('Authorization expired or invalid');
  const supplied = received.searchParams.get('state') || '';
  let difference = supplied.length ^ session.state.length;
  for (let i = 0; i < session.state.length; i++) difference |= session.state.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  if (difference || received.searchParams.getAll('state').length !== 1) throw new Error('Authorization state mismatch');
  session.used = true;
  const code = received.searchParams.get('code');
  if (received.searchParams.has('error') || !code || code.length > 4096 || received.searchParams.getAll('code').length !== 1) throw new Error('Spotify authorization was not completed');
  return code;
}
export async function redeemCode({ code, session, clientId, clientSecret, fetcher = fetch }) {
  const response = await fetcher('https://accounts.spotify.com/api/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: session.redirectUri, code_verifier: session.verifier }),
  });
  if (!response.ok) throw new Error('Spotify authorization failed. Check app settings and retry.');
  const data = await response.json();
  if (typeof data.refresh_token !== 'string' || !data.refresh_token || !data.scope?.split(' ').includes('user-read-recently-played')) throw new Error('Spotify did not grant the required permission');
  return data.refresh_token;
}
