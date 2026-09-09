import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class SafeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function serial<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (e) { if (i < 4 && e instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(e.code)) continue; throw e; }
  }
}
export type Limit = { scope: string; subject: string; max: number; seconds: number };
export async function limit(limits: Limit[]) {
  const now = Date.now();
  await serial(async tx => {
    await tx.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
    for (const item of limits) {
      const bucket = Math.floor(now / (item.seconds * 1000));
      const id = createHmac("sha256", process.env.AUTH_SECRET || "local-development-only").update(`${item.scope}:${item.subject}:${bucket}`).digest("hex");
      const row = await tx.rateLimit.upsert({ where: { id }, create: { id, count: 1, expiresAt: new Date((bucket + 2) * item.seconds * 1000) }, update: { count: { increment: 1 } } });
      if (row.count > item.max) throw new SafeError("Too many requests. Please try again later.", 429);
    }
  });
}
export function clientIp(headers: Headers) {
  // Vercel overwrites this header. Never trust arbitrary forwarded IPs locally.
  return process.env.VERCEL ? headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown" : "local";
}
export function sameOrigin(request: Request) {
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  if (request.headers.get("origin") !== expected) throw new SafeError("Request origin is not allowed.", 403);
}
export async function readBody(request: Request, max = 32768) {
  if (Number(request.headers.get("content-length")) > max) throw new SafeError("Request is too large.", 413);
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = []; let size = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new SafeError("Request is too large.", 413); } parts.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; } return bytes;
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SafeError("Use JSON.", 415);
  try { return JSON.parse(new TextDecoder().decode(await readBody(request))); } catch (e) { if (e instanceof SafeError) throw e; throw new SafeError("Invalid request."); }
}
export async function formBody(request: Request) {
  const bytes = await readBody(request, 4 * 1024 * 1024 + 16384);
  try { return await new Response(bytes, { headers: { "content-type": request.headers.get("content-type") || "" } }).formData(); } catch { throw new SafeError("Invalid upload."); }
}
export function apiError(error: unknown) {
  const known = error instanceof SafeError;
  return Response.json({ error: known ? error.message : "Temporarily unavailable. Please try again." }, { status: known ? error.status : 503, headers: { "Cache-Control": "no-store", ...(known && error.status === 429 ? { "Retry-After": "60" } : {}) } });
}
