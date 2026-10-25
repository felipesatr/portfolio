import { createServer } from 'node:http';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createAuthorization, acceptCallback, redeemCode, validateRedirect } from '../server/spotify/oauth.mjs';
import { sealToken } from '../server/spotify/crypto.mjs';

function restrictWindowsPath(path, directory = false) {
  if (process.platform !== 'win32') return;
  const identity = execFileSync('whoami', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
  const sid = identity.match(/S-1-[0-9-]+/)?.[0];
  if (!sid) throw new Error('Could not identify the Windows account');
  // Native argument arrays, no shell interpolation. Touch only dedicated private paths.
  execFileSync('icacls', [path, '/inheritance:r', '/grant:r', `*${sid}:${directory ? '(OI)(CI)' : ''}F`], { stdio: 'ignore', windowsHide: true });
}

async function connect() {
  try { process.loadEnvFile('.env.spotify.local'); } catch { throw new Error('Create .env.spotify.local from .env.spotify.example first. Enter secrets there, never in chat.'); }
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8788/callback';
  if (!clientSecret || clientSecret.includes('ENTER_DIRECTLY')) throw new Error('Enter the Client Secret in .env.spotify.local before connecting.');
  const redirect = validateRedirect(redirectUri);
  const directory = resolve('.spotify-private');
  const secretFile = resolve(directory, 'cloudflare-secrets.json');
  let exists = false;
  try { await access(secretFile); exists = true; } catch { /* New setup. */ }
  if (exists) throw new Error('The protected secret file already exists. Follow the reconnect instructions before replacing it.');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  restrictWindowsPath(directory, true);
  restrictWindowsPath(resolve('.env.spotify.local'));
  const session = await createAuthorization(clientId, redirectUri);
  const server = createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (request.method === 'GET' && request.headers.host === redirect.host && request.url === '/complete' && session.used && completed) {
      response.end('Spotify connected locally. You can close this tab. Continue with the protected Cloudflare secret import in docs/spotify-widget-setup.md.');
      clearTimeout(expiration);
      server.close();
      return;
    }
    if (request.method !== 'GET' || request.headers.host !== redirect.host || new URL(request.url, redirect.origin).pathname !== '/callback') { response.writeHead(404).end('Not found.'); return; }
    try {
      const code = acceptCallback(new URL(request.url, redirect.origin), session);
      const refresh = await redeemCode({ code, session, clientId, clientSecret });
      const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
      const seed = await sealToken(refresh, key);
      await writeFile(secretFile, JSON.stringify({ SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, SPOTIFY_TOKEN_KEY: key, SPOTIFY_TOKEN_SEED: seed }), { mode: 0o600, flag: 'wx' });
      completed = true;
      response.writeHead(303, { Location: '/complete' }).end();
      console.log('Authorization succeeded. Protected setup material saved to .spotify-private/cloudflare-secrets.json. No credentials were printed.');
    } catch {
      response.writeHead(400).end('Connection was not completed. Check the setup instructions and restart the local connection tool.');
      if (session.used) { clearTimeout(expiration); server.close(); process.exitCode = 1; }
    }
  });
  let completed = false;
  server.on('error', () => { console.error('Cannot start the local Spotify callback. Check that the configured port is available.'); process.exitCode = 1; clearTimeout(expiration); });
  const expiration = setTimeout(() => { console.error('The five-minute authorization window expired. Run the connection tool again.'); server.close(); process.exitCode = 1; }, 300_000);
  server.listen(Number(redirect.port), '127.0.0.1', () => {
    console.log('Open the following Spotify authorization URL in your own browser within five minutes. Sign in only on accounts.spotify.com.');
    console.log(session.url); // Public Client ID + single-use state/PKCE challenge; no secrets or tokens.
  });
}
connect().catch(() => { console.error('Spotify setup could not start. Check .env.spotify.local against .env.spotify.example; credentials are never printed.'); process.exitCode = 1; });
