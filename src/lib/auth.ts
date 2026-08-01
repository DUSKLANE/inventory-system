// ── Session auth (HMAC-signed cookie token, Web Crypto for Edge+Node) ──

export const AUTH_COOKIE = "auth_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET 环境变量未配置或过短（至少 16 字符）");
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(username: string): Promise<string> {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ u: username, exp: Date.now() + SESSION_DURATION_MS }))
  );
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = await sign(payload);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload) ?? new Uint8Array())
    ) as { u?: string; exp?: number };
    if (!decoded.u || typeof decoded.exp !== "number" || decoded.exp < Date.now()) return null;
    return decoded.u;
  } catch {
    return null;
  }
}

// No default credentials: login is refused unless AUTH_USERNAME/AUTH_PASSWORD are set.
export function getCredentials(): { username: string; password: string } | null {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}
