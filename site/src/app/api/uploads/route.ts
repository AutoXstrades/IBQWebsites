import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { removeStoredFile, storeFile } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await request.formData();
  const ticketId = String(data.get("ticketId") || "");
  const file = data.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image." }, { status: 400 });
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, userId: session.user.id } });
  if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
  const ext: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  if (!ext[file.type] || !file.size || file.size > 4 * 1024 * 1024) return Response.json({ error: "Use a JPG, PNG, or WebP under 4 MB." }, { status: 400 });
  let url: string | undefined;
  try {
    url = await storeFile("references", ticketId, file, ext[file.type]);
    const upload = await prisma.referenceUpload.create({ data: { ticketId, filename: file.name.slice(0, 180), url } });
    return Response.json({ upload: { id: upload.id, filename: upload.filename, url: `/api/files/reference/${upload.id}` } });
  } catch {
    if (url) await removeStoredFile(url).catch(() => {});
    return Response.json({ error: "Upload unavailable. Please try again." }, { status: 503 });
  }
}
