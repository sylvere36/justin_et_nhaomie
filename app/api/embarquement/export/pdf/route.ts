import { PDFDocument, rgb } from "pdf-lib";
import { isAuthenticated } from "@/lib/auth";
import { listGuests, type Guest } from "@/lib/db";
import {
  buildBoardingPass,
  loadBoardingFonts,
  BP_W,
  BP_H,
} from "@/lib/boardingPass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Feuille d'impression A4 portrait : 4 cartes d'embarquement (modèle 3) par page,
// sans contour, avec des repères de coupe discrets dans les marges.
const PAGE_W = 595; // A4 portrait (points)
const PAGE_H = 842;
const MARGIN_Y = 30;
const GAP = 16;
const PER_PAGE = 4;

const CARD_H = (PAGE_H - 2 * MARGIN_Y - (PER_PAGE - 1) * GAP) / PER_PAGE;
const CARD_W = (CARD_H * BP_W) / BP_H;
const CARD_X = (PAGE_W - CARD_W) / 2;

const MARK = rgb(0.72, 0.72, 0.72);
const MARK_LEN = 14;
const MARK_GAP = 6;
const MARK_THICK = 0.5;

// Tri « naturel » par table (Table 2 avant Table 10), puis par nom.
function compareGuests(a: Guest, b: Guest): number {
  const ta = a.table_name ?? "";
  const tb = b.table_name ?? "";
  if (ta !== tb) {
    if (!ta) return 1; // sans table en dernier
    if (!tb) return -1;
    return ta.localeCompare(tb, "fr", { numeric: true, sensitivity: "base" });
  }
  return a.full_name.localeCompare(b.full_name, "fr", { sensitivity: "base" });
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const isDownload = url.searchParams.get("download") === "1";
  // Périmètre : « with-table » (défaut) = uniquement ceux ayant une table ;
  // « all » = tous (ceux sans table afficheront « À l'accueil »).
  const scope = url.searchParams.get("scope") === "all" ? "all" : "with-table";

  let guests = await listGuests();
  // On n'imprime pas de carte pour les invités ayant décliné.
  guests = guests.filter((g) => g.status !== "declined");
  if (scope === "with-table") {
    guests = guests.filter((g) => (g.table_name ?? "").trim().length > 0);
  }
  guests.sort(compareGuests);

  if (guests.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          scope === "with-table"
            ? "Aucun invité avec un nom de table. Ajoutez des tables ou choisissez « Tous »."
            : "Aucun invité à imprimer.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Polices chargées une seule fois pour toute la série.
  const fonts = await loadBoardingFonts(origin);

  const pdf = await PDFDocument.create();
  pdf.setTitle("Cartes d'embarquement — Justin & Naomie");
  pdf.setSubject(`${guests.length} carte(s) · 4 par page A4`);

  // Repères de coupe d'une page (identiques sur chaque feuille).
  function drawCropMarks(page: ReturnType<PDFDocument["addPage"]>, onPage: number) {
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: MARK_THICK,
        color: MARK,
      });

    for (let i = 0; i < onPage; i++) {
      const topY = PAGE_H - MARGIN_Y - i * (CARD_H + GAP);
      const botY = topY - CARD_H;
      // Ticks horizontaux dans les marges gauche/droite, au bord haut et bas.
      for (const y of [topY, botY]) {
        line(CARD_X - MARK_GAP - MARK_LEN, y, CARD_X - MARK_GAP, y);
        line(CARD_X + CARD_W + MARK_GAP, y, CARD_X + CARD_W + MARK_GAP + MARK_LEN, y);
      }
    }
    // Ticks verticaux dans les marges haute/basse, aux bords gauche/droit.
    for (const x of [CARD_X, CARD_X + CARD_W]) {
      line(x, PAGE_H - MARK_GAP, x, PAGE_H - MARK_GAP - MARK_LEN);
      line(x, MARK_GAP, x, MARK_GAP + MARK_LEN);
    }
  }

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  for (let idx = 0; idx < guests.length; idx++) {
    const slot = idx % PER_PAGE;
    if (idx > 0 && slot === 0) page = pdf.addPage([PAGE_W, PAGE_H]);

    const g = guests[idx];
    const png = await (
      await buildBoardingPass(origin, g, 3, { square: true, fonts })
    ).arrayBuffer();
    const img = await pdf.embedPng(png);

    const topY = PAGE_H - MARGIN_Y - slot * (CARD_H + GAP);
    page.drawImage(img, {
      x: CARD_X,
      y: topY - CARD_H,
      width: CARD_W,
      height: CARD_H,
    });

    // Dessine les repères une fois la page complète (ou à la dernière carte).
    const lastOnPage = slot === PER_PAGE - 1 || idx === guests.length - 1;
    if (lastOnPage) drawCropMarks(page, slot + 1);
  }

  const bytes = await pdf.save();
  const fileName =
    scope === "with-table"
      ? `Cartes-embarquement-par-table-${guests.length}.pdf`
      : `Cartes-embarquement-tous-${guests.length}.pdf`;

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
