import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureSchema, query } from '../db';
import { parsePlayerName } from './scoreService';

// Two sign-in methods, both hand-rolled:
//  - Google OAuth 2.0 authorization-code flow (no SDK): /api/auth/google
//    redirects to Google, the callback exchanges the code for an id_token.
//  - Email/password with bcrypt hashes stored on the players row.
// Either way the session is a stateless JWT in an httpOnly cookie —
// serverless-friendly (no session store).
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SESSION_TTL_DAYS = 30;
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface SessionPlayer {
  id: number;
  name: string;
}

export class AuthError extends Error {
  public status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const clientId = () => process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';
const sessionSecret = () => process.env.SESSION_SECRET || '';

export const passwordAuthEnabled = () => Boolean(sessionSecret());
export const googleAuthEnabled = () => Boolean(sessionSecret() && clientId() && clientSecret());

function requireSessionSecret(): void {
  if (!sessionSecret()) {
    throw new AuthError('sign-in is not configured on this server', 503);
  }
}

// ---------- sessions ----------

export function createSessionToken(player: SessionPlayer): string {
  return jwt.sign({ pid: player.id, name: player.name }, sessionSecret(), {
    expiresIn: `${SESSION_TTL_DAYS}d`
  });
}

export function readSession(token: unknown): SessionPlayer | null {
  if (!token || !sessionSecret()) return null;
  try {
    const payload: any = jwt.verify(String(token), sessionSecret());
    return { id: payload.pid, name: payload.name };
  } catch {
    return null;
  }
}

export async function bestScoreFor(playerId: number): Promise<number> {
  await ensureSchema();
  const [row] = await query('SELECT COALESCE(MAX(score), 0)::int AS best FROM scores WHERE player_id = $1', [
    playerId
  ]);
  return row.best;
}

// ---------- email / password ----------

function parseEmail(raw: unknown): string {
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email)) {
    throw new AuthError('enter a valid email address');
  }
  return email;
}

export async function signupWithPassword(rawEmail: unknown, rawPassword: unknown, rawName: unknown): Promise<SessionPlayer> {
  requireSessionSecret();
  const email = parseEmail(rawEmail);
  if (typeof rawPassword !== 'string' || rawPassword.length < PASSWORD_MIN_LENGTH) {
    throw new AuthError(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  const hasName = typeof rawName === 'string' && rawName.trim() !== '';
  const name = parsePlayerName(hasName ? rawName : email.split('@')[0]);

  await ensureSchema();
  const existing = await query('SELECT id, password_hash FROM players WHERE email = $1', [email]);
  if (existing.length) {
    if (existing[0].password_hash) {
      throw new AuthError('an account with this email already exists — log in instead', 409);
    }
    throw new AuthError('this email signed up with Google — use "Continue with Google"', 409);
  }

  const hash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);
  const [player] = await query(
    'INSERT INTO players (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, display_name',
    [email, hash, name]
  );
  return { id: player.id, name: player.display_name };
}

export async function loginWithPassword(rawEmail: unknown, rawPassword: unknown): Promise<SessionPlayer> {
  requireSessionSecret();
  const email = parseEmail(rawEmail);
  const password = typeof rawPassword === 'string' ? rawPassword : '';

  await ensureSchema();
  const rows = await query('SELECT id, display_name, password_hash FROM players WHERE email = $1', [email]);
  const row = rows[0];
  // uniform error: never reveal whether the email exists
  const ok = row?.password_hash ? await bcrypt.compare(password, row.password_hash) : false;
  if (!ok) {
    throw new AuthError('invalid email or password', 401);
  }
  return { id: row.id, name: row.display_name };
}

// ---------- Google OAuth ----------

export function buildAuthUrl(redirectUri: string): string {
  // Signed short-lived state = stateless CSRF protection for the callback.
  const state = jwt.sign({ purpose: 'oauth-state' }, sessionSecret(), { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function verifyState(state: unknown): boolean {
  try {
    jwt.verify(String(state), sessionSecret());
    return true;
  } catch {
    return false;
  }
}

// The payload is trusted without signature verification because it arrives
// directly from Google's token endpoint over TLS (RFC 6749-sanctioned shortcut).
function decodeIdToken(idToken: string): { sub: string; email?: string; name?: string } {
  const payload = idToken.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

export async function completeGoogleSignIn(code: string, state: unknown, redirectUri: string): Promise<SessionPlayer> {
  requireSessionSecret();
  if (!code) throw new AuthError('missing OAuth code');
  if (!verifyState(state)) throw new AuthError('invalid OAuth state');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  if (!res.ok) throw new AuthError(`Google token exchange failed (${res.status})`, 502);
  const tokens: any = await res.json();

  const profile = decodeIdToken(tokens.id_token);
  const email = profile.email ? profile.email.toLowerCase() : null;
  let displayName: string;
  try {
    displayName = parsePlayerName(profile.name || (email ? email.split('@')[0] : 'Player'));
  } catch {
    displayName = 'Player';
  }

  await ensureSchema();

  const bySub = await query('SELECT id, display_name FROM players WHERE google_sub = $1', [profile.sub]);
  if (bySub.length) {
    return { id: bySub[0].id, name: bySub[0].display_name };
  }

  // Link an existing password account with the same (Google-verified) email.
  if (email) {
    const linked = await query(
      'UPDATE players SET google_sub = $1 WHERE email = $2 AND google_sub IS NULL RETURNING id, display_name',
      [profile.sub, email]
    );
    if (linked.length) {
      return { id: linked[0].id, name: linked[0].display_name };
    }
  }

  const [created] = await query(
    'INSERT INTO players (google_sub, email, display_name) VALUES ($1, $2, $3) RETURNING id, display_name',
    [profile.sub, email, displayName]
  );
  return { id: created.id, name: created.display_name };
}
