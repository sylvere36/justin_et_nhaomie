import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listGuests, createGuest } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();
  const guests = await listGuests();
  return NextResponse.json({ guests });
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const full_name = String(body?.full_name ?? "").trim();
  if (!full_name) {
    return NextResponse.json(
      { error: "Le nom de l'invité est requis." },
      { status: 400 }
    );
  }

  const guest = await createGuest({
    full_name,
    phone: body?.phone ? String(body.phone) : null,
    email: body?.email ? String(body.email) : null,
    invited_count: Number(body?.invited_count) || 1,
    category: body?.category ? String(body.category) : null,
  });

  return NextResponse.json({ guest }, { status: 201 });
}
