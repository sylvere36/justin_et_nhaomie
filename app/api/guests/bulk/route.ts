import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createGuest } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

// Détecte les couples pour réserver 2 places automatiquement.
function invitedCountFor(name: string): number {
  return /(\bet\s+épouse\b)|(\bet\s+(mme|madame)\b)|(\bm(?:\.|r)?\s+et\s+mme\b)/i.test(
    name
  )
    ? 2
    : 1;
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const raw =
    typeof body?.text === "string"
      ? body.text
      : Array.isArray(body?.names)
        ? body.names.join("\n")
        : "";
  const category = body?.category ? String(body.category).trim() || null : null;

  const names: string[] = raw
    .split(/\r?\n/)
    // Retire la numérotation (« 1- », « 12. », « 3) ») et normalise les espaces.
    .map((l: string) =>
      l
        .replace(/^\s*\d+\s*[-–.)]\s*/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((l: string) => l.length > 0);

  if (names.length === 0) {
    return NextResponse.json(
      { error: "Aucun nom valide à importer." },
      { status: 400 }
    );
  }

  let created = 0;
  let couples = 0;
  for (const full_name of names) {
    const invited_count = invitedCountFor(full_name);
    if (invited_count > 1) couples++;
    await createGuest({ full_name, invited_count, category });
    created++;
  }

  return NextResponse.json({ created, couples });
}
