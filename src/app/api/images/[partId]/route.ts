import { NextRequest, NextResponse } from "next/server";
import { getImagePath } from "@/lib/image-store";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const { partId } = await params;
    const filePath = getImagePath(partId);

    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse(null, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/images error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
