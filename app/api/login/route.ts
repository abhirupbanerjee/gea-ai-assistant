import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const raw = process.env.ADMIN_USERS_JSON;
    if (!raw) {
      return NextResponse.json({ error: "Admin users not configured" }, { status: 500 });
    }
    const users = JSON.parse(raw);
    const valid = users.some((u: { email: string; password: string }) => u.email === email && u.password === password);
    if (valid) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false }, { status: 401 });
  } catch (err: any) {
    console.error("Login API error:", err.message);
    return NextResponse.json({ error: "Failed to validate credentials" }, { status: 500 });
  }
}
