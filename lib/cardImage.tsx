import { ImageResponse } from "next/og";

// Génère l'image de l'INTÉRIEUR (portrait) avec le nom de l'invité superposé.
// Utilisée à la fois pour l'aperçu (image) et pour la page 2 du PDF.

const GREEN = "#1e5949"; // vert du texte de la carte
const GOLD = "#d9a23a"; // or des accents

export const INT_W = 909;
export const INT_H = 1280;
const NAME_TOP = 506; // emplacement du nom (entre la date et la bande MRZ)

// Dimensions du spread « côte à côte » (les 2 volets de l'intérieur).
export const HALF_W = 909;
export const HALF_H = 648;
export const SPREAD_W = HALF_W * 2; // 1818
export const SPREAD_H = HALF_H; // 648

async function toDataUrl(url: string, mime: string): Promise<string> {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
}

// Nom de l'invité superposé (points dorés + texte vert), centré sur une largeur.
function nameBadge(fullName: string, width: number) {
  return (
    <div
      style={{
        position: "absolute",
        top: NAME_TOP,
        left: 0,
        width,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD, marginRight: 20 }}
        />
        <div style={{ fontFamily: "Marcellus", fontSize: 33, letterSpacing: 1, color: GREEN }}>
          {fullName}
        </div>
        <div
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD, marginLeft: 20 }}
        />
      </div>
    </div>
  );
}

export async function buildInteriorImage(
  origin: string,
  fullName: string
): Promise<ImageResponse> {
  const [intData, marcellus] = await Promise.all([
    toDataUrl(`${origin}/carte_d_acces/interieur.jpeg`, "image/jpeg"),
    fetch(`${origin}/fonts/Marcellus-Regular.ttf`).then((r) => r.arrayBuffer()),
  ]);

  const element = (
    <div style={{ position: "relative", display: "flex", width: INT_W, height: INT_H }}>
      <img
        src={intData}
        width={INT_W}
        height={INT_H}
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      {nameBadge(fullName, INT_W)}
    </div>
  );

  return new ImageResponse(element, {
    width: INT_W,
    height: INT_H,
    fonts: [{ name: "Marcellus", data: marcellus, weight: 400, style: "normal" }],
  });
}

// Intérieur en « spread » paysage : Partie 1 (gauche, avec le nom) | Partie 2 (droite).
export async function buildInteriorSpreadImage(
  origin: string,
  fullName: string
): Promise<ImageResponse> {
  const [page1Data, page2Data, marcellus] = await Promise.all([
    toDataUrl(`${origin}/carte_d_acces/interieur_page1.jpg`, "image/jpeg"),
    toDataUrl(`${origin}/carte_d_acces/interieur_page2.jpg`, "image/jpeg"),
    fetch(`${origin}/fonts/Marcellus-Regular.ttf`).then((r) => r.arrayBuffer()),
  ]);

  const element = (
    <div style={{ display: "flex", width: SPREAD_W, height: SPREAD_H }}>
      <div style={{ position: "relative", display: "flex", width: HALF_W, height: HALF_H }}>
        <img
          src={page1Data}
          width={HALF_W}
          height={HALF_H}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        {nameBadge(fullName, HALF_W)}
      </div>
      <img src={page2Data} width={HALF_W} height={HALF_H} />
    </div>
  );

  return new ImageResponse(element, {
    width: SPREAD_W,
    height: SPREAD_H,
    fonts: [{ name: "Marcellus", data: marcellus, weight: 400, style: "normal" }],
  });
}
