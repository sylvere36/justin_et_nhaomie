"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WEDDING } from "@/lib/wedding";
import { Sprig } from "@/app/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Connexion impossible.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <main className="paper flex min-h-screen flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="animate-rise text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-terracotta">
            Espace des fiancés
          </p>
          <p className="font-script mt-3 text-6xl text-emeraude">
            {WEDDING.couple}
          </p>
          <div className="divider mt-4">
            <Sprig className="text-or" />
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="card animate-rise mt-8 p-7 sm:p-8"
          style={{ animationDelay: "80ms" }}
        >
          <h1 className="text-center text-2xl text-encre">Connexion</h1>
          <p className="mt-1 text-center text-sm text-encre-doux">
            Gérez vos invités et suivez les confirmations.
          </p>

          <div className="mt-6">
            <label htmlFor="password" className="field-label">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn-primary mt-6 w-full"
          >
            {loading ? "Connexion…" : "Entrer"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-encre-doux">
          {WEDDING.themeFr}
        </p>
      </div>
    </main>
  );
}
