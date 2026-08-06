import { PDFDocument, rgb } from "pdf-lib";
import { getGuestByToken } from "@/lib/db";
import { guestFileSlug } from "@/lib/wedding";
import {
  buildInteriorImage,
  buildInteriorSpreadImage,
  SPREAD_W,
  SPREAD_H,
} from "@/lib/cardImage";

export const dynamic = "force-dynamic";

// Formats de page (points PDF). A4 par défaut, A5 en option (format carte).
//   - page 1 (face) et page 2 « côte à côte » : page paysage, plein cadre
//   - page 2 « portrait » : page portrait, plein cadre
const PAGE = {
  a4: { long: 842, short: 595 }, // A4 : 210×297 mm
  a5: { long: 595, short: 420 }, // A5 : 148×210 mm
};
const CREAM = rgb(0.984, 0.98, 0.953); // #fbfaf3, fond crème de l'intérieur

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
  const paysage = url.searchParams.get("layout") === "paysage";
  const format = url.searchParams.get("format") === "a5" ? "a5" : "a4";
  const { long: LONG, short: SHORT } = PAGE[format];

  // Page 1 : la face (image réelle, inchangée)
  const faceBuf = await fetch(`${origin}/carte_d_acces/face.jpeg`).then((r) =>
    r.arrayBuffer()
  );
  // Page 2 : l'intérieur (portrait ou côte à côte) + le nom de l'invité
  const interiorBuf = await (
    paysage
      ? await buildInteriorSpreadImage(origin, guest.full_name)
      : await buildInteriorImage(origin, guest.full_name)
  ).arrayBuffer();

  const pdf = await PDFDocument.create();
  pdf.setTitle("Invitation — Justin & Naomie");

  // Page 1 : la face, plein cadre (paysage)
  const faceImg = await pdf.embedJpg(faceBuf);
  const p1 = pdf.addPage([LONG, SHORT]);
  p1.drawImage(faceImg, { x: 0, y: 0, width: LONG, height: SHORT });

  const interiorImg = await pdf.embedPng(interiorBuf);
  if (paysage) {
    // Page paysage (même taille que la couverture), volet pleine largeur
    // centré, marges crème → impression homogène.
    const p2 = pdf.addPage([LONG, SHORT]);
    p2.drawRectangle({ x: 0, y: 0, width: LONG, height: SHORT, color: CREAM });
    const drawH = (LONG * SPREAD_H) / SPREAD_W;
    p2.drawImage(interiorImg, {
      x: 0,
      y: (SHORT - drawH) / 2,
      width: LONG,
      height: drawH,
    });
  } else {
    // Page portrait, intérieur plein cadre
    const p2 = pdf.addPage([SHORT, LONG]);
    p2.drawImage(interiorImg, { x: 0, y: 0, width: SHORT, height: LONG });
  }

  const bytes = await pdf.save();
  const suffix = paysage ? "cote-a-cote" : "portrait";
  const fileName = `Invitation-${guestFileSlug(guest.full_name)}-${suffix}-${format.toUpperCase()}.pdf`;

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
