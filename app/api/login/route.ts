import { NextResponse } from "next/server";
import { verifyPassword, sessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? "");

  if (!verifyPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 120, // 120 jours
  });
  return res;
}
