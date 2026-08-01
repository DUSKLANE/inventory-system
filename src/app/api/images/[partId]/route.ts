import { NextRequest, NextResponse } from "next/server";
import { lookup } from "dns/promises";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|gif|webp|avif|bmp|svg\+xml|ico)$/i;

function isBlockedIp(address: string): boolean {
  const ipv4 = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 169 && b === 254) return true; // 链路本地
    if (a === 172 && b >= 16 && b <= 31) return true; // 私网 172.16/12
    if (a === 192 && b === 168) return true; // 私网 192.168/16
    if (a === 198 && (b === 18 || b === 19)) return true; // 基准测试网段
    if (a >= 224) return true; // 组播/保留
    return false;
  }
  const ipv6 = address.toLowerCase();
  if (ipv6 === "::1" || ipv6 === "::") return true; // 环回/未指定
  if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true; // fc00::/7 唯一本地
  if (/^fe[89ab]/.test(ipv6)) return true; // fe80::/10 链路本地
  return false;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ partId: string }> }) {
  try {
    const { partId } = await params;
    const db = getDb();
    const part = await db.getPart(partId);
    if (!part?.image) return new NextResponse(null, { status: 404 });

    let url: URL;
    try {
      url = new URL(part.image);
    } catch {
      return new NextResponse(null, { status: 400 });
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return new NextResponse(null, { status: 400 });
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
      return new NextResponse(null, { status: 400 });
    }

    // SSRF 防护：禁止解析到内网/环回/保留地址
    try {
      const addresses = await lookup(hostname, { all: true });
      if (addresses.some((a) => isBlockedIp(a.address))) {
        return new NextResponse(null, { status: 400 });
      }
    } catch {
      return new NextResponse(null, { status: 400 });
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return new NextResponse(null, { status: 404 });

    const contentType = res.headers.get("Content-Type") || "";
    if (!ALLOWED_IMAGE_TYPES.test(contentType.split(";")[0].trim())) {
      return new NextResponse(null, { status: 415 });
    }
    const contentLength = Number(res.headers.get("Content-Length") || 0);
    if (contentLength > MAX_IMAGE_SIZE) return new NextResponse(null, { status: 413 });

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_SIZE) return new NextResponse(null, { status: 413 });

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
