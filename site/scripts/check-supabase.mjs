import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

if (!process.env.DATABASE_URL?.startsWith("postgres")) throw new Error("Run with the Supabase environment and generated PostgreSQL Prisma client.");
const db = new PrismaClient();
const storage = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }).storage;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ibq-private";
const key = `checks/${randomUUID()}.txt`;
let uploaded = false;
try {
  const rows = await db.$queryRaw`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`;
  for (const name of ["User", "Ticket", "Payment", "ReferenceUpload", "Deliverable", "PrototypeImage", "UpdateRequest"]) {
    if (!rows.some(row => row.tablename === name && row.rowsecurity)) throw new Error(`Missing table/RLS: ${name}`);
  }
  const marker = `check-${randomUUID()}@example.invalid`;
  // Roll back the synthetic customer and ticket; never touch existing customer data.
  try {
    await db.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: "IBQ connection check", email: marker } });
      await tx.ticket.create({ data: { userId: user.id, package: "starter", businessName: "Connection check", ownerName: user.name } });
      if (await tx.ticket.count({ where: { userId: user.id } }) !== 1) throw new Error("Read/write check failed");
      throw new Error("ROLLBACK_CHECK");
    });
  } catch (error) { if (error.message !== "ROLLBACK_CHECK") throw error; }
  if (await db.user.count({ where: { email: marker } })) throw new Error("Test transaction did not roll back");
  const info = await storage.getBucket(bucket);
  if (info.error || info.data.public) throw new Error("Bucket missing or public");
  const put = await storage.from(bucket).upload(key, "IBQ private storage check", { contentType: "text/plain" });
  if (put.error) throw put.error;
  uploaded = true;
  const signed = await storage.from(bucket).createSignedUrl(key, 60);
  if (signed.error) throw signed.error;
  const download = await fetch(signed.data.signedUrl);
  if (!download.ok || await download.text() !== "IBQ private storage check") throw new Error("Signed download failed");
  const publicUrl = storage.from(bucket).getPublicUrl(key).data.publicUrl;
  if ((await fetch(publicUrl)).ok) throw new Error("Private file is publicly readable");
  console.log("PASS: PostgreSQL read/write/rollback, all seven tables protected by RLS, private upload, signed download, public access denied.");
} finally {
  if (uploaded) {
    const result = await storage.from(bucket).remove([key]);
    if (result.error) console.error("Could not remove synthetic storage-check file.");
  }
  await db.$disconnect();
}
