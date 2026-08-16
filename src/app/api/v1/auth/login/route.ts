import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, verifyPassword } from "@/lib/auth";
import { LoginBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeSubscription, serializeUser } from "@/lib/serializers";
import { ensureDemoWeekDeliveries } from "@/lib/demo-week";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = LoginBodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { subscription: true },
    });
    if (!user) {
      return fail("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return fail("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    if (user.role !== "admin") {
      await ensureDemoWeekDeliveries(user.id);
    }

    const token = await signAccessToken({
      sub: user.id,
      email: user.email,
    });

    return ok({
      token,
      user: serializeUser(user),
      subscription: user.subscription
        ? serializeSubscription(user.subscription)
        : null,
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to login", 500);
  }
}
