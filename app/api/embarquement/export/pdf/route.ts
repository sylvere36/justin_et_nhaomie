import { PDFDocument, rgb, PDFFont, PDFPage, PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { isAuthenticated } from "@/lib/auth";
import { listGuests, type Guest } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Export global des cartes d'embarquement — PDF VECTORIEL (pdf-lib).
// Rendu direct (pas de Satori) : rapide et fiable même pour des centaines
// d'invités. Feuille A4 portrait, 4 cartes par page, repères de coupe discrets.
// ---------------------------------------------------------------------------

// Couleurs (identiques au modèle 3 « Ticket Or »).
const GOLD = rgb(0.784, 0.635, 0.29);
const GOLD_SOFT = rgb(0.89, 0.784, 0.467);
const EMERALD = rgb(0.055, 0.42, 0.329);
const EMERALD_DEEP = rgb(0.031, 0.235, 0.188);
const IVORY = rgb(1, 0.992, 0.973);
const INK = rgb(0.133, 0.125, 0.11);
const MUTED = rgb(0.549, 0.522, 0.467);
const LINE = rgb(0.906, 0.875, 0.804);
const MARK = rgb(0.72, 0.72, 0.72);

// Page A4 portrait (points) + géométrie 4 par page.
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_Y = 30;
const GAP = 16;
const PER_PAGE = 4;
const CARD_H = (PAGE_H - 2 * MARGIN_Y - (PER_PAGE - 1) * GAP) / PER_PAGE;
const BP_RATIO = 1600 / 620;
const CARD_W = CARD_H * BP_RATIO;
const CARD_X = (PAGE_W - CARD_W) / 2;

const MARK_LEN = 14;
const MARK_GAP = 6;
const MARK_THICK = 0.5;

// --- Helpers déterministes (mêmes formules que le modèle) ------------------
function hashNum(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}
const flightNo = (t: string) => `JN ${(hashNum(t) % 900) + 100}`;
const gateNo = (t: string) => String((hashNum(t) % 24) + 1).padStart(2, "0");
function tableValue(g: Guest): string {
  const s = (g.table_name ?? "").trim();
  return s || "À l'accueil";
}
function barcodeBars(t: string, n: number): { w: number; ink: boolean }[] {
  const s =
    hashNum(t).toString(2) +
    hashNum(t + "x").toString(2) +
    hashNum(t + "y").toString(2);
  const a: { w: number; ink: boolean }[] = [];
  for (let i = 0; i < n; i++)
    a.push({ w: (s.charCodeAt(i % s.length) % 3) + 1, ink: i % 2 === 0 });
  return a;
}

function compareGuests(a: Guest, b: Guest): number {
  const ta = a.table_name ?? "";
  const tb = b.table_name ?? "";
  if (ta !== tb) {
    if (!ta) return 1;
    if (!tb) return -1;
    return ta.localeCompare(tb, "fr", { numeric: true, sensitivity: "base" });
  }
  return a.full_name.localeCompare(b.full_name, "fr", { sensitivity: "base" });
}

type Fonts = {
  bold: PDFFont;
  semi: PDFFont;
  med: PDFFont;
  script: PDFFont;
  mono: PDFFont;
};

// Texte ajusté à une largeur max (réduit la taille si nécessaire).
function drawFit(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  align: "left" | "right" = "left"
) {
  let s = size;
  let tw = font.widthOfTextAtSize(text, s);
  while (tw > maxW && s > 4) {
    s -= 0.5;
    tw = font.widthOfTextAtSize(text, s);
  }
  const dx = align === "right" ? x + maxW - tw : x;
  page.drawText(text, { x: dx, y, size: s, font, color });
}

function drawCard(
  page: PDFPage,
  f: Fonts,
  box: { x: number; y: number; w: number; h: number },
  guest: Guest,
  qr: PDFImage
) {
  const { x, y, w, h } = box;
  const top = y + h;
  const right = x + w;

  // Fond ivoire (coins droits pour la découpe).
  page.drawRectangle({ x, y, width: w, height: h, color: IVORY });

  // Bande dorée + filet émeraude.
  const hb = 30;
  page.drawRectangle({ x, y: top - hb, width: w, height: hb, color: GOLD });
  page.drawRectangle({ x, y: top - hb - 1.6, width: w, height: 1.6, color: EMERALD });

  page.drawText("JUSTIN & NAOMIE", {
    x: x + 12,
    y: top - 15,
    size: 11,
    font: f.bold,
    color: EMERALD_DEEP,
  });
  page.drawText("CARTE D'EMBARQUEMENT · PREMIÈRE CLASSE", {
    x: x + 12,
    y: top - 25,
    size: 5.5,
    font: f.med,
    color: EMERALD,
  });
  const fl = flightNo(guest.token);
  drawFit(page, fl, right - 80, top - 20, 68, 12, f.bold, EMERALD_DEEP, "right");

  // Séparateur perforé vertical (main / talon).
  const xsplit = x + w * 0.66;
  page.drawLine({
    start: { x: xsplit, y: y + 10 },
    end: { x: xsplit, y: top - hb - 8 },
    thickness: 1,
    color: LINE,
    dashArray: [2, 3],
  });

  // ---- Panneau principal ----
  const bx = x + 12;
  const mainRight = xsplit - 12;
  const mainW = mainRight - bx;

  let cy = top - hb - 14;
  page.drawText("PASSAGER / PASSENGER", {
    x: bx,
    y: cy,
    size: 5.5,
    font: f.med,
    color: MUTED,
  });
  cy -= 12;
  drawFit(page, guest.full_name, bx, cy, mainW, 10, f.semi, INK);

  // Itinéraire JUS -> NAO
  cy -= 30;
  page.drawText("JUS", { x: bx, y: cy, size: 22, font: f.bold, color: EMERALD });
  page.drawText("Justin", { x: bx + 1, y: cy - 9, size: 7, font: f.med, color: MUTED });
  const naoW = f.bold.widthOfTextAtSize("NAO", 22);
  page.drawText("NAO", { x: mainRight - naoW, y: cy, size: 22, font: f.bold, color: EMERALD });
  const naoLabW = f.med.widthOfTextAtSize("Naomie", 7);
  page.drawText("Naomie", { x: mainRight - naoLabW, y: cy - 9, size: 7, font: f.med, color: MUTED });
  // Trajectoire pointillée + avion (petit chevron).
  const midY = cy + 7;
  page.drawLine({
    start: { x: bx + naoW + 10, y: midY },
    end: { x: mainRight - naoW - 10, y: midY },
    thickness: 1,
    color: GOLD,
    dashArray: [1, 3],
  });
  const planeX = (bx + naoW + 10 + mainRight - naoW - 10) / 2;
  page.drawSvgPath("M0 0 L10 -3 L0 -6 L2 -3 Z", {
    x: planeX - 5,
    y: midY + 3,
    color: GOLD,
    scale: 1,
  });

  // Grille d'infos : DATE / EMBARQ / PORTE / TABLE
  cy -= 26;
  const cols: { l: string; v: string; c: ReturnType<typeof rgb>; big?: boolean }[] = [
    { l: "DATE", v: "22 AOÛT 2026", c: INK },
    { l: "EMBARQ.", v: "10:00", c: INK },
    { l: "PORTE", v: gateNo(guest.token), c: INK },
    { l: "TABLE", v: tableValue(guest), c: EMERALD, big: true },
  ];
  const colW = mainW / 4;
  cols.forEach((c, i) => {
    const cxp = bx + i * colW;
    page.drawText(c.l, { x: cxp, y: cy, size: 5.5, font: f.med, color: MUTED });
    drawFit(page, c.v, cxp, cy - 11, colW - 3, c.big ? 10 : 9, f.semi, c.c);
  });

  // Code-barres
  cy -= 34;
  const bars = barcodeBars(guest.token, 48);
  let cxb = bx;
  const bh = 12;
  for (const b of bars) {
    const bw = b.w * 1.3;
    if (cxb + bw > mainRight) break;
    if (b.ink) page.drawRectangle({ x: cxb, y: cy, width: bw, height: bh, color: INK });
    cxb += bw + 1;
  }

  // ---- Talon ----
  const sx = xsplit + 12;
  const sRight = right - 12;
  let sy = top - hb - 14;
  page.drawText("BOARDING PASS", { x: sx, y: sy, size: 7, font: f.bold, color: EMERALD });

  const qrSize = 60;
  sy -= 10;
  // Cartouche blanc derrière le QR.
  page.drawRectangle({
    x: sx - 2,
    y: sy - qrSize - 2,
    width: qrSize + 4,
    height: qrSize + 4,
    color: rgb(1, 1, 1),
    borderColor: GOLD,
    borderWidth: 0.6,
  });
  page.drawImage(qr, { x: sx, y: sy - qrSize, width: qrSize, height: qrSize });

  // Table (rappel) à droite du QR.
  const tRx = sx + qrSize + 10;
  page.drawText("TABLE", { x: tRx, y: sy - 6, size: 5.5, font: f.med, color: MUTED });
  drawFit(page, tableValue(guest), tRx, sy - 17, sRight - tRx, 9, f.semi, EMERALD);
  page.drawText("PORTE", { x: tRx, y: sy - 34, size: 5.5, font: f.med, color: MUTED });
  page.drawText(gateNo(guest.token), { x: tRx, y: sy - 45, size: 9, font: f.semi, color: INK });

  // Fioriture bas de talon.
  drawFit(page, "Justin & Naomie", sx, y + 20, sRight - sx, 15, f.script, GOLD);
  page.drawText("22 · 08 · 2026", { x: sx, y: y + 10, size: 6, font: f.mono, color: MUTED });
}

// Repères de coupe d'une page (dans les marges, hors des cartes).
function drawCropMarks(page: PDFPage, onPage: number) {
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
    for (const yy of [topY, botY]) {
      line(CARD_X - MARK_GAP - MARK_LEN, yy, CARD_X - MARK_GAP, yy);
      line(CARD_X + CARD_W + MARK_GAP, yy, CARD_X + CARD_W + MARK_GAP + MARK_LEN, yy);
    }
  }
  for (const xx of [CARD_X, CARD_X + CARD_W]) {
    line(xx, PAGE_H - MARK_GAP, xx, PAGE_H - MARK_GAP - MARK_LEN);
    line(xx, MARK_GAP, xx, MARK_GAP + MARK_LEN);
  }
}

async function loadFont(origin: string, pdf: PDFDocument, file: string) {
  const buf = await fetch(`${origin}/fonts/${file}`).then((r) => r.arrayBuffer());
  return pdf.embedFont(buf, { subset: true });
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const isDownload = url.searchParams.get("download") === "1";
  const scope = url.searchParams.get("scope") === "all" ? "all" : "with-table";

  let guests = await listGuests();
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

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle("Cartes d'embarquement — Justin & Naomie");
  pdf.setSubject(`${guests.length} carte(s) · 4 par page A4`);

  const f: Fonts = {
    bold: await loadFont(origin, pdf, "Barlow-Bold.ttf"),
    semi: await loadFont(origin, pdf, "Barlow-SemiBold.ttf"),
    med: await loadFont(origin, pdf, "Barlow-Medium.ttf"),
    script: await loadFont(origin, pdf, "GreatVibes-Regular.ttf"),
    mono: await loadFont(origin, pdf, "SpaceMono-Regular.ttf"),
  };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  for (let idx = 0; idx < guests.length; idx++) {
    const slot = idx % PER_PAGE;
    if (idx > 0 && slot === 0) page = pdf.addPage([PAGE_W, PAGE_H]);

    const g = guests[idx];
    const qrPng = await QRCode.toBuffer(`${origin}/rsvp/${g.token}`, {
      type: "png",
      margin: 1,
      width: 150,
      errorCorrectionLevel: "M",
      color: { dark: "#083c30", light: "#ffffffff" },
    });
    const qr = await pdf.embedPng(qrPng);

    const topY = PAGE_H - MARGIN_Y - slot * (CARD_H + GAP);
    drawCard(page, f, { x: CARD_X, y: topY - CARD_H, w: CARD_W, h: CARD_H }, g, qr);

    if (slot === PER_PAGE - 1 || idx === guests.length - 1) {
      drawCropMarks(page, slot + 1);
    }
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
