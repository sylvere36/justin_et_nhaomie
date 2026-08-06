import { getGuestByToken } from "@/lib/db";
import { buildInteriorImage, buildInteriorSpreadImage } from "@/lib/cardImage";

export const dynamic = "force-dynamic";

// Aperçu image de l'INTÉRIEUR avec le nom de l'invité.
//  - ?layout=paysage  → les 2 volets côte à côte (paysage)
//  - sinon            → intérieur en une page (portrait)
// Le téléchargement complet (2 pages) se fait via /api/carte/[token]/pdf.
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
  const layout = url.searchParams.get("layout");

  return layout === "paysage"
    ? buildInteriorSpreadImage(origin, guest.full_name)
    : buildInteriorImage(origin, guest.full_name);
}
