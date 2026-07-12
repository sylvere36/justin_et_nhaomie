import { NextResponse } from "next/server";
import { submitRsvp } from "@/lib/db";

// Route publique : c'est ici que l'invité confirme ou décline sa présence.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status;

  if (status !== "confirmed" && status !== "declined") {
    return NextResponse.json({ error: "Réponse invalide." }, { status: 400 });
  }

  const guest = await submitRsvp(token, {
    status,
    attending_count:
      body?.attending_count !== undefined ? Number(body.attending_count) : 1,
    message: body?.message ? String(body.message) : null,
  });

  if (!guest) {
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json({ guest });
}
