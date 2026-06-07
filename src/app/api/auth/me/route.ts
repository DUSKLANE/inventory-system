import { NextResponse } from "next/server";

export async function GET() {
  const username = process.env.AUTH_USERNAME || "admin";
  return NextResponse.json({ username });
}
