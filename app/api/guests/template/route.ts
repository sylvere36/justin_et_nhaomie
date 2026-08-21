import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Modèle Excel d'import : deux colonnes « Nom » et « Table », avec des exemples.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const rows = [
    { Nom: "Mr et Mme Amany", Table: "Table 1" },
    { Nom: "Mr QOUIOH Sylvain", Table: "Table 2" },
    { Nom: "Père Guy Honoré ASSAGOU", Table: "" },
  ];

  const ws = XLSX.utils.json_to_sheet(rows, { header: ["Nom", "Table"] });
  ws["!cols"] = [{ wch: 40 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invités");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Modele-import-invites.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
