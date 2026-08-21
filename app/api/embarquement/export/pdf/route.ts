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
// Reproduction fidèle du MODÈLE 3 (« Ticket Or ») choisi par le couple, dessiné
// directement (pas de Satori) pour rester rapide et fiable sur Vercel.
// Les coordonnées sont exprimées dans l'espace du modèle (1600×620) puis mises
// à l'échelle de la carte via k = largeur_carte / 1600.
// ---------------------------------------------------------------------------

// Couleurs (identiques au modèle 3).
const GOLD = rgb(0.784, 0.635, 0.29);
const GOLD_SOFT = rgb(0.89, 0.784, 0.467);
const EMERALD = rgb(0.055, 0.42, 0.329);
const EMERALD_DEEP = rgb(0.031, 0.235, 0.188);
const IVORY = rgb(1, 0.992, 0.973);
const CREAM = rgb(0.98, 0.961, 0.918);
const INK = rgb(0.133, 0.125, 0.11);
const MUTED = rgb(0.549, 0.522, 0.467);
const WHITE = rgb(1, 1, 1);
const MARK = rgb(0.72, 0.72, 0.72);

// Modèle (px).
const BP_W = 1600;
const BP_H = 620;

// Page A4 portrait (points) + géométrie 4 par page.
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_Y = 30;
const GAP = 16;
const PER_PAGE = 4;
const CARD_H = (PAGE_H - 2 * MARGIN_Y - (PER_PAGE - 1) * GAP) / PER_PAGE;
const CARD_W = (CARD_H * BP_W) / BP_H;
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
function barcode(t: string, n: number): { w: number; ink: boolean }[] {
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
};

// Chemin SVG de l'avion (viewBox 24×24), comme le composant <Plane>.
const PLANE =
  "M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z";

// Dessine une carte modèle 3 dans le rectangle {x,y,w,h}.
function drawCard(
  page: PDFPage,
  f: Fonts,
  box: { x: number; y: number; w: number; h: number },
  guest: Guest,
  qr: PDFImage
) {
  const { x, y, w } = box;
  const top = y + box.h;
  const k = w / BP_W; // échelle modèle → carte

  // Transforme une coordonnée modèle (origine haut-gauche, y vers le bas).
  const TX = (sx: number) => x + sx * k;
  const TYtop = (sy: number) => top - sy * k; // bord supérieur d'un élément

  // Rectangle en coordonnées modèle.
  const rect = (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    color: ReturnType<typeof rgb>,
    border?: { color: ReturnType<typeof rgb>; width: number }
  ) =>
    page.drawRectangle({
      x: TX(sx),
      y: top - (sy + sh) * k,
      width: sw * k,
      height: sh * k,
      color,
      borderColor: border?.color,
      borderWidth: border ? border.width * k : undefined,
    });

  // Texte : sy = haut du texte (modèle) ; baseline ≈ haut + 0.80·taille.
  const text = (
    t: string,
    sx: number,
    sy: number,
    sizePx: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
    opts: { align?: "left" | "right"; maxWpx?: number } = {}
  ) => {
    let size = sizePx * k;
    let tw = font.widthOfTextAtSize(t, size);
    const maxW = opts.maxWpx !== undefined ? opts.maxWpx * k : Infinity;
    while (tw > maxW && size > 3) {
      size -= 0.3;
      tw = font.widthOfTextAtSize(t, size);
    }
    const px = opts.align === "right" ? TX(sx) - tw : TX(sx);
    page.drawText(t, { x: px, y: top - (sy + sizePx * 0.8) * k, size, font, color });
  };

  // Bloc « label + valeur » du modèle.
  const block = (
    label: string,
    value: string,
    sx: number,
    sy: number,
    o: {
      big?: boolean;
      color?: ReturnType<typeof rgb>;
      align?: "left" | "right";
      maxWpx?: number;
    } = {}
  ) => {
    const color = o.color ?? INK;
    text(label, sx, sy, 13, f.med, MUTED, { align: o.align, maxWpx: o.maxWpx });
    text(value, sx, sy + 17, o.big ? 30 : 23, f.semi, color, {
      align: o.align,
      maxWpx: o.maxWpx,
    });
  };

  // Fond ivoire (coins droits pour la découpe).
  rect(0, 0, BP_W, BP_H, IVORY);

  // ---- Souche principale (largeur 1150) ----
  // Bande dorée + filet émeraude.
  rect(0, 0, 1150, 120, GOLD);
  rect(0, 120, 1150, 4, EMERALD);

  // Pastille émeraude + avion (roundel).
  page.drawCircle({ x: TX(74), y: TYtop(60), size: 28 * k, color: EMERALD });
  page.drawSvgPath(PLANE, {
    x: TX(74) - 15 * k,
    y: TYtop(60) + 15 * k,
    scale: (30 / 24) * k,
    color: GOLD_SOFT,
  });

  text("JUSTIN & NAOMIE", 120, 42, 30, f.bold, EMERALD_DEEP);
  text("AIRLINES · PREMIÈRE CLASSE", 120, 80, 13, f.semi, EMERALD);

  // Puce « PREMIÈRE » (émeraude), alignée à droite de la souche.
  const pillTxt = "PREMIÈRE";
  const pillTW = f.bold.widthOfTextAtSize(pillTxt, 20 * k);
  const pillW = pillTW + 2 * 18 * k;
  const pillRight = TX(1104);
  page.drawRectangle({
    x: pillRight - pillW,
    y: TYtop(77),
    width: pillW,
    height: 34 * k,
    color: EMERALD,
  });
  page.drawText(pillTxt, {
    x: pillRight - pillW + 18 * k,
    y: TYtop(77) + 10 * k,
    size: 20 * k,
    font: f.bold,
    color: GOLD_SOFT,
  });

  // Code-barres vertical (gauche du corps) : barres empilées, largeur 60.
  const vbars = barcode(guest.token + "v", 74);
  const vH = vbars.reduce((s, b) => s + b.w * 2, 0);
  let vy = 152 + (440 - vH) / 2;
  for (const b of vbars) {
    if (b.ink) rect(44, vy, 60, b.w * 2, INK);
    vy += b.w * 2;
  }

  // Colonne d'infos (x 142 → 1104), 4 lignes réparties.
  const cL = 142;
  const cR = 1104;
  block("Nom du passager / Passenger", guest.full_name, cL, 150, { maxWpx: 700 });
  block("De / From", "JUSTIN", cL, 250);
  block("Vol / Flight", flightNo(guest.token), cR, 250, { align: "right" });
  block("À / To", "NAOMIE", cL, 350);
  block("Date", "22 AOÛT 2026", cR, 350, { align: "right" });
  block("Porte / Gate", gateNo(guest.token), cL, 448, { big: true, color: EMERALD });
  block("Embarquement", "10:00", 560, 448, { big: true, color: EMERALD });
  block("Table", tableValue(guest), cR, 448, {
    big: true,
    color: EMERALD,
    align: "right",
    maxWpx: 330,
  });

  // Note + chevrons dorés (bas de souche).
  text("L'EMBARQUEMENT FERME 20 MINUTES AVANT LE DÉPART", cL, 566, 12, f.semi, MUTED);
  const noteW = f.semi.widthOfTextAtSize(
    "L'EMBARQUEMENT FERME 20 MINUTES AVANT LE DÉPART",
    12 * k
  );
  chevrons(TX(cL) + noteW + 14 * k, TX(cR), TYtop(560), 12 * k);

  // ---- Talon (x 1150 → 1600) ----
  rect(1150, 0, 450, BP_H, CREAM);
  // Perforation.
  page.drawLine({
    start: { x: TX(1150), y: TYtop(0) },
    end: { x: TX(1150), y: TYtop(BP_H) },
    thickness: 2 * k,
    color: GOLD,
    dashArray: [10 * k, 8 * k],
  });

  const sL = 1186;
  const sR = 1564;
  text("BOARDING PASS", sL, 32, 22, f.bold, EMERALD);
  page.drawSvgPath(PLANE, {
    x: TX(sR) - 24 * k,
    y: TYtop(28) + 24 * k,
    scale: k,
    color: GOLD,
  });

  block("Passager", guest.full_name, sL, 150, { maxWpx: 360 });
  block("Porte", gateNo(guest.token), sL, 250, { big: true, color: EMERALD });
  block("Embarq.", "10:00", sR, 250, { big: true, color: EMERALD, align: "right" });
  block("Table", tableValue(guest), sL, 332, { big: true, color: EMERALD, maxWpx: 360 });

  // QR encadré or + code-barres court.
  rect(1186, 430, 126, 126, IVORY, { color: GOLD, width: 1 });
  page.drawImage(qr, { x: TX(1197), y: top - (441 + 104) * k, width: 104 * k, height: 104 * k });
  const sbars = barcode(guest.token + "s", 40);
  const sH = sbars.reduce((s, b) => s + b.w * 2, 0);
  let sy2 = 493 - sH / 2;
  for (const b of sbars) {
    if (b.ink) rect(1440, sy2, 90, b.w * 2, INK);
    sy2 += b.w * 2;
  }

  // Chevrons bas de talon.
  chevrons(TX(sL), TX(sR), TYtop(584), 12 * k);

  // --- Chevrons dorés (hachures diagonales -45°) ---
  function chevrons(x0: number, x1: number, yTop: number, h: number) {
    const step = 20 * k;
    for (let xx = x0; xx < x1; xx += step) {
      const ex = Math.min(xx + h, x1);
      const ey = yTop - (ex - xx);
      page.drawLine({
        start: { x: xx, y: yTop },
        end: { x: ex, y: ey },
        thickness: 9 * k,
        color: GOLD,
      });
    }
  }
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
  };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  for (let idx = 0; idx < guests.length; idx++) {
    const slot = idx % PER_PAGE;
    if (idx > 0 && slot === 0) page = pdf.addPage([PAGE_W, PAGE_H]);

    const g = guests[idx];
    const qrPng = await QRCode.toBuffer(`${origin}/rsvp/${g.token}`, {
      type: "png",
      margin: 0,
      width: 150,
      errorCorrectionLevel: "M",
      color: { dark: "#083c30", light: "#fffdf8ff" },
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
