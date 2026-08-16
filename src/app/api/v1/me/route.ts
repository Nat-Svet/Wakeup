import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { initialsFromName } from "@/lib/auth";
import { UpdateMeBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeSubscription, serializeUser } from "@/lib/serializers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  return ok({
    user: serializeUser(user),
    subscription: user.subscription
      ? serializeSubscription(user.subscription)
      : null,
  });
}

export async function PATCH(request: Request) {
  try {
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = UpdateMeBodySchema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name,
        phone: body.phone === undefined ? undefined : body.phone,
        city: body.city,
        street: body.street,
        building: body.building,
        apartment: body.apartment,
        avatarUrl: body.avatarUrl === undefined ? undefined : body.avatarUrl,
        avatarInitials: body.name ? initialsFromName(body.name) : undefined,
      },
      include: { subscription: true },
    });

    return ok({
      user: serializeUser(updated),
      subscription: updated.subscription
        ? serializeSubscription(updated.subscription)
        : null,
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to update profile", 500);
  }
}

/** Delete current account and all related data (cascade). */
export async function DELETE(request: Request) {
  try {
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    await prisma.user.delete({ where: { id: user.id } });

    return ok({ deleted: true, userId: user.id });
  } catch (error) {
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to delete account", 500);
  }
}
