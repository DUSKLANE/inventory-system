import { NextResponse } from "next/server";
import { createSessionToken, getCredentials, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const credentials = getCredentials();

    if (!credentials) {
      return NextResponse.json(
        { success: false, error: "未配置登录凭据，请设置 AUTH_USERNAME/AUTH_PASSWORD 环境变量" },
        { status: 503 }
      );
    }

    if (username === credentials.username && password === credentials.password) {
      let token: string;
      try {
        token = await createSessionToken(username);
      } catch {
        return NextResponse.json(
          { success: false, error: "服务端未配置 AUTH_SECRET 环境变量（至少 16 字符），请联系管理员" },
          { status: 500 }
        );
      }
      const response = NextResponse.json({ success: true });
      response.cookies.set(AUTH_COOKIE, token, {
        httpOnly: true,
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
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
