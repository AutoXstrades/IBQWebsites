import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ibq-private";
function storage() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(bucket);
}

export async function storeFile(folder: "references" | "deliverables", ticketId: string, file: File, extension: string) {
  const key = `${folder}/${ticketId}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const remote = storage();
  if (remote) {
    const { error } = await remote.upload(key, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error("Storage upload failed");
    return `supabase://${bucket}/${key}`;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Private storage is not configured");
  const filename = path.join(process.cwd(), ".ibq-storage", key);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, bytes);
  return `private://${key}`;
}

function localPath(url: string) {
  if (process.env.NODE_ENV === "production") throw new Error("Local files are unavailable in production");
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), url.startsWith("private://") ? ".ibq-storage" : "public");
  const relative = url.startsWith("private://") ? url.slice(10) : url.replace(/^\//, "");
  if (!/^(references|deliverables|uploads)\/[a-zA-Z0-9/._-]+$/.test(relative)) throw new Error("Invalid file path");
  const filename = path.resolve(/* turbopackIgnore: true */ root, relative);
  if (!filename.startsWith(root + path.sep)) throw new Error("Invalid file path");
  return filename;
}

export async function retrieveFile(url: string) {
  if (url.startsWith(`supabase://${bucket}/`)) {
    const remote = storage();
    if (!remote) throw new Error("Storage unavailable");
    const { data, error } = await remote.download(url.slice(`supabase://${bucket}/`.length));
    if (error || !data) throw new Error("File unavailable");
    if (data.size > 4 * 1024 * 1024) throw new Error("File exceeds delivery limit");
    return { bytes: Buffer.from(await data.arrayBuffer()) };
  }
  return { bytes: await readFile(localPath(url)) };
}

export async function removeStoredFile(url: string) {
  if (url.startsWith(`supabase://${bucket}/`)) {
    await storage()?.remove([url.slice(`supabase://${bucket}/`.length)]);
  } else {
    await unlink(localPath(url)).catch(() => {});
  }
}
