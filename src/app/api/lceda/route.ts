import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://pro.lceda.cn/api/eda/product/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, page: 1, pageSize: 5 }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "LCEDA API error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("LCEDA proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch LCEDA API" }, { status: 500 });
  }
}
