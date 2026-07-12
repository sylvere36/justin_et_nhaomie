import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAuthenticated } from "@/lib/auth";
import { listGuests, storageBackend } from "@/lib/db";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";

  const guests = await listGuests();
  return (
    <AdminDashboard
      initialGuests={guests}
      backend={storageBackend()}
      origin={origin}
    />
  );
}
