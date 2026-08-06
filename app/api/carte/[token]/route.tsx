import { getGuestByToken } from "@/lib/db";
import { buildInteriorImage } from "@/lib/cardImage";

export const dynamic = "force-dynamic";

// Aperçu image de l'INTÉRIEUR (portrait) avec le nom de l'invité.
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
  const origin = new URL(req.url).origin;
  return buildInteriorImage(origin, guest.full_name);
}
