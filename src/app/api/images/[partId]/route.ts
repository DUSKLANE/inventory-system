import { NextRequest, NextResponse } from "next/server";
import { getImagePath } from "@/lib/image-store";
import { getDb, getStorageMode } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ partId: string }> }) {
  try {
    const { partId } = await params;
    const mode = getStorageMode();

    if (mode === "local") {
      const filePath = getImagePath(partId);
      if (!filePath || !fs.existsSync(filePath)) return new NextResponse(null, { status: 404 });
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
      const contentType = mimeMap[ext] || "application/octet-stream";
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" } });
    } else {
      const db = getDb();
      const part = await db.getPart(partId);
      if (!part?.image) return new NextResponse(null, { status: 404 });
      const res = await fetch(part.image);
      if (!res.ok) return new NextResponse(null, { status: 404 });
      const contentType = res.headers.get("Content-Type") || "image/jpeg";
      const buffer = Buffer.from(await res.arrayBuffer());
      return new NextResponse(buffer, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" } });
    }
  } catch (error) {
    console.error("GET /api/images error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
