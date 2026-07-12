import { getGuestByToken } from "@/lib/db";
import { WEDDING } from "@/lib/wedding";
import { Sprig } from "@/app/components/icons";
import RsvpClient from "./RsvpClient";

export const dynamic = "force-dynamic";

export default async function RsvpPage({
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
            Invitation introuvable
          </h1>
          <p className="mt-2 text-encre-doux">
            Ce lien n’est plus valide ou a été mal recopié. Merci de contacter
            les mariés pour recevoir votre lien personnel.
          </p>
          <p className="font-script mt-5 text-4xl text-emeraude">
            {WEDDING.couple}
          </p>
        </div>
      </main>
    );
  }

  return (
    <RsvpClient
      token={guest.token}
      guest={{
        full_name: guest.full_name,
        invited_count: guest.invited_count,
        status: guest.status,
        attending_count: guest.attending_count,
        message: guest.message,
      }}
    />
  );
}
