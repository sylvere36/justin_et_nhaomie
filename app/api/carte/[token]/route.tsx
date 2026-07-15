import { ImageResponse } from "next/og";
import { getGuestByToken } from "@/lib/db";

export const dynamic = "force-dynamic";

// La carte numérique reproduit EXACTEMENT les cartes physiques : on utilise
// les images réelles (face + intérieur) comme fond, et on ajoute seulement le
// nom de l'invité dans l'espace prévu (entre la date et la bande "boarding").

const GREEN = "#1e5949"; // vert du texte de la carte
const GOLD = "#d9a23a"; // or des accents

const W = 909; // largeur native de l'intérieur
const FACE_H = 645; // face (1280×909) mise à l'échelle sur 909 de large
const INT_H = 1280; // intérieur natif
const NAME_TOP = 506; // position du nom dans l'intérieur (date → bande MRZ)

async function toDataUrl(url: string, mime: string): Promise<string> {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
}

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

  const [faceData, intData, marcellus] = await Promise.all([
    toDataUrl(`${origin}/carte_d_acces/face.jpeg`, "image/jpeg"),
    toDataUrl(`${origin}/carte_d_acces/interieur.jpeg`, "image/jpeg"),
    fetch(`${origin}/fonts/Marcellus-Regular.ttf`).then((r) => r.arrayBuffer()),
  ]);

  const element = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: FACE_H + INT_H,
        backgroundColor: "#0b4d3d",
      }}
    >
      {/* Couverture (face) — image réelle, inchangée */}
      <img src={faceData} width={W} height={FACE_H} />

      {/* Intérieur — image réelle + nom de l'invité superposé */}
      <div style={{ position: "relative", display: "flex", width: W, height: INT_H }}>
        <img
          src={intData}
          width={W}
          height={INT_H}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        <div
          style={{
            position: "absolute",
            top: NAME_TOP,
            left: 0,
            width: W,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: GOLD,
                marginRight: 20,
              }}
            />
            <div
              style={{
                fontFamily: "Marcellus",
                fontSize: 33,
                letterSpacing: 1,
                color: GREEN,
              }}
            >
              {guest.full_name}
            </div>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: GOLD,
                marginLeft: 20,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const image = new ImageResponse(element, {
    width: W,
    height: FACE_H + INT_H,
    fonts: [{ name: "Marcellus", data: marcellus, weight: 400, style: "normal" }],
  });

  if (isDownload) {
    const headers = new Headers(image.headers);
    headers.set(
      "Content-Disposition",
      `attachment; filename="carte-invitation-justin-naomie.png"`
    );
    return new Response(image.body, { status: 200, headers });
  }
  return image;
}
