import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  initialsFromName,
  signAccessToken,
} from "@/lib/auth";
import { RegisterBodySchema } from "@/domain/schemas";
import { created, fail, fromZod } from "@/lib/api-response";
import { serializeSubscription, serializeUser } from "@/lib/serializers";
import { ensureDemoWeekDeliveries } from "@/lib/demo-week";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = RegisterBodySchema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      return fail("EMAIL_TAKEN", "User with this email already exists", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        phone: body.phone || null,
        passwordHash,
        name: body.name,
        city: body.city,
        street: body.street,
        building: body.building,
        apartment: body.apartment,
        avatarInitials: initialsFromName(body.name),
        bonusBalance: 50,
        subscription: {
          create: {
            active: true,
            paused: false,
            price: 2490,
          },
        },
      },
      include: { subscription: true },
    });

    await ensureDemoWeekDeliveries(user.id);

    const token = await signAccessToken({
      sub: user.id,
      email: user.email,
    });

    return created({
      token,
      user: serializeUser(user),
      subscription: user.subscription
        ? serializeSubscription(user.subscription)
        : null,
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to register", 500);
  }
}
