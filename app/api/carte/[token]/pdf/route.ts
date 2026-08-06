import { PDFDocument } from "pdf-lib";
import { getGuestByToken } from "@/lib/db";
import { buildInteriorImage, buildInteriorSpreadImage } from "@/lib/cardImage";

export const dynamic = "force-dynamic";

// Page 1 = la face (paysage). Page 2 = l'intérieur, selon le type choisi :
//   ?layout=paysage → 2 volets côte à côte (page 2 paysage)
//   sinon           → intérieur en portrait (page 2 portrait)
// Grand côté = 842pt (~A4), chaque page ajustée à son image (aucun vide).
const FACE_PAGE = { w: 842, h: 598 }; // face 1280×909
const INT_PORTRAIT = { w: 598, h: 842 }; // intérieur 909×1280
const INT_PAYSAGE = { w: 842, h: 300 }; // spread 1818×648

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

  const faceImg = await pdf.embedJpg(faceBuf);
  const p1 = pdf.addPage([FACE_PAGE.w, FACE_PAGE.h]);
  p1.drawImage(faceImg, { x: 0, y: 0, width: FACE_PAGE.w, height: FACE_PAGE.h });

  const size = paysage ? INT_PAYSAGE : INT_PORTRAIT;
  const interiorImg = await pdf.embedPng(interiorBuf);
  const p2 = pdf.addPage([size.w, size.h]);
  p2.drawImage(interiorImg, { x: 0, y: 0, width: size.w, height: size.h });

  const bytes = await pdf.save();
  const suffix = paysage ? "cote-a-cote" : "portrait";

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="invitation-justin-naomie-${suffix}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
