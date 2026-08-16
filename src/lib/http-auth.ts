import { prisma } from "@/lib/prisma";
import {
  getBearerToken,
  verifyAccessToken,
} from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/api-response";

export async function requireUser(request: Request) {
  const headerToken = getBearerToken(request.headers.get("authorization"));
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const token = headerToken || queryToken;

  if (!token) {
    return { error: unauthorized("Missing Bearer token"), user: null };
  }

  try {
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { subscription: true },
    });
    if (!user) {
      return { error: unauthorized("User not found"), user: null };
    }
    return { error: null, user };
  } catch {
    return { error: unauthorized("Invalid or expired token"), user: null };
  }
}

export async function requireAdmin(request: Request) {
  const result = await requireUser(request);
  if (result.error || !result.user) return result;
  if (result.user.role !== "admin") {
    return { error: forbidden("Admin access required"), user: null };
  }
  return result;
}