import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/supabase/server";

const MB = 1024 * 1024;
export type UploadKind = "image" | "media";
export interface UploadResult { path: string; mediaType: "image" | "video" }

/** Identify the real file type from its bytes — never trust the browser-supplied MIME type or extension. */
export function sniff(buf: Uint8Array): { mime: string; ext: string; kind: "image" | "video" } | null {
  const b = (i: number) => buf[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return { mime: "image/png", ext: "png", kind: "image" };
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return { mime: "image/webp", ext: "webp", kind: "image" };
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) return { mime: "video/mp4", ext: "mp4", kind: "video" };
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) return { mime: "video/webm", ext: "webm", kind: "video" };
  return null;
}

/** Validates (type by magic bytes, size) and stores in a PRIVATE bucket. Returns null + reason on failure. */
export async function storeUpload(
  file: File | null, opts: { bucket: "media" | "member-photos"; folder: string; allowVideo?: boolean },
): Promise<{ ok: true; result: UploadResult } | { ok: false; error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { ok: false, error: "No file selected." };
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || (type.kind === "video" && !opts.allowVideo)) {
    return { ok: false, error: opts.allowVideo ? "Unsupported file. Use JPG, PNG, WebP, MP4 or WebM." : "Unsupported file. Use JPG, PNG or WebP." };
  }
  const limit = type.kind === "image" ? (opts.bucket === "member-photos" ? 2 * MB : 5 * MB) : 10 * MB;
  if (buf.byteLength > limit) return { ok: false, error: `File is too large (maximum ${limit / MB} MB).` };
  const path = `${opts.folder}/${randomUUID()}.${type.ext}`;
  const { error } = await adminClient().storage.from(opts.bucket).upload(path, buf, { contentType: type.mime, upsert: false });
  if (error) return { ok: false, error: "Upload failed. Please try again." };
  return { ok: true, result: { path, mediaType: type.kind } };
}
