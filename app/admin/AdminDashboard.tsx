"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Guest, GuestStatus } from "@/lib/db";
import { WEDDING, EMAIL_SUBJECT, inviteMessage } from "@/lib/wedding";
import {
  WhatsAppIcon,
  MailIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DownloadIcon,
  SearchIcon,
  LogoutIcon,
  CheckIcon,
  XIcon,
  UsersIcon,
  CalendarIcon,
  Sprig,
} from "@/app/components/icons";

type Filter = "all" | "confirmed" | "pending" | "declined";

// --- Helpers de partage ---------------------------------------------------

function guestUrl(origin: string, token: string): string {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/rsvp/${token}`;
}

function whatsappHref(origin: string, g: Guest): string {
  const text = encodeURIComponent(
    inviteMessage(g.full_name, guestUrl(origin, g.token))
  );
  const digits = (g.phone ?? "").replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

function mailtoHref(origin: string, g: Guest): string {
  const subject = encodeURIComponent(EMAIL_SUBJECT);
  const body = encodeURIComponent(
    inviteMessage(g.full_name, guestUrl(origin, g.token))
  );
  return `mailto:${g.email ?? ""}?subject=${subject}&body=${body}`;
}

// --- Composant principal --------------------------------------------------

export default function AdminDashboard({
  initialGuests,
  backend,
  origin,
}: {
  initialGuests: Guest[];
  backend: "postgres" | "file";
  origin: string;
}) {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<
    { mode: "add" } | { mode: "edit"; guest: Guest } | null
  >(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/guests", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setGuests(data.guests as Guest[]);
    }
  }, []);

  const stats = useMemo(() => {
    let confirmed = 0,
      declined = 0,
      pending = 0,
      heads = 0;
    for (const g of guests) {
      if (g.status === "confirmed") {
        confirmed++;
        heads += g.attending_count ?? 0;
      } else if (g.status === "declined") declined++;
      else pending++;
    }
    return { total: guests.length, confirmed, declined, pending, heads };
  }, [guests]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (filter !== "all" && g.status !== filter) return false;
      if (!q) return true;
      return (
        g.full_name.toLowerCase().includes(q) ||
        (g.category ?? "").toLowerCase().includes(q) ||
        (g.phone ?? "").toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [guests, search, filter]);

  const copyLink = useCallback(
    async (g: Guest) => {
      try {
        await navigator.clipboard.writeText(guestUrl(origin, g.token));
        showToast("Lien d'invitation copié");
      } catch {
        showToast("Impossible de copier le lien");
      }
    },
    [showToast, origin]
  );

  const removeGuest = useCallback(
    async (g: Guest) => {
      if (
        !window.confirm(
          `Supprimer ${g.full_name} de la liste des invités ?`
        )
      )
        return;
      const res = await fetch(`/api/guests/${g.id}`, { method: "DELETE" });
      if (res.ok) {
        setGuests((prev) => prev.filter((x) => x.id !== g.id));
        showToast("Invité supprimé");
      } else {
        showToast("Suppression impossible");
      }
    },
    [showToast]
  );

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="paper min-h-screen">
      {/* En-tête */}
      <header className="sticky top-0 z-30 border-b border-or/25 bg-creme/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-script text-3xl leading-none text-emeraude">
              J&nbsp;&amp;&nbsp;N
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-encre">
                Justin &amp; Nahomie
              </p>
              <p className="text-xs text-encre-doux">Tableau de bord des invités</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-or/30 bg-ivoire px-3 py-1.5 text-xs font-medium text-encre-doux sm:inline-flex">
              <CalendarIcon width={14} height={14} className="text-or-fonce" />
              {WEDDING.dateLabel}
            </span>
            <button onClick={logout} className="btn btn-ghost" aria-label="Se déconnecter">
              <LogoutIcon width={18} height={18} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Titre */}
        <div className="animate-rise text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-terracotta">
            Grace and Love for a Fresh Start
          </p>
          <h1 className="mt-2 text-3xl text-encre sm:text-4xl">
            Suivi des confirmations
          </h1>
          <div className="divider mt-3">
            <Sprig className="text-or" />
          </div>
        </div>

        {backend === "file" && (
          <div className="mt-6 rounded-xl border border-or/40 bg-or/10 px-4 py-3 text-sm text-or-fonce">
            <strong>Mode démonstration&nbsp;:</strong> aucune base de données
            n’est configurée. Les invités sont stockés localement et ne seront
            pas conservés une fois déployé. Ajoutez la variable{" "}
            <code className="rounded bg-or/20 px-1">DATABASE_URL</code> sur
            Vercel pour l’activer.
          </div>
        )}

        {/* Statistiques */}
        <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Invités" value={stats.total} tone="ink" />
          <StatCard label="Confirmés" value={stats.confirmed} tone="emeraude" />
          <StatCard label="En attente" value={stats.pending} tone="or" />
          <StatCard label="Déclinés" value={stats.declined} tone="terracotta" />
          <StatCard
            label="Personnes attendues"
            value={stats.heads}
            tone="emeraude"
            icon={<UsersIcon width={16} height={16} />}
            className="col-span-2 sm:col-span-1"
          />
        </section>

        {/* Barre d'outils */}
        <section className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <SearchIcon
              width={18}
              height={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-encre-doux"
            />
            <input
              className="field"
              style={{ paddingLeft: "2.75rem" }}
              placeholder="Rechercher un invité…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher un invité"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs value={filter} onChange={setFilter} stats={stats} />

            <ExportMenu />

            <button
              onClick={() => setModal({ mode: "add" })}
              className="btn btn-primary"
            >
              <PlusIcon width={18} height={18} />
              Ajouter un invité
            </button>
          </div>
        </section>

        {/* Liste des invités */}
        <section className="mt-5 space-y-3">
          {visible.length === 0 ? (
            <EmptyState hasGuests={guests.length > 0} onAdd={() => setModal({ mode: "add" })} />
          ) : (
            visible.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                origin={origin}
                onCopy={() => copyLink(g)}
                onEdit={() => setModal({ mode: "edit", guest: g })}
                onDelete={() => removeGuest(g)}
              />
            ))
          )}
        </section>

        <p className="mt-10 text-center text-xs text-encre-doux">
          {WEDDING.couple} · {WEDDING.dateLabel} · {WEDDING.city}
        </p>
      </main>

      {modal && (
        <GuestModal
          mode={modal.mode}
          guest={modal.mode === "edit" ? modal.guest : undefined}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            setModal(null);
            await refresh();
            showToast(msg);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="animate-fade fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-emeraude-fonce px-5 py-3 text-sm font-medium text-ivoire shadow-lg"
        >
          <CheckIcon width={16} height={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

// --- Sous-composants ------------------------------------------------------

function StatCard({
  label,
  value,
  tone,
  icon,
  className = "",
}: {
  label: string;
  value: number;
  tone: "ink" | "emeraude" | "or" | "terracotta";
  icon?: React.ReactNode;
  className?: string;
}) {
  const color =
    tone === "emeraude"
      ? "text-emeraude"
      : tone === "or"
        ? "text-or-fonce"
        : tone === "terracotta"
          ? "text-terracotta"
          : "text-encre";
  return (
    <div className={`card px-4 py-4 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-encre-doux">
        {icon}
        {label}
      </div>
      <p className={`mt-1 font-serif text-4xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function FilterTabs({
  value,
  onChange,
  stats,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  stats: { total: number; confirmed: number; pending: number; declined: number };
}) {
  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: stats.total },
    { key: "confirmed", label: "Confirmés", count: stats.confirmed },
    { key: "pending", label: "En attente", count: stats.pending },
    { key: "declined", label: "Déclinés", count: stats.declined },
  ];
  return (
    <div className="inline-flex rounded-full border border-or/25 bg-ivoire p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            value === t.key
              ? "bg-emeraude text-ivoire"
              : "text-encre-doux hover:text-encre"
          }`}
        >
          {t.label}
          <span className="ml-1 opacity-70">{t.count}</span>
        </button>
      ))}
    </div>
  );
}

function ExportMenu() {
  const items: { filter: string; label: string }[] = [
    { filter: "all", label: "Tous les invités" },
    { filter: "confirmed", label: "Confirmés uniquement" },
    { filter: "declined", label: "Déclinés uniquement" },
    { filter: "pending", label: "En attente uniquement" },
  ];
  return (
    <details className="relative">
      <summary className="btn btn-outline list-none">
        <DownloadIcon width={18} height={18} />
        Exporter
      </summary>
      <div className="card absolute right-0 z-40 mt-2 w-60 overflow-hidden p-1.5">
        <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-encre-doux">
          Fichier Excel / CSV
        </p>
        {items.map((it) => (
          <a
            key={it.filter}
            href={`/api/export?filter=${it.filter}`}
            className="block rounded-lg px-3 py-2 text-sm text-encre transition-colors hover:bg-emeraude/8"
          >
            {it.label}
          </a>
        ))}
      </div>
    </details>
  );
}

function StatusBadge({ status }: { status: GuestStatus }) {
  if (status === "confirmed")
    return (
      <span className="badge badge-confirmed">
        <span className="badge-dot" /> Confirmé
      </span>
    );
  if (status === "declined")
    return (
      <span className="badge badge-declined">
        <span className="badge-dot" /> Décliné
      </span>
    );
  return (
    <span className="badge badge-pending">
      <span className="badge-dot" /> En attente
    </span>
  );
}

function GuestRow({
  guest: g,
  origin,
  onCopy,
  onEdit,
  onDelete,
}: {
  guest: Guest;
  origin: string;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Identité */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-serif text-xl font-semibold text-encre">
            {g.full_name}
          </h3>
          {g.category && (
            <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-medium text-terracotta">
              {g.category}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-encre-doux">
          <span>
            {g.invited_count} {g.invited_count > 1 ? "places" : "place"}
          </span>
          {g.phone && <span>· {g.phone}</span>}
          {g.email && <span className="truncate">· {g.email}</span>}
        </div>
        {g.status === "confirmed" && (
          <p className="mt-1 text-sm text-emeraude">
            {g.attending_count} personne{(g.attending_count ?? 0) > 1 ? "s" : ""} confirmée
            {(g.attending_count ?? 0) > 1 ? "s" : ""}
          </p>
        )}
        {g.message && (
          <p className="mt-1 max-w-prose text-sm italic text-encre-doux">
            « {g.message} »
          </p>
        )}
      </div>

      {/* Statut + actions */}
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <StatusBadge status={g.status} />
        <div className="flex items-center gap-1">
          <a
            href={whatsappHref(origin, g)}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn text-emeraude"
            title="Partager via WhatsApp"
            aria-label={`Envoyer l'invitation à ${g.full_name} via WhatsApp`}
          >
            <WhatsAppIcon />
          </a>
          <a
            href={mailtoHref(origin, g)}
            className="icon-btn text-terracotta"
            title="Partager par e-mail"
            aria-label={`Envoyer l'invitation à ${g.full_name} par e-mail`}
          >
            <MailIcon />
          </a>
          <button
            onClick={onCopy}
            className="icon-btn text-or-fonce"
            title="Copier le lien"
            aria-label={`Copier le lien d'invitation de ${g.full_name}`}
          >
            <LinkIcon />
          </button>
          <span className="mx-1 h-5 w-px bg-encre/10" />
          <button
            onClick={onEdit}
            className="icon-btn text-encre-doux"
            title="Modifier"
            aria-label={`Modifier ${g.full_name}`}
          >
            <PencilIcon />
          </button>
          <button
            onClick={onDelete}
            className="icon-btn text-encre-doux hover:text-terracotta"
            title="Supprimer"
            aria-label={`Supprimer ${g.full_name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasGuests,
  onAdd,
}: {
  hasGuests: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Sprig className="text-or" width={32} height={32} />
      <h3 className="font-serif text-2xl text-encre">
        {hasGuests ? "Aucun invité ne correspond" : "Votre liste est vide"}
      </h3>
      <p className="max-w-sm text-sm text-encre-doux">
        {hasGuests
          ? "Modifiez votre recherche ou le filtre pour retrouver un invité."
          : "Ajoutez vos premiers invités puis partagez-leur un lien personnel pour recueillir leurs réponses."}
      </p>
      {!hasGuests && (
        <button onClick={onAdd} className="btn btn-primary mt-1">
          <PlusIcon width={18} height={18} />
          Ajouter un invité
        </button>
      )}
    </div>
  );
}

// --- Modale ajout / édition ------------------------------------------------

function GuestModal({
  mode,
  guest,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  guest?: Guest;
  onClose: () => void;
  onSaved: (msg: string) => void | Promise<void>;
}) {
  const [fullName, setFullName] = useState(guest?.full_name ?? "");
  const [category, setCategory] = useState(guest?.category ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [invited, setInvited] = useState(guest?.invited_count ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      full_name: fullName,
      category,
      phone,
      email,
      invited_count: invited,
    };
    const res =
      mode === "add"
        ? await fetch("/api/guests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/guests/${guest!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
    if (res.ok) {
      await onSaved(mode === "add" ? "Invité ajouté" : "Invité mis à jour");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-encre/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className="animate-rise w-full max-w-lg rounded-t-2xl border border-or/30 bg-ivoire p-6 shadow-2xl sm:rounded-2xl sm:p-7"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-modal-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="guest-modal-title" className="font-serif text-2xl text-encre">
            {mode === "add" ? "Nouvel invité" : "Modifier l’invité"}
          </h2>
          <button onClick={onClose} className="icon-btn text-encre-doux" aria-label="Fermer">
            <XIcon />
          </button>
        </div>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label htmlFor="fn" className="field-label">
              Nom &amp; prénom(s) *
            </label>
            <input
              id="fn"
              className="field"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex. M. et Mme Padonou"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cat" className="field-label">
                Catégorie
              </label>
              <input
                id="cat"
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Famille, Amis, Collègues…"
              />
            </div>
            <div>
              <label htmlFor="inv" className="field-label">
                Nombre de places
              </label>
              <input
                id="inv"
                type="number"
                min={1}
                max={20}
                className="field"
                value={invited}
                onChange={(e) => setInvited(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ph" className="field-label">
              Téléphone (WhatsApp)
            </label>
            <input
              id="ph"
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 08 54 82 90"
              inputMode="tel"
            />
          </div>

          <div>
            <label htmlFor="em" className="field-label">
              E-mail
            </label>
            <input
              id="em"
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="invite@exemple.com"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-terracotta">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Enregistrement…" : mode === "add" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
