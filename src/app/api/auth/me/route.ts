import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("auth_session")?.value;

  if (session !== "authenticated") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const username = process.env.AUTH_USERNAME || "admin";
  return NextResponse.json({ username });
}
