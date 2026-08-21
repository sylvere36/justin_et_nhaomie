import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAuthenticated } from "@/lib/auth";
import { listGuests, createGuest, updateGuest } from "@/lib/db";
import { normalizeName } from "@/lib/wedding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// Nettoie une cellule « nom » (retire numérotation « 1- », compacte les espaces).
function cleanName(raw: string): string {
  return raw
    .replace(/^\s*\d+\s*[-–.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Repère la ligne d'en-tête et les colonnes « nom » et « table ».
function findHeader(aoa: unknown[][]): {
  headerRow: number;
  nameIdx: number;
  tableIdx: number;
} {
  for (let i = 0; i < Math.min(aoa.length, 5); i++) {
    const cells = (aoa[i] || []).map((c) => normalizeName(String(c ?? "")));
    let nameIdx = -1;
    let tableIdx = -1;
    cells.forEach((h, idx) => {
      if (tableIdx === -1 && h.includes("table")) tableIdx = idx;
      else if (
        nameIdx === -1 &&
        (h.includes("nom") || h.includes("invite") || h.includes("passager"))
      )
        nameIdx = idx;
    });
    if (nameIdx !== -1) return { headerRow: i, nameIdx, tableIdx };
  }
  // Pas d'en-tête reconnu : on suppose col.0 = nom, col.1 = table, données dès la 1re ligne.
  return { headerRow: -1, nameIdx: 0, tableIdx: 1 };
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide (fichier attendu)." },
      { status: 400 }
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier fourni." },
      { status: 400 }
    );
  }

  let aoa: unknown[][];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error("empty");
    aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  } catch {
    return NextResponse.json(
      { error: "Fichier illisible. Utilisez le modèle Excel (.xlsx) fourni." },
      { status: 400 }
    );
  }

  const { headerRow, nameIdx, tableIdx } = findHeader(aoa);
  const dataStart = headerRow + 1; // -1 → 0 si pas d'en-tête

  // Index des invités existants par nom normalisé (détection de doublons).
  const existing = await listGuests();
  const byKey = new Map(existing.map((g) => [normalizeName(g.full_name), g]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const createdNames: string[] = [];
  const updatedNames: string[] = [];

  for (let i = dataStart; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const name = cleanName(String(row[nameIdx] ?? ""));
    const table =
      tableIdx >= 0 ? String(row[tableIdx] ?? "").trim() : "";
    if (!name) {
      skipped++;
      continue;
    }
    const key = normalizeName(name);
    const match = byKey.get(key);
    if (match) {
      // Invité déjà présent → on complète/actualise seulement sa table.
      if (table && table !== (match.table_name ?? "")) {
        const g = await updateGuest(match.id, { table_name: table });
        if (g) byKey.set(key, g);
        updated++;
        updatedNames.push(name);
      } else {
        unchanged++;
      }
    } else {
      // Nom inconnu → création du nouvel invité avec sa table.
      const g = await createGuest({
        full_name: name,
        table_name: table || null,
        invited_count: invitedCountFor(name),
      });
      byKey.set(key, g);
      created++;
      createdNames.push(name);
    }
  }

  if (created === 0 && updated === 0 && unchanged === 0) {
    return NextResponse.json(
      {
        error:
          "Aucun invité trouvé dans le fichier. Vérifiez la colonne « Nom ».",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    created,
    updated,
    unchanged,
    skipped,
    createdNames: createdNames.slice(0, 50),
    updatedNames: updatedNames.slice(0, 50),
  });
}
