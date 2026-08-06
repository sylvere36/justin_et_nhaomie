"use client";

import { useState } from "react";
import { DownloadIcon } from "@/app/components/icons";
import { guestFileSlug } from "@/lib/wedding";

// Carte d'accès : aperçu (couverture + intérieur avec le nom), choix de la
// disposition (Portrait / Côte à côte) et téléchargement du PDF (2 pages).
// Utilisée par l'écran de confirmation de l'invité ET par l'espace des fiancés.
export default function AccessCard({
  token,
  guestName,
}: {
  token: string;
  guestName: string;
}) {
  const [layout, setLayout] = useState<"portrait" | "paysage">("portrait");
  const suffix = layout === "paysage" ? "?layout=paysage" : "";
  const pdfHref = `/api/carte/${token}/pdf?download=1${
    layout === "paysage" ? "&layout=paysage" : ""
  }`;
  const fileName = `Invitation-${guestFileSlug(guestName)}-${
    layout === "paysage" ? "cote-a-cote" : "portrait"
  }.pdf`;

  return (
    <div>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-terracotta">
        Passeport d’invité
      </p>
      <h3 className="mt-1 text-center font-serif text-2xl text-encre">
        Carte d’accès numérique
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-center text-sm text-encre-doux">
        À présenter à l’entrée de la réception — imprimée ou sur le téléphone. Le
        PDF contient 2 pages : la couverture et l’invitation.
      </p>

      {/* Choix de la disposition de l'intérieur (page 2 du PDF) */}
      <div className="mt-4 flex justify-center">
        <div className="inline-flex rounded-full border border-or/25 bg-ivoire p-1">
          {(
            [
              { key: "portrait", label: "Portrait" },
              { key: "paysage", label: "Côte à côte" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setLayout(opt.key)}
              aria-pressed={layout === opt.key}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                layout === opt.key
                  ? "bg-emeraude text-ivoire"
                  : "text-encre-doux hover:text-encre"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu : couverture + intérieur (selon la disposition choisie) */}
      <div className="mx-auto mt-4 flex w-full max-w-[340px] flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-or/30 shadow-[var(--shadow-card)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/carte_d_acces/face.jpeg"
            alt="Couverture de l’invitation"
            width={1280}
            height={909}
            className="h-auto w-full"
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-or/30 shadow-[var(--shadow-card)]">
          {/* Image générée dynamiquement (intérieur + nom de l'invité). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/carte/${token}${suffix}`}
            alt="Intérieur de l’invitation avec le nom"
            className="h-auto w-full"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <a href={pdfHref} download={fileName} className="btn btn-gold">
          <DownloadIcon width={18} height={18} />
          Télécharger le PDF
        </a>
      </div>
    </div>
  );
}
