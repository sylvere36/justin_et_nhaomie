import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import type { Guest } from "./db";

// Cartes d'embarquement premium (thème voyage du mariage).
// Modèle 1 = « Compagnie » (clair, billet aérien) · Modèle 2 = « Prestige » (émeraude/or).

const EMERALD = "#0e6b54";
const EMERALD_DEEP = "#083c30";
const GOLD = "#c8a24a";
const GOLD_SOFT = "#e3c877";
const CREAM = "#faf5ea";
const IVORY = "#fffdf8";
const INK = "#22201c";
const MUTED = "#8c8577";
const PALE = "#bfe0d3";
const LINE = "#e7dfcd";

export const BP_W = 1600;
export const BP_H = 620;

const compassSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">
<g fill="none" stroke="${PALE}" stroke-width="1.6"><circle cx="110" cy="110" r="105"/><circle cx="110" cy="110" r="88" stroke-dasharray="2 5"/><circle cx="110" cy="110" r="34"/></g>
<g fill="${PALE}"><polygon points="110,10 120,104 110,110 100,104"/><polygon points="210,110 116,120 110,110 116,100"/><polygon points="110,210 100,116 110,110 120,116"/><polygon points="10,110 104,100 110,110 104,120"/></g>
<g fill="#8fc0ae"><polygon points="168,52 122,98 110,110 116,84"/><polygon points="168,168 116,136 110,110 134,116"/><polygon points="52,168 98,122 110,110 84,134"/><polygon points="52,52 84,98 110,110 98,84"/></g></svg>`;

function Plane({ size = 30, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
  );
}

function Roundel({ bg, plane }: { bg: string; plane: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: bg,
      }}
    >
      <Plane size={30} color={plane} />
    </div>
  );
}

function hashNum(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}
function flightNo(token: string): string {
  return `JN ${(hashNum(token) % 900) + 100}`;
}
function seatNo(token: string): string {
  const h = hashNum(token);
  return `${(h % 30) + 1}${"ABCDEF"[Math.floor(h / 64) % 6]}`;
}
function gateNo(token: string): string {
  return String((hashNum(token) % 24) + 1).padStart(2, "0");
}
function bookingRef(token: string): string {
  return hashNum(token).toString(36).toUpperCase().padStart(6, "X").slice(0, 6);
}
function barcode(token: string, count = 92): { w: number; ink: boolean }[] {
  const s = hashNum(token).toString(2) + hashNum(token + "x").toString(2) + hashNum(token + "y").toString(2);
  const bars: { w: number; ink: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const v = (s.charCodeAt(i % s.length) % 3) + 1;
    bars.push({ w: v, ink: i % 2 === 0 });
  }
  return bars;
}

async function loadFont(origin: string, file: string) {
  return fetch(`${origin}/fonts/${file}`).then((r) => r.arrayBuffer());
}

// --- Petits blocs réutilisables --------------------------------------------

function FlightArc({ stroke, plane }: { stroke: string; plane: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: 360, height: 92 }}>
      <svg width="360" height="92" viewBox="0 0 360 92" style={{ position: "absolute", top: 0, left: 0 }}>
        <path d="M8 80 Q180 2 352 80" fill="none" stroke={stroke} strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />
        <circle cx="8" cy="80" r="5" fill={stroke} />
        <circle cx="352" cy="80" r="5" fill="none" stroke={stroke} strokeWidth="2.5" />
      </svg>
      <div style={{ display: "flex", position: "absolute", top: 2, left: 165 }}>
        <Plane size={30} color={plane} />
      </div>
    </div>
  );
}

function Block({
  label,
  value,
  big = false,
  color = INK,
  labelColor = MUTED,
  align = "flex-start",
}: {
  label: string;
  value: string;
  big?: boolean;
  color?: string;
  labelColor?: string;
  align?: "flex-start" | "flex-end";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align }}>
      <div
        style={{
          fontFamily: "Barlow",
          fontWeight: 500,
          fontSize: 13,
          letterSpacing: 2,
          color: labelColor,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Barlow",
          fontWeight: big ? 700 : 600,
          fontSize: big ? 30 : 23,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// --- Modèle 1 : Compagnie (clair) ------------------------------------------

function Model1(guest: Guest, qr: string) {
  const bars = barcode(guest.token);
  return (
    <div
      style={{
        display: "flex",
        width: BP_W,
        height: BP_H,
        borderRadius: 30,
        overflow: "hidden",
        fontFamily: "Barlow",
      }}
    >
      {/* Souche principale */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1150,
          height: BP_H,
          backgroundColor: IVORY,
          padding: "30px 46px",
        }}
      >
        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Roundel bg={EMERALD} plane={GOLD_SOFT} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 24, letterSpacing: 1, color: EMERALD }}>
                JUSTIN &amp; NAOMIE
              </div>
              <div style={{ fontFamily: "Barlow", fontWeight: 500, fontSize: 12, letterSpacing: 4, color: GOLD }}>
                AIRLINES · PREMIÈRE CLASSE
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 26, letterSpacing: 3, color: EMERALD }}>
              BOARDING PASS
            </div>
            <div style={{ fontFamily: "Barlow", fontWeight: 500, fontSize: 13, letterSpacing: 3, color: MUTED }}>
              CARTE D&apos;EMBARQUEMENT
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: 1, backgroundColor: LINE, marginTop: 18 }} />

        {/* Itinéraire */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260 }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 78, letterSpacing: 2, color: EMERALD, lineHeight: 1 }}>
              JUS
            </div>
            <div style={{ fontFamily: "Barlow", fontWeight: 500, fontSize: 17, letterSpacing: 3, color: MUTED, marginTop: 4 }}>
              JUSTIN
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 600, fontSize: 14, letterSpacing: 3, color: GOLD }}>
              {flightNo(guest.token)}
            </div>
            <FlightArc stroke={GOLD} plane={EMERALD} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260 }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 78, letterSpacing: 2, color: EMERALD, lineHeight: 1 }}>
              NAO
            </div>
            <div style={{ fontFamily: "Barlow", fontWeight: 500, fontSize: 17, letterSpacing: 3, color: MUTED, marginTop: 4 }}>
              NAOMIE
            </div>
          </div>
        </div>

        {/* Passager */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22 }}>
          <Block label="Passager / Passenger" value={guest.full_name} />
          <Block label="Classe" value="INVITÉ D’HONNEUR" align="flex-end" />
        </div>

        {/* Blocs d'info */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <Block label="Date" value="22 AOÛT 2026" />
          <Block label="Embarquement" value="10:00" big color={EMERALD} />
          <Block label="Porte / Gate" value={gateNo(guest.token)} big color={EMERALD} />
          <Block label="Siège / Seat" value={seatNo(guest.token)} big color={EMERALD} />
          <Block label="Vol / Flight" value={flightNo(guest.token)} />
        </div>

        {/* Code-barres */}
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", height: 54 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ width: b.w * 2, height: 54, backgroundColor: b.ink ? INK : "transparent" }} />
            ))}
          </div>
          <div style={{ fontFamily: "SpaceMono", fontSize: 13, letterSpacing: 2, color: MUTED, marginLeft: 18 }}>
            {`JN${bookingRef(guest.token)} · 22AOUT2026`}
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div style={{ display: "flex", width: 0, borderLeft: `2px dashed ${LINE}` }} />

      {/* Talon */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 450,
          height: BP_H,
          backgroundColor: EMERALD,
          padding: "30px 36px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 20, letterSpacing: 3, color: GOLD_SOFT }}>
            BOARDING PASS
          </div>
          <Plane size={26} color={GOLD_SOFT} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <Block label="Passager" value={guest.full_name} color={CREAM} labelColor={PALE} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Block label="Vol" value={flightNo(guest.token)} color={CREAM} labelColor={PALE} />
            <Block label="Porte" value={gateNo(guest.token)} color={CREAM} labelColor={PALE} />
            <Block label="Siège" value={seatNo(guest.token)} color={CREAM} labelColor={PALE} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", padding: 11, backgroundColor: IVORY, borderRadius: 14 }}>
            <img src={qr} width={118} height={118} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 600, fontSize: 22, letterSpacing: 1, color: GOLD_SOFT }}>
              22 AOÛT 2026
            </div>
            <div style={{ fontFamily: "SpaceMono", fontSize: 13, letterSpacing: 2, color: CREAM, marginTop: 5 }}>
              {`JN${bookingRef(guest.token)}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Modèle 2 : Prestige (émeraude / or) -----------------------------------

function Model2(guest: Guest, qr: string, compass: string) {
  const bars = barcode(guest.token);
  return (
    <div
      style={{
        display: "flex",
        width: BP_W,
        height: BP_H,
        borderRadius: 30,
        overflow: "hidden",
        position: "relative",
        backgroundColor: EMERALD,
        backgroundImage: `radial-gradient(1300px 560px at 12% -25%, #15805f, ${EMERALD} 52%, ${EMERALD_DEEP})`,
        fontFamily: "Barlow",
        color: CREAM,
      }}
    >
      <img src={compass} width={560} height={560} style={{ position: "absolute", right: -130, bottom: -170, opacity: 0.13 }} />
      <div style={{ position: "absolute", top: 20, left: 20, right: 20, bottom: 20, border: `1px solid ${GOLD}`, borderRadius: 18 }} />

      {/* Souche principale */}
      <div style={{ display: "flex", flexDirection: "column", width: 1150, height: BP_H, padding: "36px 50px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Marcellus", fontSize: 27, letterSpacing: 6, color: GOLD_SOFT }}>
              CARTE D&apos;EMBARQUEMENT
            </div>
            <div style={{ fontFamily: "Barlow", fontWeight: 500, fontSize: 13, letterSpacing: 5, color: PALE, marginTop: 4 }}>
              BOARDING PASS · PREMIÈRE CLASSE
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Plane size={26} color={GOLD_SOFT} />
            <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 26, letterSpacing: 2, color: CREAM, marginLeft: 12 }}>
              {flightNo(guest.token)}
            </div>
          </div>
        </div>

        {/* Itinéraire */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 250 }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 74, letterSpacing: 2, color: GOLD_SOFT, lineHeight: 1 }}>
              JUS
            </div>
            <div style={{ fontFamily: "GreatVibes", fontSize: 34, color: CREAM, marginTop: -2 }}>Justin</div>
          </div>
          <FlightArc stroke={GOLD} plane={GOLD_SOFT} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 250 }}>
            <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 74, letterSpacing: 2, color: GOLD_SOFT, lineHeight: 1 }}>
              NAO
            </div>
            <div style={{ fontFamily: "GreatVibes", fontSize: 34, color: CREAM, marginTop: -2 }}>Naomie</div>
          </div>
        </div>

        <div style={{ display: "flex", height: 1, backgroundColor: "rgba(200,162,74,0.45)", marginTop: 14 }} />

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 16 }}>
          <Block label="Passager / Passenger" value={guest.full_name} color={CREAM} labelColor={GOLD_SOFT} />
          <Block label="Destination" value="YAMOUSSOUKRO" color={CREAM} labelColor={GOLD_SOFT} align="flex-end" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <Block label="Date" value="22 AOÛT 2026" color={CREAM} labelColor={GOLD_SOFT} />
          <Block label="Embarquement" value="10:00" big color={GOLD_SOFT} labelColor={PALE} />
          <Block label="Porte / Gate" value={gateNo(guest.token)} big color={GOLD_SOFT} labelColor={PALE} />
          <Block label="Siège / Seat" value={seatNo(guest.token)} big color={GOLD_SOFT} labelColor={PALE} />
          <Block label="Classe" value="INVITÉ D’HONNEUR" color={CREAM} labelColor={GOLD_SOFT} />
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", height: 50 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ width: b.w * 2, height: 50, backgroundColor: b.ink ? CREAM : "transparent" }} />
            ))}
          </div>
          <div style={{ fontFamily: "SpaceMono", fontSize: 13, letterSpacing: 2, color: PALE, marginLeft: 18 }}>
            {`JN${bookingRef(guest.token)} · 22AOUT2026`}
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div style={{ display: "flex", width: 0, borderLeft: `2px dashed ${GOLD}` }} />

      {/* Talon */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 450, height: BP_H, padding: "36px 36px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Barlow", fontWeight: 700, fontSize: 19, letterSpacing: 3, color: GOLD_SOFT }}>
            BOARDING PASS
          </div>
          <Plane size={24} color={GOLD_SOFT} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <Block label="Passager" value={guest.full_name} color={CREAM} labelColor={GOLD_SOFT} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Block label="Vol" value={flightNo(guest.token)} color={CREAM} labelColor={GOLD_SOFT} />
            <Block label="Porte" value={gateNo(guest.token)} color={CREAM} labelColor={GOLD_SOFT} />
            <Block label="Siège" value={seatNo(guest.token)} color={CREAM} labelColor={GOLD_SOFT} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", padding: 11, backgroundColor: IVORY, borderRadius: 14 }}>
            <img src={qr} width={116} height={116} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontFamily: "GreatVibes", fontSize: 34, color: GOLD_SOFT }}>Justin &amp; Naomie</div>
            <div style={{ fontFamily: "SpaceMono", fontSize: 12, letterSpacing: 2, color: CREAM, marginTop: 4 }}>
              22 · 08 · 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Assemblage ------------------------------------------------------------

export async function buildBoardingPass(
  origin: string,
  guest: Guest,
  model: 1 | 2
): Promise<ImageResponse> {
  const [barlow, barlowMed, barlowSemi, barlowBold, greatVibes, spaceMono, marcellus] =
    await Promise.all([
      loadFont(origin, "Barlow-Regular.ttf"),
      loadFont(origin, "Barlow-Medium.ttf"),
      loadFont(origin, "Barlow-SemiBold.ttf"),
      loadFont(origin, "Barlow-Bold.ttf"),
      loadFont(origin, "GreatVibes-Regular.ttf"),
      loadFont(origin, "SpaceMono-Regular.ttf"),
      loadFont(origin, "Marcellus-Regular.ttf"),
    ]);

  const qr = await QRCode.toDataURL(`${origin}/rsvp/${guest.token}`, {
    margin: 0,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: EMERALD_DEEP, light: "#00000000" },
  });

  const compass = `data:image/svg+xml;base64,${Buffer.from(compassSvg).toString("base64")}`;
  const element = model === 2 ? Model2(guest, qr, compass) : Model1(guest, qr);

  return new ImageResponse(element, {
    width: BP_W,
    height: BP_H,
    fonts: [
      { name: "Barlow", data: barlow, weight: 400, style: "normal" },
      { name: "Barlow", data: barlowMed, weight: 500, style: "normal" },
      { name: "Barlow", data: barlowSemi, weight: 600, style: "normal" },
      { name: "Barlow", data: barlowBold, weight: 700, style: "normal" },
      { name: "GreatVibes", data: greatVibes, weight: 400, style: "normal" },
      { name: "SpaceMono", data: spaceMono, weight: 400, style: "normal" },
      { name: "Marcellus", data: marcellus, weight: 400, style: "normal" },
    ],
  });
}
