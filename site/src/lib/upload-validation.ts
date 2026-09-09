import sharp from "sharp";
import { SafeError } from "@/lib/security";
const MAX = 4 * 1024 * 1024;
export async function validateFile(file: File, imageOnly = false) {
  if (!file.size || file.size > MAX) throw new SafeError("Use a file under 4 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    try {
      const image = sharp(bytes, { limitInputPixels: 16000000, failOn: "warning", animated: false });
      const meta = await image.metadata();
      if (!meta.width || !meta.height || (meta.pages || 1) > 1 || !["jpeg", "png", "webp"].includes(meta.format || "")) throw new Error();
      const clean = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      if (clean.length > MAX) throw new Error();
      return { file: new File([new Uint8Array(clean)], "image.webp", { type: "image/webp" }), extension: "webp" };
    } catch { throw new SafeError("This image is invalid, animated, or too large to decode."); }
  }
  if (imageOnly) throw new SafeError("Use a JPG, PNG, or WebP image.");
  const types: Record<string, string> = { "application/pdf": "pdf", "application/zip": "zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "text/plain": "txt" };
  const extension = types[file.type]; if (!extension) throw new SafeError("Unsupported file type.");
  if (extension === "pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new SafeError("Invalid PDF.");
  if (["zip", "docx"].includes(extension) && !(bytes[0] === 80 && bytes[1] === 75 && [3, 5, 7].includes(bytes[2]))) throw new SafeError("Invalid archive.");
  if (extension === "docx" && (!bytes.includes(Buffer.from("[Content_Types].xml")) || !bytes.includes(Buffer.from("word/")))) throw new SafeError("Invalid Word document.");
  if (extension === "txt") { try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); if (bytes.includes(0)) throw new Error(); } catch { throw new SafeError("Use a UTF-8 text file."); } }
  return { file, extension };
}
