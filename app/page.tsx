import { redirect } from "next/navigation";

export default function Home() {
  // L'espace public des invités est /rsvp/[lien]. La racine mène à l'espace des fiancés.
  redirect("/admin");
}
