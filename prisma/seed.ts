import {
  DeliveryStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 10);

  const user = await prisma.user.upsert({
    where: { email: "anna@prosyvaisya.local" },
    update: {
      name: "Анна",
      city: "Москва",
      street: "ул. Солнечная",
      building: "5",
      apartment: "42",
      avatarInitials: "А",
      bonusBalance: 350,
      role: UserRole.user,
    },
    create: {
      email: "anna@prosyvaisya.local",
      phone: "+79001112233",
      passwordHash,
      name: "Анна",
      city: "Москва",
      street: "ул. Солнечная",
      building: "5",
      apartment: "42",
      avatarInitials: "А",
      bonusBalance: 350,
      role: UserRole.user,
      subscription: {
        create: {
          active: true,
          paused: false,
          price: 2490,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@prosyvaisya.local" },
    update: {
      name: "Админ",
      city: "Москва",
      street: "ул. Пекарская",
      building: "1",
      apartment: "1",
      avatarInitials: "Ад",
      role: UserRole.admin,
      passwordHash,
    },
    create: {
      email: "admin@prosyvaisya.local",
      phone: "+79009998877",
      passwordHash,
      name: "Админ",
      city: "Москва",
      street: "ул. Пекарская",
      building: "1",
      apartment: "1",
      avatarInitials: "Ад",
      bonusBalance: 0,
      role: UserRole.admin,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      active: true,
      paused: false,
      price: 2490,
    },
    create: {
      userId: user.id,
      active: true,
      paused: false,
      price: 2490,
    },
  });

  const dishes = [
    {
      slug: "almond-croissant",
      name: "Круассан с миндальным кремом",
      description: "Слоёный, тёплый, с лёгкой хрустящей корочкой",
      imageUrl: "/dishes/almond-croissant.jpg",
      price: 220,
      calories: 320,
      protein: 7,
      fat: 18,
      carbs: 32,
      isKids: false,
      isHealthy: false,
    },
    {
      slug: "salmon-croissant",
      name: "Круассан с лососем и сливочным сыром",
      description: "Сытный утренний вариант с нежным лососем",
      imageUrl: "/dishes/salmon-croissant.jpg",
      price: 320,
      calories: 380,
      protein: 16,
      fat: 22,
      carbs: 28,
      isKids: false,
      isHealthy: false,
    },
    {
      slug: "healthy-muffin",
      name: "ЗОЖ-маффин без сахара",
      description: "Овсяный маффин на эритрите с ягодами",
      imageUrl: "/dishes/healthy-muffin.jpg",
      price: 180,
      calories: 210,
      protein: 8,
      fat: 9,
      carbs: 24,
      isKids: false,
      isHealthy: true,
    },
    {
      slug: "brioche-cream",
      name: "Бриошь с ванильным кремом",
      description: "Воздушная булочка с домашним кремом",
      imageUrl: "/dishes/brioche-cream.jpg",
      price: 210,
      calories: 290,
      protein: 6,
      fat: 14,
      carbs: 36,
      isKids: false,
      isHealthy: false,
    },
    {
      slug: "bunny-croissant",
      name: "Круассан-Зайчик",
      description: "Игривая форма для утреннего настроения",
      imageUrl: "/dishes/bunny-croissant.jpg",
      price: 190,
      calories: 260,
      protein: 5,
      fat: 12,
      carbs: 34,
      isKids: true,
      isHealthy: false,
    },
    {
      slug: "bear-croissant",
      name: "Круассан-Мишка",
      description: "Мягкий и уютный круассан в форме мишки",
      imageUrl: "/dishes/bear-croissant.jpg",
      price: 190,
      calories: 265,
      protein: 5,
      fat: 12,
      carbs: 35,
      isKids: true,
      isHealthy: false,
    },
    {
      slug: "volcano-cruffin",
      name: "Краффин-Вулкан",
      description: "Хрустящий краффин с ягодной «лавой»",
      imageUrl: "/dishes/volcano-cruffin.jpg",
      price: 230,
      calories: 290,
      protein: 5,
      fat: 13,
      carbs: 38,
      isKids: true,
      isHealthy: false,
    },
    {
      slug: "berry-cruffin",
      name: "Ягодный краффин",
      description: "Хруст снаружи, нежность внутри",
      imageUrl: "/dishes/berry-cruffin.jpg",
      price: 240,
      calories: 340,
      protein: 6,
      fat: 16,
      carbs: 42,
      isKids: false,
      isHealthy: false,
    },
  ];

  for (const dish of dishes) {
    await prisma.dish.upsert({
      where: { slug: dish.slug },
      update: dish,
      create: dish,
    });
  }

  const bySlug = Object.fromEntries(
    (
      await prisma.dish.findMany({
        where: { slug: { in: dishes.map((d) => d.slug) } },
      })
    ).map((d) => [d.slug, d])
  );

  // Today = 2026-08-15 (суббота) — неделя с текущего дня, без вчера
  const week = [
    {
      date: utcDate(2026, 8, 15),
      timeSlot: "08:00 - 08:15",
      status: DeliveryStatus.mixing,
      leaveAtDoor: false,
      silentPush: false,
      items: [] as { slug: string; quantity: number }[],
    },
    {
      date: utcDate(2026, 8, 16),
      timeSlot: "08:00 - 08:15",
      status: DeliveryStatus.mixing,
      leaveAtDoor: false,
      silentPush: false,
      items: [] as { slug: string; quantity: number }[],
    },
    {
      date: utcDate(2026, 8, 17),
      timeSlot: "08:00 - 08:15",
      status: DeliveryStatus.mixing,
      leaveAtDoor: false,
      silentPush: false,
      items: [] as { slug: string; quantity: number }[],
    },
    {
      date: utcDate(2026, 8, 18),
      timeSlot: "08:00 - 08:15",
      status: DeliveryStatus.mixing,
      leaveAtDoor: false,
      silentPush: false,
      items: [] as { slug: string; quantity: number }[],
    },
    {
      date: utcDate(2026, 8, 19),
      timeSlot: "08:00 - 08:15",
      status: DeliveryStatus.mixing,
      leaveAtDoor: false,
      silentPush: false,
      items: [] as { slug: string; quantity: number }[],
    },
    {
      date: utcDate(2026, 8, 20),
      timeSlot: "08:00 - 08:15",
      status: DeliveryStatus.mixing,
      leaveAtDoor: false,
      silentPush: false,
      items: [] as { slug: string; quantity: number }[],
    },
  ];

  for (const day of week) {
    const delivery = await prisma.delivery.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: day.date,
        },
      },
      update: {
        timeSlot: day.timeSlot,
        status: day.status,
        leaveAtDoor: day.leaveAtDoor,
        silentPush: day.silentPush,
      },
      create: {
        userId: user.id,
        date: day.date,
        timeSlot: day.timeSlot,
        status: day.status,
        leaveAtDoor: day.leaveAtDoor,
        silentPush: day.silentPush,
      },
    });

    await prisma.deliveryItem.deleteMany({ where: { deliveryId: delivery.id } });
    if (day.items.length > 0) {
      await prisma.deliveryItem.createMany({
        data: day.items.map((item) => ({
          deliveryId: delivery.id,
          dishId: bySlug[item.slug].id,
          quantity: item.quantity,
        })),
      });
    }

    await prisma.deliveryTracking.upsert({
      where: { deliveryId: delivery.id },
      update: {
        status: day.status,
        courierName: "Алексей",
        courierPhone: "+79001234567",
      },
      create: {
        deliveryId: delivery.id,
        status: day.status,
        courierName: "Алексей",
        courierPhone: "+79001234567",
        courierNote: "Готовлю маршрут по микрорайону",
        etaMinutes: 10,
      },
    });
  }

  console.log(`Seed OK: user=${user.email}, dishes=${dishes.length}, days=${week.length}`);
  console.log("Demo login: anna@prosyvaisya.local / demo12345");
  console.log("Admin login: admin@prosyvaisya.local / demo12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
