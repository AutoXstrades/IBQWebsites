import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { retrieveFile } from "@/lib/storage";
import { entitled } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Sign in to view this file.", { status: 401 });
  const { kind, id } = await params;
  const include = { ticket: { include: { payments: true } } };
  const file = kind === "reference"
    ? await prisma.referenceUpload.findUnique({ where: { id }, include })
    : kind === "deliverable" ? await prisma.deliverable.findUnique({ where: { id }, include }) : null;
  const admin = Boolean(process.env.ADMIN_EMAIL && session.user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
  if (!file || (!admin && file.ticket.userId !== session.user.id)) return new Response("File not found.", { status: 404 });
  if (!admin && "kind" in file && file.kind === "FILE") {
    if (!entitled(file.ticket)) {
      return new Response("Files unlock after payment.", { status: 403 });
    }
  }
  try {
    const data = await retrieveFile(file.url);
    const headers: Record<string, string> = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
    headers["Content-Security-Policy"] = "sandbox; default-src 'none'; frame-ancestors 'none'";
    const name = "filename" in file ? file.filename : file.name;
    const ext = file.url.split(".").pop() || "";
    const mime = "mimeType" in file ? file.mimeType : ({ jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[ext] || "application/octet-stream";
    headers["Content-Type"] = mime;
    headers["Content-Disposition"] = `${mime.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`;
    return new Response(new Uint8Array(data.bytes!), { headers });
  } catch {
    return new Response("File temporarily unavailable.", { status: 503 });
  }
}
