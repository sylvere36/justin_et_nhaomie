import { neon } from "@neondatabase/serverless";
import { randomUUID, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Modèle
// ---------------------------------------------------------------------------

export type GuestStatus = "pending" | "confirmed" | "declined";

export interface Guest {
  id: string;
  token: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  invited_count: number;
  category: string | null;
  status: GuestStatus;
  attending_count: number | null;
  message: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface NewGuest {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  invited_count?: number;
  category?: string | null;
}

export interface GuestPatch {
  full_name?: string;
  phone?: string | null;
  email?: string | null;
  invited_count?: number;
  category?: string | null;
}

export interface RsvpInput {
  status: "confirmed" | "declined";
  attending_count?: number | null;
  message?: string | null;
}

// ---------------------------------------------------------------------------
// Sélection du backend : Postgres si une URL est fournie, sinon fichier local.
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

const usePostgres = DATABASE_URL.length > 0;

export function storageBackend(): "postgres" | "file" {
  return usePostgres ? "postgres" : "file";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newToken(): string {
  return randomBytes(9).toString("base64url"); // ~12 caractères, URL-safe
}

// ---------------------------------------------------------------------------
// Backend Postgres (Neon serverless)
// ---------------------------------------------------------------------------

const sql = usePostgres ? neon(DATABASE_URL) : null;

let initPromise: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS guests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          token text UNIQUE NOT NULL,
          full_name text NOT NULL,
          phone text,
          email text,
          invited_count integer NOT NULL DEFAULT 1,
          category text,
          status text NOT NULL DEFAULT 'pending',
          attending_count integer,
          message text,
          responded_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function mapRow(r: Record<string, unknown>): Guest {
  return {
    id: String(r.id),
    token: String(r.token),
    full_name: String(r.full_name),
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    invited_count: Number(r.invited_count ?? 1),
    category: (r.category as string) ?? null,
    status: (r.status as GuestStatus) ?? "pending",
    attending_count:
      r.attending_count === null || r.attending_count === undefined
        ? null
        : Number(r.attending_count),
    message: (r.message as string) ?? null,
    responded_at: r.responded_at ? new Date(r.responded_at as string).toISOString() : null,
    created_at: new Date((r.created_at as string) ?? Date.now()).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Backend fichier (développement local uniquement)
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "guests.json");

async function readFileStore(): Promise<Guest[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Guest[];
  } catch {
    return [];
  }
}

async function writeFileStore(guests: Guest[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(guests, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// API publique — indépendante du backend
// ---------------------------------------------------------------------------

export async function listGuests(): Promise<Guest[]> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM guests ORDER BY created_at ASC`;
    return (rows as Record<string, unknown>[]).map(mapRow);
  }
  const store = await readFileStore();
  return store.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getGuestByToken(token: string): Promise<Guest | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM guests WHERE token = ${token} LIMIT 1`;
    const arr = rows as Record<string, unknown>[];
    return arr.length ? mapRow(arr[0]) : null;
  }
  const store = await readFileStore();
  return store.find((g) => g.token === token) ?? null;
}

export async function createGuest(input: NewGuest): Promise<Guest> {
  const token = newToken();
  const full_name = input.full_name.trim();
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim() || null;
  const invited_count = Math.max(1, Math.floor(input.invited_count ?? 1));
  const category = input.category?.trim() || null;

  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO guests (token, full_name, phone, email, invited_count, category)
      VALUES (${token}, ${full_name}, ${phone}, ${email}, ${invited_count}, ${category})
      RETURNING *
    `;
    return mapRow((rows as Record<string, unknown>[])[0]);
  }

  const store = await readFileStore();
  const guest: Guest = {
    id: randomUUID(),
    token,
    full_name,
    phone,
    email,
    invited_count,
    category,
    status: "pending",
    attending_count: null,
    message: null,
    responded_at: null,
    created_at: new Date().toISOString(),
  };
  store.push(guest);
  await writeFileStore(store);
  return guest;
}

export async function updateGuest(
  id: string,
  patch: GuestPatch
): Promise<Guest | null> {
  if (sql) {
    await ensureSchema();
    const current = await sql`SELECT * FROM guests WHERE id = ${id} LIMIT 1`;
    const arr = current as Record<string, unknown>[];
    if (!arr.length) return null;
    const g = mapRow(arr[0]);
    const next = {
      full_name: patch.full_name?.trim() || g.full_name,
      phone: patch.phone === undefined ? g.phone : patch.phone?.trim() || null,
      email: patch.email === undefined ? g.email : patch.email?.trim() || null,
      invited_count:
        patch.invited_count === undefined
          ? g.invited_count
          : Math.max(1, Math.floor(patch.invited_count)),
      category:
        patch.category === undefined ? g.category : patch.category?.trim() || null,
    };
    const updated = await sql`
      UPDATE guests SET
        full_name = ${next.full_name},
        phone = ${next.phone},
        email = ${next.email},
        invited_count = ${next.invited_count},
        category = ${next.category}
      WHERE id = ${id}
      RETURNING *
    `;
    return mapRow((updated as Record<string, unknown>[])[0]);
  }

  const store = await readFileStore();
  const idx = store.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  const g = store[idx];
  if (patch.full_name !== undefined) g.full_name = patch.full_name.trim() || g.full_name;
  if (patch.phone !== undefined) g.phone = patch.phone?.trim() || null;
  if (patch.email !== undefined) g.email = patch.email?.trim() || null;
  if (patch.invited_count !== undefined)
    g.invited_count = Math.max(1, Math.floor(patch.invited_count));
  if (patch.category !== undefined) g.category = patch.category?.trim() || null;
  store[idx] = g;
  await writeFileStore(store);
  return g;
}

export async function deleteGuest(id: string): Promise<boolean> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`DELETE FROM guests WHERE id = ${id} RETURNING id`;
    return (rows as unknown[]).length > 0;
  }
  const store = await readFileStore();
  const next = store.filter((g) => g.id !== id);
  const changed = next.length !== store.length;
  if (changed) await writeFileStore(next);
  return changed;
}

export async function submitRsvp(
  token: string,
  input: RsvpInput
): Promise<Guest | null> {
  const now = new Date().toISOString();
  if (sql) {
    await ensureSchema();
    const current = await sql`SELECT * FROM guests WHERE token = ${token} LIMIT 1`;
    const arr = current as Record<string, unknown>[];
    if (!arr.length) return null;
    const g = mapRow(arr[0]);
    const attending =
      input.status === "declined"
        ? 0
        : Math.min(
            Math.max(1, Math.floor(input.attending_count ?? 1)),
            g.invited_count
          );
    const rows = await sql`
      UPDATE guests SET
        status = ${input.status},
        attending_count = ${attending},
        message = ${input.message?.trim() || null},
        responded_at = ${now}
      WHERE token = ${token}
      RETURNING *
    `;
    return mapRow((rows as Record<string, unknown>[])[0]);
  }

  const store = await readFileStore();
  const idx = store.findIndex((g) => g.token === token);
  if (idx === -1) return null;
  const g = store[idx];
  g.status = input.status;
  g.attending_count =
    input.status === "declined"
      ? 0
      : Math.min(Math.max(1, Math.floor(input.attending_count ?? 1)), g.invited_count);
  g.message = input.message?.trim() || null;
  g.responded_at = now;
  store[idx] = g;
  await writeFileStore(store);
  return g;
}
