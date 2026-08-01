import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const username = await verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);

  if (!username) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({ username });
}
