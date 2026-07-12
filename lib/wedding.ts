// Informations officielles du mariage — source unique de vérité pour toute l'app.

export const WEDDING = {
  groom: "Justin",
  bride: "Nahomie",
  couple: "Justin & Nahomie",
  theme: "Grace and Love for a Fresh Start",
  themeFr: "La Grâce et l’Amour pour un Nouveau Départ",
  // Date/heure de début (mariage civil) — Yamoussoukro (UTC).
  dateISO: "2026-08-22T10:00:00+00:00",
  dateLabel: "Samedi 22 août 2026",
  city: "Yamoussoukro",
  hashtag: "#JustinAndNahomie2026",
} as const;

export interface ProgramItem {
  time: string;
  label: string;
  place?: string;
}

export const PROGRAM: ProgramItem[] = [
  { time: "10h00", label: "Mariage civil", place: "Mairie de Yamoussoukro" },
  { time: "11h30", label: "Mariage religieux", place: "Cathédrale Saint-Augustin" },
  { time: "13h00", label: "Séance de photos" },
  { time: "14h30", label: "Réception & repas", place: "Morofé" },
  { time: "16h30", label: "Bal" },
  { time: "17h30", label: "Remise des cadeaux" },
  { time: "18h00", label: "Gâteau & dragées" },
  { time: "18h30", label: "Barbecue" },
];

/**
 * Message d'invitation pré-rédigé, partagé via WhatsApp ou e-mail.
 * Reste chaleureux tout en étant élégant. Le fiancé peut l'éditer avant l'envoi.
 */
export function inviteMessage(name: string, url: string): string {
  return `Bonjour ${name},

Justin & Nahomie ont l'immense joie de vous convier à leur mariage, le samedi 22 août 2026 à Yamoussoukro.

« Grace and Love for a Fresh Start »

Votre présence compte énormément à nos yeux. Merci de bien vouloir confirmer votre présence via votre lien personnel :
${url}

Avec toute notre affection,
Justin & Nahomie`;
}

export const EMAIL_SUBJECT =
  "Invitation au mariage de Justin & Nahomie — 22 août 2026";

/** Construit l'URL RSVP publique d'un invité à partir de l'origine courante. */
export function rsvpUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/rsvp/${token}`;
}
