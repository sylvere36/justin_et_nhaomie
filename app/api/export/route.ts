import { isAuthenticated } from "@/lib/auth";
import { listGuests, type Guest, type GuestStatus } from "@/lib/db";

const STATUS_LABEL: Record<GuestStatus, string> = {
  confirmed: "Confirmé",
  declined: "Décliné",
  pending: "En attente",
};

function csvEscape(value: string | number | null): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "all";

  let guests = await listGuests();
  if (filter === "confirmed" || filter === "declined" || filter === "pending") {
    guests = guests.filter((g) => g.status === filter);
  }

  const headers = [
    "Nom complet",
    "Catégorie",
    "Téléphone",
    "Email",
    "Places invitées",
    "Statut",
    "Personnes présentes",
    "Message",
    "Répondu le",
  ];

  const rows = guests.map((g: Guest) =>
    [
      g.full_name,
      g.category ?? "",
      g.phone ?? "",
      g.email ?? "",
      g.invited_count,
      STATUS_LABEL[g.status],
      g.attending_count ?? "",
      g.message ?? "",
      formatDate(g.responded_at),
    ]
      .map(csvEscape)
      .join(";")
  );

  // Ligne de total pour les personnes réellement attendues
  const totalAttending = guests.reduce(
    (sum, g) => sum + (g.status === "confirmed" ? g.attending_count ?? 0 : 0),
    0
  );
  const footer = [
    "TOTAL",
    "",
    "",
    "",
    "",
    `${guests.length} invité(s)`,
    totalAttending,
    "",
    "",
  ]
    .map(csvEscape)
    .join(";");

  // BOM UTF-8 pour un affichage correct des accents dans Excel.
  const bom = "﻿";
  const content = bom + [headers.join(";"), ...rows, footer].join("\r\n");

  const suffix =
    filter === "confirmed"
      ? "confirmes"
      : filter === "declined"
        ? "declines"
        : filter === "pending"
          ? "en-attente"
          : "tous";

  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invites-mariage-justin-nahomie-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
