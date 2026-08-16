import { PDFDocument, rgb } from "pdf-lib";
import { getGuestByToken } from "@/lib/db";
import { guestFileSlug } from "@/lib/wedding";
import { buildBoardingPass, BP_W, BP_H } from "@/lib/boardingPass";

export const dynamic = "force-dynamic";

// Carte d'embarquement en PDF (1 page paysage), le billet centré sur la page,
// fond assorti au modèle. A4 par défaut, A5 en option.
const PAGE = {
  a4: { long: 842, short: 595 },
  a5: { long: 595, short: 420 },
};
const CREAM = rgb(0.98, 0.961, 0.918); // #faf5ea (modèle 1)
const EMERALD = rgb(0.055, 0.42, 0.33); // #0e6b54 (modèle 2)

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const guest = await getGuestByToken(token);
  if (!guest) {
    return new Response("Carte introuvable", { status: 404 });
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const isDownload = url.searchParams.get("download") === "1";
  const m = Number(url.searchParams.get("model"));
  const model = m === 2 || m === 3 || m === 4 ? m : 1;
  const format = url.searchParams.get("format") === "a5" ? "a5" : "a4";
  const { long: LONG, short: SHORT } = PAGE[format];

  const passBuf = await (
    await buildBoardingPass(origin, guest, model)
  ).arrayBuffer();

  const pdf = await PDFDocument.create();
  pdf.setTitle("Carte d'embarquement — Justin & Naomie");

  const page = pdf.addPage([LONG, SHORT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: LONG,
    height: SHORT,
    color: model === 2 ? EMERALD : CREAM,
  });

  const img = await pdf.embedPng(passBuf);
  const margin = format === "a5" ? 20 : 30;
  const scale = Math.min((LONG - margin * 2) / BP_W, (SHORT - margin * 2) / BP_H);
  const w = BP_W * scale;
  const h = BP_H * scale;
  page.drawImage(img, { x: (LONG - w) / 2, y: (SHORT - h) / 2, width: w, height: h });

  const bytes = await pdf.save();
  const fileName = `Carte-embarquement-${guestFileSlug(guest.full_name)}-modele${model}-${format.toUpperCase()}.pdf`;

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
