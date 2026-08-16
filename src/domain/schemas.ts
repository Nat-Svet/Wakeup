import { z } from "zod";

export const DeliveryStatusSchema = z.enum([
  "mixing",
  "baking",
  "en_route",
  "at_door",
]);
export const BunShapeSchema = z.enum(["bunny", "bear", "volcano"]);
export const GlazeColorSchema = z.enum(["raspberry", "mango", "spinach"]);
export const SecretFillingSchema = z.enum(["caramel", "banana"]);
export const BonusReasonSchema = z.enum([
  "neighbor_share",
  "feedback_positive",
  "feedback_compensation",
  "kids_construction",
  "order_spend",
  "manual_adjust",
]);
export const FeedbackKindSchema = z.enum(["positive", "negative"]);

export const KidsCustomSchema = z.object({
  shape: BunShapeSchema,
  glaze: GlazeColorSchema,
  filling: SecretFillingSchema,
});

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  name: z.string().min(1),
  city: z.string().min(1),
  street: z.string().min(1),
  building: z.string().min(1),
  apartment: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  avatarInitials: z.string().min(1).max(3),
  bonusBalance: z.number().int(),
  role: z.enum(["user", "admin"]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SubscriptionSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  active: z.boolean(),
  paused: z.boolean(),
  price: z.number().int().positive(),
});

export const DishSchema = z.object({
  id: z.string().cuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  imageUrl: z.string().min(1),
  price: z.number().int().nonnegative(),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  isKids: z.boolean(),
  isHealthy: z.boolean(),
  isActive: z.boolean().optional(),
});

export const DeliveryItemSchema = z.object({
  id: z.string().cuid(),
  dishId: z.string().cuid(),
  quantity: z.number().int().min(0).max(10),
  kidsCustom: KidsCustomSchema.optional(),
});

export const DeliverySchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  date: z.string(), // YYYY-MM-DD
  timeSlot: z.string(),
  status: DeliveryStatusSchema,
  leaveAtDoor: z.boolean(),
  silentPush: z.boolean(),
  items: z.array(DeliveryItemSchema),
});

export const DeliveryTrackingSchema = z.object({
  deliveryId: z.string().cuid(),
  status: DeliveryStatusSchema,
  etaMinutes: z.number().int().nullable().optional(),
  courierName: z.string().nullable().optional(),
  courierPhone: z.string().nullable().optional(),
  courierNote: z.string().nullable().optional(),
  neighborBonusAwarded: z.boolean(),
});

export const BonusLedgerSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  amount: z.number().int(),
  reason: BonusReasonSchema,
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
});

export const FeedbackSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  deliveryId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  kind: FeedbackKindSchema,
  tags: z.array(z.string()),
  comment: z.string().nullable().optional(),
  bonusAwarded: z.number().int().nonnegative(),
});

/** Auth / request DTOs */
export const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  city: z.string().min(1),
  street: z.string().min(1),
  building: z.string().min(1),
  apartment: z.string().min(1),
});

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const UpdateDeliveryBodySchema = z.object({
  timeSlot: z.string().optional(),
  leaveAtDoor: z.boolean().optional(),
  silentPush: z.boolean().optional(),
});

export const UpsertDeliveryItemsBodySchema = z.object({
  items: z.array(
    z.object({
      dishId: z.string().min(1),
      quantity: z.number().int().min(0).max(10),
      kidsCustom: KidsCustomSchema.optional(),
    })
  ),
});

export const CreateKidsItemBodySchema = z.object({
  shape: BunShapeSchema,
  glaze: GlazeColorSchema,
  filling: SecretFillingSchema,
});

export const UpdateMeBodySchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  street: z.string().min(1).optional(),
  building: z.string().min(1).optional(),
  apartment: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const AccrueBonusBodySchema = z.object({
  amount: z.number().int(),
  reason: BonusReasonSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateTrackingBodySchema = z.object({
  status: DeliveryStatusSchema.optional(),
  etaMinutes: z.number().int().min(0).nullable().optional(),
  courierName: z.string().min(1).optional(),
  courierPhone: z.string().min(1).optional(),
  courierNote: z.string().max(500).nullable().optional(),
});

export const CreateFeedbackBodySchema = z.object({
  deliveryId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).default([]),
  comment: z.string().max(2000).optional(),
});

export const PaymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "cancelled",
]);

export const CheckoutBodySchema = z.object({
  deliveryId: z.string().min(1),
  bonusToSpend: z.number().int().min(0).default(0),
  idempotencyKey: z.string().min(8).max(128),
});

export const AdminCreateDishBodySchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  imageUrl: z.string().min(1).max(500),
  price: z.number().int().nonnegative(),
  calories: z.number().int().nonnegative().default(0),
  protein: z.number().int().nonnegative().default(0),
  fat: z.number().int().nonnegative().default(0),
  carbs: z.number().int().nonnegative().default(0),
  isKids: z.boolean().default(false),
  isHealthy: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const AdminUpdateDishBodySchema = AdminCreateDishBodySchema.partial();

export const AdminAdjustBonusBodySchema = z.object({
  amount: z.number().int(),
  note: z.string().max(500).optional(),
});

export const AdminUpdateDeliveryTrackingBodySchema = z.object({
  status: DeliveryStatusSchema,
});

export const PaymentSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  deliveryId: z.string().cuid(),
  status: PaymentStatusSchema,
  currency: z.string(),
  itemsTotal: z.number().int().nonnegative(),
  bonusSpent: z.number().int().nonnegative(),
  amountDue: z.number().int().nonnegative(),
  amountPaid: z.number().int().nonnegative(),
  provider: z.string(),
  providerPaymentId: z.string().nullable().optional(),
  receiptCode: z.string().nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
export type BunShape = z.infer<typeof BunShapeSchema>;
export type GlazeColor = z.infer<typeof GlazeColorSchema>;
export type SecretFilling = z.infer<typeof SecretFillingSchema>;
export type BonusReason = z.infer<typeof BonusReasonSchema>;
export type FeedbackKind = z.infer<typeof FeedbackKindSchema>;
export type KidsCustom = z.infer<typeof KidsCustomSchema>;
export type UserDto = z.infer<typeof UserSchema>;
export type SubscriptionDto = z.infer<typeof SubscriptionSchema>;
export type DishDto = z.infer<typeof DishSchema>;
export type DeliveryItemDto = z.infer<typeof DeliveryItemSchema>;
export type DeliveryDto = z.infer<typeof DeliverySchema>;
export type DeliveryTrackingDto = z.infer<typeof DeliveryTrackingSchema>;
export type BonusLedgerDto = z.infer<typeof BonusLedgerSchema>;
export type FeedbackDto = z.infer<typeof FeedbackSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentDto = z.infer<typeof PaymentSchema>;
export type CheckoutBody = z.infer<typeof CheckoutBodySchema>;
