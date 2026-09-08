import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" || /^postgres(ql)?:/.test(process.env.DATABASE_URL || "")) {
    throw new Error("Demo seeding is restricted to the local SQLite database.");
  }
  const admin = await prisma.user.upsert({
    where: { email: "admin@ibq.local" }, update: {},
    create: { name: "IBQ Admin", email: "admin@ibq.local", passwordHash: await hash("ChangeMe123!", 12) },
  });
  const demo = await prisma.user.upsert({
    where: { email: "demo@ibq.local" }, update: {},
    create: { name: "Demo Customer", email: "demo@ibq.local", passwordHash: await hash("demo1234", 12) },
  });
  const exists = await prisma.ticket.findFirst({ where: { userId: demo.id, businessName: "Demo Studio" } });
  const ticketData = {
    userId: demo.id, package: "starter", step: 1, businessName: "Demo Studio", ownerName: demo.name,
    email: demo.email, phone: "555-0142", address: "Service area", hours: "Mon–Fri, 9–5",
    pages: JSON.stringify(["Home"]), services: "Signature service — $75 — 60 min",
    photos: "Hero and work shots needed", cta: "Call", notes: "Seeded Single Page ticket for the local demo account.",
  };
  if (exists) await prisma.ticket.update({ where: { id: exists.id }, data: ticketData });
  else await prisma.ticket.create({ data: ticketData });
  console.log(`Seeded ${admin.email} and ${demo.email}`);
}

main().finally(() => prisma.$disconnect());
