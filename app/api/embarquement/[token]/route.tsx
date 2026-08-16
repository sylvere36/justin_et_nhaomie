import { getGuestByToken } from "@/lib/db";
import { buildBoardingPass } from "@/lib/boardingPass";

export const dynamic = "force-dynamic";

// Aperçu image de la carte d'embarquement. ?model=2 pour le second modèle.
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
  const m = Number(url.searchParams.get("model"));
  const model = m === 2 || m === 3 || m === 4 ? m : 1;
  return buildBoardingPass(url.origin, guest, model);
}
