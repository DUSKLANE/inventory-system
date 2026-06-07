import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const validUsername = process.env.AUTH_USERNAME || "admin";
    const validPassword = process.env.AUTH_PASSWORD || "admin123";

    if (username === validUsername && password === validPassword) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("auth_session", "authenticated", {
        httpOnly: true,
        path: "/",
        maxAge: 315360000, // 10 years
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json(
      { success: false, error: "用户名或密码错误" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式错误" },
      { status: 400 }
    );
  }
}
