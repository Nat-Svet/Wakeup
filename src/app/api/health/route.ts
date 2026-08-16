import { NextResponse } from "next/server";
import { tryGetEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const env = tryGetEnv();
  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  return NextResponse.json({
    ok: true,
    data: {
      service: "prosyvaisya-api",
      status: databaseOk ? "mvp_ready" : "db_unavailable",
      appEnv: env?.APP_ENV ?? "unconfigured",
      databaseConfigured: Boolean(env?.DATABASE_URL),
      databaseOk,
      authConfigured: Boolean(env?.JWT_SECRET && env.JWT_SECRET.length >= 32),
      version: "v1",
      timestamp: new Date().toISOString(),
    },
  });
}
