import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // If credentials are not configured, allow access
  if (!user || !pass) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (username === user && password === pass) {
      // Create a simple auth token (in production, use a proper JWT or session)
      const token = Buffer.from(`${username}:${password}`).toString("base64");

      const cookieStore = await cookies();
      cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
