"use client";

import { useState } from "react";
import { DownloadIcon } from "@/app/components/icons";
import { guestFileSlug } from "@/lib/wedding";

// Carte d'embarquement : choix du modèle (1 = Classique, 2 = Prestige) et du
// format (A4/A5), aperçu et téléchargement PDF. Thème « voyage » du mariage.
export default function BoardingPass({
  token,
  guestName,
}: {
  token: string;
  guestName: string;
}) {
  const [model, setModel] = useState<1 | 2 | 3 | 4>(3);
  const [format, setFormat] = useState<"a4" | "a5">("a4");

  const pdfHref = `/api/embarquement/${token}/pdf?download=1&model=${model}${
    format === "a5" ? "&format=a5" : ""
  }`;
  const fileName = `Carte-embarquement-${guestFileSlug(
    guestName
  )}-modele${model}-${format.toUpperCase()}.pdf`;

  const models = [
    { key: 3 as const, label: "Modèle 3", sub: "Ticket Or ★" },
    { key: 1 as const, label: "Modèle 1", sub: "Compagnie" },
    { key: 2 as const, label: "Modèle 2", sub: "Prestige" },
    { key: 4 as const, label: "Modèle 4", sub: "Épuré" },
  ];
  const modelLabel: Record<number, string> = {
    1: "Compagnie",
    2: "Prestige",
    3: "Ticket Or",
    4: "Épuré",
  };

  return (
    <div>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-terracotta">
        Embarquement immédiat
      </p>
      <h3 className="mt-1 text-center font-serif text-2xl text-encre">
        Carte d’embarquement
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-center text-sm text-encre-doux">
        Votre billet pour le grand jour. Choisissez votre modèle préféré.
      </p>

      {/* Choix du modèle */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {models.map((m) => (
          <button
            key={m.key}
            onClick={() => setModel(m.key)}
            aria-pressed={model === m.key}
            className={`flex flex-col items-center rounded-xl border-2 px-3 py-2 transition-colors ${
              model === m.key
                ? "border-emeraude bg-emeraude/8"
                : "border-or/25 hover:border-or/50"
            }`}
          >
            <span className="font-serif text-base text-encre">{m.label}</span>
            <span className="text-xs text-encre-doux">{m.sub}</span>
          </button>
        ))}
      </div>

      {/* Aperçu du billet (selon le modèle) */}
      <div className="mt-4 overflow-hidden rounded-xl border border-or/30 shadow-[var(--shadow-card)]">
        {/* Image générée dynamiquement (billet personnalisé). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/embarquement/${token}?model=${model}`}
          alt={`Carte d’embarquement — modèle ${modelLabel[model]}`}
          className="h-auto w-full"
        />
      </div>

      {/* Format + téléchargement */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-full border border-or/25 bg-ivoire p-1">
          {(
            [
              { key: "a4", label: "A4" },
              { key: "a5", label: "A5" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFormat(opt.key)}
              aria-pressed={format === opt.key}
              title={opt.key === "a4" ? "A4 (210×297 mm)" : "A5 (148×210 mm)"}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                format === opt.key
                  ? "bg-emeraude text-ivoire"
                  : "text-encre-doux hover:text-encre"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <a href={pdfHref} download={fileName} className="btn btn-gold">
          <DownloadIcon width={18} height={18} />
          Télécharger le billet (PDF)
        </a>
      </div>
    </div>
  );
}
