import type { Metadata } from "next";
import { getGuestByToken } from "@/lib/db";
import { WEDDING } from "@/lib/wedding";
import { Sprig } from "@/app/components/icons";
import AccessCard from "@/app/components/AccessCard";
import BoardingPass from "@/app/components/BoardingPass";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte d'accès — Justin & Naomie",
  robots: { index: false, follow: false },
};

export default async function CartePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await getGuestByToken(token);

  if (!guest) {
    return (
      <main className="paper flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-md p-8 text-center">
          <Sprig className="mx-auto text-or" width={36} height={36} />
          <h1 className="mt-3 font-serif text-3xl text-encre">
            Invité introuvable
          </h1>
          <p className="mt-2 text-encre-doux">
            Ce lien de carte n’est plus valide.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="paper min-h-screen px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-terracotta">
            {WEDDING.couple} · {WEDDING.dateLabel}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-encre sm:text-4xl">
            {guest.full_name}
          </h1>
          <div className="divider mt-3">
            <Sprig className="text-or" />
          </div>
        </div>

        <section className="card mt-6 p-6 sm:p-8">
          <AccessCard token={guest.token} guestName={guest.full_name} />
        </section>

        <section className="card mt-6 p-6 sm:p-8">
          <BoardingPass token={guest.token} guestName={guest.full_name} />
        </section>
      </div>
    </main>
  );
}
