import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { tryGetEnv } from "@/lib/env";

export type JwtPayload = {
  sub: string;
  email: string;
};

function getJwtSecretKey() {
  const env = tryGetEnv();
  const secret = env?.JWT_SECRET ?? process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set (min 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function signAccessToken(payload: JwtPayload) {
  const env = tryGetEnv();
  const expiresIn = env?.JWT_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? "7d";

  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  const sub = payload.sub;
  const email = payload.email;
  if (!sub || typeof email !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub, email } satisfies JwtPayload;
}

export function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
