import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateGuest, deleteGuest, type GuestPatch } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: GuestPatch = {};
  if (body.full_name !== undefined) patch.full_name = String(body.full_name);
  if (body.phone !== undefined) patch.phone = body.phone ? String(body.phone) : null;
  if (body.email !== undefined) patch.email = body.email ? String(body.email) : null;
  if (body.invited_count !== undefined)
    patch.invited_count = Number(body.invited_count) || 1;
  if (body.category !== undefined)
    patch.category = body.category ? String(body.category) : null;

  const guest = await updateGuest(id, patch);
  if (!guest) {
    return NextResponse.json({ error: "Invité introuvable." }, { status: 404 });
  }
  return NextResponse.json({ guest });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const ok = await deleteGuest(id);
  if (!ok) {
    return NextResponse.json({ error: "Invité introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
