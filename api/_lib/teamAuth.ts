import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, randomUUID } from "node:crypto";

type TeamMemberPublic = {
  id: string;
  owner_user_id: string;
  owner_slug: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
};

type TeamAuthOk<T> = { ok: true; data: T };
type TeamAuthErr = { ok: false; code: string; error: string };
type TeamAuthResult<T> = TeamAuthOk<T> | TeamAuthErr;

type BcryptApi = {
  hash: (s: string, rounds: number | string) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

let bcryptCache: BcryptApi | null = null;

/** Chargement paresseux : évite les plantages d’interop ESM/CJS sur Vercel au boot du module. */
async function bcryptLib(): Promise<BcryptApi> {
  if (bcryptCache) return bcryptCache;
  const m = await import("bcryptjs");
  const d = (m as { default?: BcryptApi }).default;
  bcryptCache = d && typeof d.hash === "function" ? d : (m as unknown as BcryptApi);
  return bcryptCache;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env ${name}`);
  return v.trim();
}

function getServerSupabase(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant (ou URL). En local : ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env " +
        "(Supabase → Project Settings → API → service_role). L’URL peut être SUPABASE_URL ou VITE_SUPABASE_URL.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function generateOwnerSlug(base: string): string {
  const clean = sanitizeSlug(base) || "owner";
  const suffix = randomBytes(2).toString("hex");
  return `${clean}-${suffix}`;
}

function validateCode4(rawCode: string): string | null {
  const code = String(rawCode || "").trim();
  return /^\d{4}$/.test(code) ? code : null;
}

function codeIndex(rawCode: string): string {
  const pepper = requireEnv("TEAM_CODE_PEPPER");
  return createHmac("sha256", pepper).update(rawCode).digest("hex");
}

async function hashCode(rawCode: string): Promise<string> {
  const bcrypt = await bcryptLib();
  return bcrypt.hash(rawCode, 10);
}

export async function ensureOwnerSlug(
  ownerUserId: string,
  ownerNameOrEmail: string,
): Promise<TeamAuthResult<string>> {
  try {
    const sb = getServerSupabase();
    const { data: found, error: readErr } = await sb
      .from("user_profiles")
      .select("owner_slug")
      .eq("id", ownerUserId)
      .maybeSingle();
    if (readErr) {
      return { ok: false, code: "DB_ERROR", error: readErr.message };
    }
    if (found?.owner_slug) {
      return { ok: true, data: String(found.owner_slug) };
    }
    const slug = generateOwnerSlug(ownerNameOrEmail);
    const { error: upsertErr } = await sb.from("user_profiles").upsert(
      { id: ownerUserId, owner_slug: slug, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (upsertErr) {
      return { ok: false, code: "DB_ERROR", error: upsertErr.message };
    }
    return { ok: true, data: slug };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}

export async function createTeamMemberSecure(input: {
  ownerUserId: string;
  ownerSlug: string;
  name: string;
  role: string;
  email: string;
  phone?: string | null;
  rawCode: string;
}): Promise<TeamAuthResult<TeamMemberPublic>> {
  try {
    const code = validateCode4(input.rawCode);
    if (!code) {
      return { ok: false, code: "INVALID_INPUT", error: "Le code doit contenir exactement 4 chiffres." };
    }
    const sb = getServerSupabase();
    const accessIndex = codeIndex(code);
    const accessHash = await hashCode(code);
    const now = new Date().toISOString();
    const payload = {
      owner_user_id: input.ownerUserId,
      owner_slug: input.ownerSlug,
      name: input.name,
      role: input.role,
      email: input.email,
      phone: input.phone ?? null,
      status: "active",
      access_code_hash: accessHash,
      access_code_index: accessIndex,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await sb.from("team_members").insert(payload).select("*").single();
    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return { ok: false, code: "DUPLICATE_CODE", error: "Code déjà utilisé pour ce patron." };
      }
      return { ok: false, code: "DB_ERROR", error: error.message };
    }
    return { ok: true, data: data as TeamMemberPublic };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}

export async function updateTeamMemberCodeSecure(input: {
  ownerUserId: string;
  memberId: string;
  rawCode: string;
}): Promise<TeamAuthResult<boolean>> {
  try {
    const code = validateCode4(input.rawCode);
    if (!code) {
      return { ok: false, code: "INVALID_INPUT", error: "Le code doit contenir exactement 4 chiffres." };
    }
    const sb = getServerSupabase();
    const accessIndex = codeIndex(code);
    const accessHash = await hashCode(code);
    const now = new Date().toISOString();
    await sb
      .from("team_member_sessions")
      .update({ revoked_at: now })
      .eq("team_member_id", input.memberId)
      .is("revoked_at", null);
    const { error } = await sb
      .from("team_members")
      .update({
        access_code_hash: accessHash,
        access_code_index: accessIndex,
        updated_at: now,
      })
      .eq("id", input.memberId)
      .eq("owner_user_id", input.ownerUserId);
    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return { ok: false, code: "DUPLICATE_CODE", error: "Code déjà utilisé pour ce patron." };
      }
      return { ok: false, code: "DB_ERROR", error: error.message };
    }
    return { ok: true, data: true };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}

export async function loginTeamMember(ownerSlug: string, rawCode: string): Promise<
  TeamAuthResult<{ member: TeamMemberPublic; sessionToken: string; expiresAt: string }>
> {
  try {
    const code = validateCode4(rawCode);
    if (!code) return { ok: false, code: "INVALID_INPUT", error: "Code invalide." };
    const slug = sanitizeSlug(ownerSlug);
    if (!slug) return { ok: false, code: "INVALID_INPUT", error: "Propriétaire invalide." };
    const sb = getServerSupabase();
    const accessIndex = codeIndex(code);
    const { data: member, error } = await sb
      .from("team_members")
      .select("*")
      .eq("owner_slug", slug)
      .eq("access_code_index", accessIndex)
      .eq("status", "active")
      .maybeSingle();
    if (error) return { ok: false, code: "DB_ERROR", error: error.message };
    if (!member) return { ok: false, code: "INVALID_CODE", error: "Code incorrect." };
    const bcrypt = await bcryptLib();
    const matches = await bcrypt.compare(code, String((member as any).access_code_hash || ""));
    if (!matches) return { ok: false, code: "INVALID_CODE", error: "Code incorrect." };
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { error: sErr } = await sb.from("team_member_sessions").insert({
      team_member_id: (member as any).id,
      session_token: sessionToken,
      expires_at: expiresAt,
    });
    if (sErr) return { ok: false, code: "DB_ERROR", error: sErr.message };
    const publicMember: TeamMemberPublic = {
      id: (member as any).id,
      owner_user_id: (member as any).owner_user_id,
      owner_slug: (member as any).owner_slug,
      name: (member as any).name,
      role: (member as any).role,
      email: (member as any).email,
      phone: (member as any).phone,
      status: (member as any).status,
    };
    return { ok: true, data: { member: publicMember, sessionToken, expiresAt } };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}

export async function validateTeamSession(sessionToken: string): Promise<
  TeamAuthResult<{ member: TeamMemberPublic; expiresAt: string }>
> {
  try {
    const sb = getServerSupabase();
    const now = new Date().toISOString();
    const { data: session, error } = await sb
      .from("team_member_sessions")
      .select("team_member_id, expires_at, revoked_at")
      .eq("session_token", sessionToken)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) return { ok: false, code: "DB_ERROR", error: error.message };
    if (!session) return { ok: false, code: "INVALID_SESSION", error: "Session inconnue." };
    if (String((session as any).expires_at) <= now) {
      return { ok: false, code: "EXPIRED", error: "Session expirée." };
    }
    const { data: member, error: mErr } = await sb
      .from("team_members")
      .select("*")
      .eq("id", (session as any).team_member_id)
      .eq("status", "active")
      .maybeSingle();
    if (mErr) return { ok: false, code: "DB_ERROR", error: mErr.message };
    if (!member) return { ok: false, code: "INVALID_SESSION", error: "Membre introuvable." };
    return {
      ok: true,
      data: {
        member: {
          id: (member as any).id,
          owner_user_id: (member as any).owner_user_id,
          owner_slug: (member as any).owner_slug,
          name: (member as any).name,
          role: (member as any).role,
          email: (member as any).email,
          phone: (member as any).phone,
          status: (member as any).status,
        },
        expiresAt: String((session as any).expires_at),
      },
    };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}

export async function revokeTeamSession(sessionToken: string): Promise<TeamAuthResult<boolean>> {
  try {
    const sb = getServerSupabase();
    const { error } = await sb
      .from("team_member_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("session_token", sessionToken)
      .is("revoked_at", null);
    if (error) return { ok: false, code: "DB_ERROR", error: error.message };
    return { ok: true, data: true };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}

export type TeamPermissionRow = { feature_key: string; can_view: boolean; can_edit: boolean };

export type TeamChantierPayload = {
  id: string;
  nom: string;
  clientId: string;
  clientName: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: "planifié" | "en cours" | "terminé";
  assignedMemberIds: string[];
};

function mapAppChantierRow(r: Record<string, unknown>): TeamChantierPayload {
  const imgs = r.images;
  const assigned = r.assigned_member_ids;
  return {
    id: String(r.id ?? ""),
    nom: String(r.nom ?? ""),
    clientId: String(r.client_id ?? ""),
    clientName: String(r.client_name ?? ""),
    dateDebut: String(r.date_debut ?? ""),
    duree: String(r.duree ?? ""),
    images: Array.isArray(imgs) ? (imgs as string[]) : [],
    statut: (r.statut as TeamChantierPayload["statut"]) || "planifié",
    assignedMemberIds: Array.isArray(assigned) ? (assigned as string[]).filter((x) => typeof x === "string") : [],
  };
}

/** Session valide + droits + chantiers visibles pour l’espace membre (service role). */
export async function getTeamMemberSessionContext(sessionToken: string): Promise<
  TeamAuthResult<{
    member: TeamMemberPublic;
    expiresAt: string;
    permissions: TeamPermissionRow[];
    assignedChantierIds: string[];
    chantiers: TeamChantierPayload[];
  }>
> {
  try {
    const validated = await validateTeamSession(sessionToken);
    if (!validated.ok) {
      return { ok: false, code: validated.code, error: validated.error };
    }
    const member = validated.data.member;
    const memberId = member.id;
    const ownerId = member.owner_user_id;
    const sb = getServerSupabase();

    const [{ data: permRows, error: pErr }, { data: chRows, error: cErr }, { data: allChantiers, error: chErr }] =
      await Promise.all([
        sb.from("team_member_permissions").select("feature_key, can_view, can_edit").eq("team_member_id", memberId),
        sb.from("team_member_chantiers").select("chantier_id").eq("team_member_id", memberId),
        sb.from("app_chantiers").select("*").eq("owner_user_id", ownerId).order("created_at", { ascending: false }),
      ]);

    if (pErr) return { ok: false, code: "DB_ERROR", error: pErr.message };
    if (cErr) return { ok: false, code: "DB_ERROR", error: cErr.message };
    if (chErr) return { ok: false, code: "DB_ERROR", error: chErr.message };

    const permissions: TeamPermissionRow[] = (permRows || []).map((row: any) => ({
      feature_key: String(row.feature_key),
      can_view: Boolean(row.can_view),
      can_edit: Boolean(row.can_edit),
    }));

    const assignedChantierIds = (chRows || [])
      .map((row: any) => String(row.chantier_id || ""))
      .filter(Boolean);

    const mappedAll = (allChantiers || []).map((r: any) => mapAppChantierRow(r as Record<string, unknown>));
    const chantiers =
      assignedChantierIds.length > 0
        ? mappedAll.filter((c) => assignedChantierIds.includes(c.id))
        : mappedAll;

    return {
      ok: true,
      data: {
        member,
        expiresAt: validated.data.expiresAt,
        permissions,
        assignedChantierIds,
        chantiers,
      },
    };
  } catch (e: any) {
    return { ok: false, code: "CONFIG_MISSING", error: e?.message || "Configuration manquante" };
  }
}
