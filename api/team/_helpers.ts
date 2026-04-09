import type { VercelRequest } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY manquants");
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function getOwnerFromBearer(req: VercelRequest): Promise<{ id: string; email: string } | null> {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const sb = getSupabaseAnonClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { id: data.user.id, email: data.user.email || "owner" };
}
