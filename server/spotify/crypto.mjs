const encoder = new TextEncoder();
const decoder = new TextDecoder();
function fromBase64(text) { return Uint8Array.from(atob(text), char => char.charCodeAt(0)); }
function toBase64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
async function keyFor(secret) {
  const bytes = fromBase64(secret);
  if (bytes.length !== 32) throw new Error('Invalid token encryption key');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function sealToken(refreshToken, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('portfolio-spotify-v1') }, await keyFor(secret), encoder.encode(refreshToken));
  return JSON.stringify({ version: 1, iv: toBase64(iv), ciphertext: toBase64(encrypted) });
}
export async function openToken(record, secret) {
  const value = JSON.parse(record);
  if (value.version !== 1) throw new Error('Invalid encrypted token');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(value.iv), additionalData: encoder.encode('portfolio-spotify-v1') }, await keyFor(secret), fromBase64(value.ciphertext));
  const token = decoder.decode(plain);
  if (!token || token.length > 8192) throw new Error('Invalid token');
  return token;
}
export async function privateVisitorKey(ip, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64(await crypto.subtle.sign('HMAC', key, encoder.encode(ip)));
}
