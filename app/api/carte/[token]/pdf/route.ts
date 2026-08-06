import { PDFDocument } from "pdf-lib";
import { getGuestByToken } from "@/lib/db";
import { buildInteriorImage } from "@/lib/cardImage";

export const dynamic = "force-dynamic";

// Dimensions des pages (points PDF), grand côté = 842pt (~A4), chaque page
// ajustée exactement à son image → aucun vide, prêt à imprimer.
const FACE_PAGE = { w: 842, h: 598 }; // face 1280×909 (paysage)
const INT_PAGE = { w: 598, h: 842 }; // intérieur 909×1280 (portrait)

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

  // Page 1 : la face (image réelle, inchangée)
  const faceBuf = await fetch(`${origin}/carte_d_acces/face.jpeg`).then((r) =>
    r.arrayBuffer()
  );
  // Page 2 : l'intérieur (image réelle) + le nom de l'invité
  const interiorBuf = await (
    await buildInteriorImage(origin, guest.full_name)
  ).arrayBuffer();

  const pdf = await PDFDocument.create();
  pdf.setTitle("Invitation — Justin & Naomie");

  const faceImg = await pdf.embedJpg(faceBuf);
  const p1 = pdf.addPage([FACE_PAGE.w, FACE_PAGE.h]);
  p1.drawImage(faceImg, {
    x: 0,
    y: 0,
    width: FACE_PAGE.w,
    height: FACE_PAGE.h,
  });

  const interiorImg = await pdf.embedPng(interiorBuf);
  const p2 = pdf.addPage([INT_PAGE.w, INT_PAGE.h]);
  p2.drawImage(interiorImg, {
    x: 0,
    y: 0,
    width: INT_PAGE.w,
    height: INT_PAGE.h,
  });

  const bytes = await pdf.save();

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="invitation-justin-naomie.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
