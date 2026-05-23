import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXT_FOR_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file field is required" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `file exceeds ${MAX_BYTES / (1024 * 1024)} MB limit` }, { status: 413 });
    }

    const mime = file.type;
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: `unsupported type: ${mime || "unknown"}. Use PNG, JPEG, or WebP.` }, { status: 415 });
    }

    const ext = EXT_FOR_MIME[mime];
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `ref-${id}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const destPath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(destPath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, filename, size: buffer.length, mimeType: mime });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    console.error("[api/upload-image] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
