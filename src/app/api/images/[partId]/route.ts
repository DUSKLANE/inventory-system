import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ partId: string }> }) {
  try {
    const { partId } = await params;
    const db = getDb();
    const part = await db.getPart(partId);
    if (!part?.image) return new NextResponse(null, { status: 404 });

    const res = await fetch(part.image);
    if (!res.ok) return new NextResponse(null, { status: 404 });

    const contentType = res.headers.get("Content-Type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
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
