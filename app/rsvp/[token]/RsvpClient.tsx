"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { GuestStatus } from "@/lib/db";
import { WEDDING, PROGRAM } from "@/lib/wedding";
import {
  CheckIcon,
  XIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  DownloadIcon,
  Sprig,
} from "@/app/components/icons";

interface PublicGuest {
  full_name: string;
  invited_count: number;
  status: GuestStatus;
  attending_count: number | null;
  message: string | null;
}

export default function RsvpClient({
  token,
  guest,
}: {
  token: string;
  guest: PublicGuest;
}) {
  return (
    <main className="paper min-h-screen overflow-hidden">
      <Hero />

      <div className="mx-auto max-w-2xl px-5 pb-20">
        <Invitation name={guest.full_name} />
        <Countdown />
        <Program />
        <RsvpForm token={token} guest={guest} />
        <Footer />
      </div>
    </main>
  );
}

// --- Hero -----------------------------------------------------------------

function Hero() {
  return (
    <header className="relative px-5 pt-12 pb-6 text-center">
      <p className="animate-fade text-xs font-semibold uppercase tracking-[0.4em] text-terracotta">
        Vous êtes convié(e)
      </p>

      <p
        className="font-script animate-rise mt-4 text-6xl leading-none text-emeraude sm:text-7xl"
        style={{ animationDelay: "80ms" }}
      >
        {WEDDING.couple}
      </p>

      <div className="divider mt-4">
        <Sprig className="text-or" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-encre-doux">
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon width={15} height={15} className="text-or-fonce" />
          {WEDDING.dateLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon width={15} height={15} className="text-or-fonce" />
          {WEDDING.city}
        </span>
      </div>

      {/* Portrait du couple, encadré façon faire-part */}
      <div
        className="animate-rise mx-auto mt-8 w-full max-w-[19rem]"
        style={{ animationDelay: "160ms" }}
      >
        <div className="overflow-hidden rounded-t-[10rem] rounded-b-3xl border border-or/40 bg-ivoire p-2 shadow-[var(--shadow-card)]">
          <Image
            src="/couple.jpg"
            alt="Justin et Naomie"
            width={1000}
            height={1500}
            priority
            sizes="(max-width: 640px) 90vw, 320px"
            className="h-auto w-full rounded-t-[9rem] rounded-b-2xl object-cover"
          />
        </div>
      </div>

      <p className="mt-6 font-serif text-lg italic text-emeraude">
        {WEDDING.theme}
      </p>
    </header>
  );
}

// --- Invitation -----------------------------------------------------------

function Invitation({ name }: { name: string }) {
  return (
    <section className="card mt-8 p-6 text-center sm:p-8">
      <h2 className="font-serif text-2xl text-encre">Cher(e) {name},</h2>
      <p className="mx-auto mt-3 max-w-prose leading-relaxed text-encre-doux">
        C’est avec une immense joie et le cœur rempli de gratitude que nous vous
        convions à célébrer notre union. Votre présence à nos côtés, en ce jour
        béni, sera pour nous le plus précieux des cadeaux.
      </p>
      <p className="mt-3 leading-relaxed text-encre-doux">
        Nous serions honorés de partager avec vous ce nouveau départ, placé sous
        le signe de la grâce et de l’amour.
      </p>
      <p className="font-script mt-4 text-3xl text-terracotta">
        Justin &amp; Naomie
      </p>
    </section>
  );
}

// --- Compte à rebours -----------------------------------------------------

function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(WEDDING.dateISO).getTime();
  const diff = now === null ? 0 : target - now;

  if (now !== null && diff <= 0) {
    return (
      <section className="mt-6 text-center">
        <p className="font-serif text-2xl text-emeraude">
          C’est le grand jour !
        </p>
      </section>
    );
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const units = [
    { v: d, label: "Jours" },
    { v: h, label: "Heures" },
    { v: m, label: "Minutes" },
    { v: s, label: "Secondes" },
  ];

  return (
    <section className="mt-8">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-encre-doux">
        Plus que
      </p>
      <div className="mx-auto mt-3 grid max-w-md grid-cols-4 gap-2 sm:gap-3">
        {units.map((u) => (
          <div key={u.label} className="card px-1 py-3 text-center">
            <p className="font-serif text-3xl font-semibold text-emeraude sm:text-4xl tabular-nums">
              {now === null ? "—" : String(u.v).padStart(2, "0")}
            </p>
            <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-encre-doux">
              {u.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Programme ------------------------------------------------------------

function Program() {
  return (
    <section className="mt-10">
      <h2 className="text-center font-serif text-2xl text-encre">
        Déroulé de la journée
      </h2>
      <div className="divider mt-3">
        <Sprig className="text-or" width={20} height={20} />
      </div>

      <ol className="mt-5 space-y-1">
        {PROGRAM.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-ivoire"
          >
            <div className="flex w-16 flex-none items-center gap-1.5 pt-0.5">
              <ClockIcon width={13} height={13} className="text-or-fonce" />
              <span className="text-sm font-semibold text-emeraude tabular-nums">
                {item.time}
              </span>
            </div>
            <div>
              <p className="font-serif text-lg leading-tight text-encre">
                {item.label}
              </p>
              {item.place && (
                <p className="text-sm text-encre-doux">{item.place}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// --- Formulaire RSVP ------------------------------------------------------

function RsvpForm({ token, guest }: { token: string; guest: PublicGuest }) {
  const [choice, setChoice] = useState<"confirmed" | "declined" | null>(
    guest.status === "pending" ? null : guest.status
  );
  const [attending, setAttending] = useState(
    guest.attending_count && guest.attending_count > 0
      ? guest.attending_count
      : guest.invited_count
  );
  const [message, setMessage] = useState(guest.message ?? "");
  const [done, setDone] = useState(guest.status !== "pending");
  const [editing, setEditing] = useState(guest.status === "pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<GuestStatus>(guest.status);

  async function submit() {
    if (!choice) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: choice,
          attending_count: choice === "confirmed" ? attending : 0,
          message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Enregistrement impossible. Réessayez.");
        setSaving(false);
        return;
      }
      setSavedStatus(choice);
      setDone(true);
      setEditing(false);
      setSaving(false);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setSaving(false);
    }
  }

  // Écran de confirmation
  if (done && !editing) {
    return (
      <section id="rsvp" className="card mt-10 overflow-hidden p-7 text-center sm:p-9">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            savedStatus === "confirmed"
              ? "bg-emeraude/12 text-emeraude"
              : "bg-terracotta/12 text-terracotta"
          }`}
        >
          {savedStatus === "confirmed" ? (
            <CheckIcon width={30} height={30} />
          ) : (
            <XIcon width={30} height={30} />
          )}
        </div>

        <h2 className="mt-4 font-serif text-2xl text-encre">
          {savedStatus === "confirmed"
            ? "Merci, votre présence est confirmée !"
            : "Votre réponse est bien enregistrée"}
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-encre-doux">
          {savedStatus === "confirmed"
            ? `Nous avons hâte de vous accueillir${
                attending > 1 ? ` (${attending} personnes)` : ""
              } le ${WEDDING.dateLabel} à ${WEDDING.city}.`
            : "Nous regrettons votre absence, mais nous vous portons dans nos pensées. Merci d’avoir pris le temps de répondre."}
        </p>

        {message && (
          <p className="mx-auto mt-4 max-w-sm rounded-xl bg-creme px-4 py-3 text-sm italic text-encre-doux">
            « {message} »
          </p>
        )}

        {savedStatus === "confirmed" && <AccessCard token={token} />}

        <button
          onClick={() => setEditing(true)}
          className="btn btn-ghost mx-auto mt-6"
        >
          Modifier ma réponse
        </button>
      </section>
    );
  }

  // Formulaire
  return (
    <section id="rsvp" className="card mt-10 p-6 sm:p-8">
      <h2 className="text-center font-serif text-2xl text-encre">
        Confirmez votre présence
      </h2>
      <p className="mt-1 text-center text-sm text-encre-doux">
        Merci de nous répondre avant le mariage.
      </p>

      {/* Choix */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("confirmed")}
          className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-5 text-lg font-medium transition-all ${
            choice === "confirmed"
              ? "border-emeraude bg-emeraude text-ivoire shadow-[var(--shadow-soft)]"
              : "border-emeraude/25 bg-ivoire text-emeraude hover:border-emeraude/60"
          }`}
          aria-pressed={choice === "confirmed"}
        >
          <CheckIcon width={22} height={22} />
          Je serai présent(e)
        </button>
        <button
          type="button"
          onClick={() => setChoice("declined")}
          className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-5 text-lg font-medium transition-all ${
            choice === "declined"
              ? "border-terracotta bg-terracotta text-ivoire shadow-[var(--shadow-soft)]"
              : "border-terracotta/25 bg-ivoire text-terracotta hover:border-terracotta/60"
          }`}
          aria-pressed={choice === "declined"}
        >
          <XIcon width={22} height={22} />
          Je ne pourrai pas venir
        </button>
      </div>

      {/* Détails si présent */}
      {choice === "confirmed" && guest.invited_count > 1 && (
        <div className="animate-fade mt-5">
          <label className="field-label">Combien serez-vous ?</label>
          <div className="flex items-center gap-3">
            <Stepper
              value={attending}
              min={1}
              max={guest.invited_count}
              onChange={setAttending}
            />
            <span className="text-sm text-encre-doux">
              sur {guest.invited_count} place
              {guest.invited_count > 1 ? "s" : ""} réservée
              {guest.invited_count > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Message */}
      {choice && (
        <div className="animate-fade mt-5">
          <label htmlFor="msg" className="field-label">
            Un petit mot pour les mariés (facultatif)
          </label>
          <textarea
            id="msg"
            rows={3}
            className="field resize-none"
            placeholder="Vos vœux, une précision…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-terracotta">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!choice || saving}
        className="btn btn-gold mt-6 w-full"
      >
        {saving ? "Envoi…" : "Envoyer ma réponse"}
      </button>
    </section>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-encre/15 bg-ivoire">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="icon-btn text-emeraude disabled:opacity-40"
        aria-label="Retirer une personne"
      >
        <span className="text-xl leading-none">−</span>
      </button>
      <span className="w-10 text-center font-serif text-2xl font-semibold text-encre tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="icon-btn text-emeraude disabled:opacity-40"
        aria-label="Ajouter une personne"
      >
        <span className="text-xl leading-none">+</span>
      </button>
    </div>
  );
}

// --- Carte d'accès numérique ----------------------------------------------

function AccessCard({ token }: { token: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="mt-8 border-t border-or/20 pt-7">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-terracotta">
        Votre passeport d’invité
      </p>
      <h3 className="mt-1 font-serif text-2xl text-encre">
        Carte d’accès numérique
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-encre-doux">
        Présentez-la à l’entrée de la réception — imprimée ou sur votre
        téléphone.
      </p>

      <div
        className="relative mx-auto mt-5 w-full max-w-[320px] overflow-hidden rounded-xl border border-or/30 shadow-[var(--shadow-card)]"
        style={{ aspectRatio: "909 / 1925" }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-emeraude-fonce text-sm text-ivoire/70">
            Génération de la carte…
          </div>
        )}
        {/* Image générée dynamiquement côté serveur (style passeport). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/carte/${token}`}
          alt="Carte d’accès numérique de Justin & Naomie"
          width={1000}
          height={1500}
          onLoad={() => setLoaded(true)}
          className="h-auto w-full"
        />
      </div>

      <div className="mt-5 flex justify-center">
        <a
          href={`/api/carte/${token}?download=1`}
          download
          className="btn btn-gold"
        >
          <DownloadIcon width={18} height={18} />
          Télécharger ma carte
        </a>
      </div>
    </div>
  );
}

// --- Pied de page ---------------------------------------------------------

function Footer() {
  return (
    <footer className="mt-14 text-center">
      <div className="divider">
        <Sprig className="text-or" />
      </div>
      <p className="font-script mt-4 text-4xl text-emeraude">
        {WEDDING.couple}
      </p>
      <p className="mt-1 text-sm text-encre-doux">
        {WEDDING.dateLabel} · {WEDDING.city}
      </p>
      <p className="mt-3 text-xs uppercase tracking-[0.3em] text-terracotta">
        {WEDDING.theme}
      </p>
    </footer>
  );
}
