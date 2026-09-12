import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response } from "express";

const SESSION_COOKIE = "examio_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

type AdminSession = {
  username: string;
  csrfToken: string;
  expiresAt: number;
};

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const sessions = new Map<string, AdminSession>();
const loginAttempts = new Map<string, LoginAttempt>();

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set before admin authentication can start.");
  }
  return secret;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expectedPassword(username: string): string | undefined {
  if (username === "Elton_CEO00") return process.env.ADMIN_ELTON_PASSWORD;
  if (username === "Emanuel_CEO00") return process.env.ADMIN_EMANUEL_PASSWORD;
  return undefined;
}

function passwordsMatch(username: string, password: string): boolean {
  const expected = expectedPassword(username);
  if (!expected) return false;
  const salt = sessionSecret();
  const actualHash = scryptSync(password, salt, 32);
  const expectedHash = scryptSync(expected, salt, 32);
  return timingSafeEqual(actualHash, expectedHash);
}

function clientKey(req: Request, username: string): string {
  return `${req.ip}:${username}`;
}

function pruneState(now: number): void {
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
  for (const [key, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(key);
  }
}

export function authenticateAdmin(
  req: Request,
  username: string,
  password: string,
): { ok: true; session: AdminSession; token: string } | { ok: false; status: 401 | 429 } {
  const now = Date.now();
  pruneState(now);
  const key = clientKey(req, username);
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS && attempt.resetAt > now) {
    return { ok: false, status: 429 };
  }

  if (!passwordsMatch(username, password)) {
    const next = attempt && attempt.resetAt > now
      ? { count: attempt.count + 1, resetAt: attempt.resetAt }
      : { count: 1, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, next);
    return { ok: false, status: 401 };
  }

  loginAttempts.delete(key);
  const token = randomBytes(32).toString("hex");
  const session: AdminSession = {
    username,
    csrfToken: randomBytes(24).toString("hex"),
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(hashToken(token), session);
  return { ok: true, session, token };
}

export function getAdminSession(req: Request): AdminSession | undefined {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return undefined;
  const key = hashToken(token);
  const session = sessions.get(key);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(key);
    return undefined;
  }
  return session;
}

export function requireAdmin(req: Request, res: Response): AdminSession | undefined {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Admin authentication required" });
    return undefined;
  }
  return session;
}

export function requireAdminCsrf(req: Request, res: Response): AdminSession | undefined {
  const session = requireAdmin(req, res);
  if (!session) return undefined;
  const supplied = req.get("x-csrf-token") ?? "";
  const expected = Buffer.from(session.csrfToken);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return undefined;
  }
  return session;
}

export function setAdminCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "strict", path: "/" });
}

export function destroyAdminSession(req: Request): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) sessions.delete(hashToken(token));
}

export function adminSessionResponse(session?: AdminSession) {
  return {
    authenticated: Boolean(session),
    username: session?.username ?? null,
    csrfToken: session?.csrfToken ?? null,
  };
}