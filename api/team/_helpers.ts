import type { VercelRequest } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Body JSON (Vercel peut parfois livrer une chaîne). */
export function parseJsonBody(req: VercelRequest): unknown {
  const b = req.body as unknown;
  if (b == null || b === "") return {};
  if (typeof b === "string") {
    const t = b.trim();
    if (!t) return {};
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return {};
    }
  }
  return b;
}

function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
}

/** getServerSupabase() : URL + service role */
export function teamApiServiceEnvError(): string | null {
  const url = supabaseUrl();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url) {
    return "SUPABASE_URL ou VITE_SUPABASE_URL doit être défini dans Vercel (Environment Variables).";
  }
  if (!service) {
    return "SUPABASE_SERVICE_ROLE_KEY manquant sur Vercel (requis pour /api/team/*). Ne pas exposer cette clé en VITE_.";
  }
  return null;
}

/** + TEAM_CODE_PEPPER (création membre, login code, changement de code) */
export function teamApiCodeEnvError(): string | null {
  const base = teamApiServiceEnvError();
  if (base) return base;
  const pepper = (process.env.TEAM_CODE_PEPPER || "").trim();
  if (!pepper) {
    return "TEAM_CODE_PEPPER manquant sur Vercel (même valeur secrète qu’en local).";
  }
  return null;
}

/** Client anon : Bearer JWT patron */
export function teamApiPatronAuthEnvError(): string | null {
  const url = supabaseUrl();
  const anon = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!url) {
    return "SUPABASE_URL ou VITE_SUPABASE_URL doit être défini.";
  }
  if (!anon) {
    return "SUPABASE_ANON_KEY manquant sur Vercel. Ajoutez la clé « anon public » Supabase (ou dupliquez VITE_SUPABASE_ANON_KEY sous le nom SUPABASE_ANON_KEY pour l’API).";
  }
  return null;
}

/** Création / édition membre (patron + service + pepper) */
export function teamApiCreateMemberEnvError(): string | null {
  const a = teamApiPatronAuthEnvError();
  if (a) return a;
  return teamApiCodeEnvError();
}

/** owner-slug (patron + service, sans pepper) */
export function teamApiOwnerSlugEnvError(): string | null {
  const a = teamApiPatronAuthEnvError();
  if (a) return a;
  return teamApiServiceEnvError();
}

export function getSupabaseAnonClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const anon = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function getOwnerFromBearer(req: VercelRequest): Promise<{ id: string; email: string } | null> {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const sb = getSupabaseAnonClient();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { id: data.user.id, email: data.user.email || "owner" };
}
