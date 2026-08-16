import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    { status }
  );
}

export function notImplemented(endpoint: string) {
  return fail(
    "NOT_IMPLEMENTED",
    `Endpoint ${endpoint} is scaffolded and will be implemented in MVP phase`,
    501
  );
}

export function fromZod(error: ZodError) {
  return fail("VALIDATION_ERROR", "Invalid request body", 422, error.flatten());
}

export function unauthorized(message = "Unauthorized") {
  return fail("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden") {
  return fail("FORBIDDEN", message, 403);
}
