import { supabase } from "@/lib/supabase";
import { clearTeamSession, readTeamSession, writeTeamSession } from "@/lib/teamSession";

export type TeamSession = {
  member: {
    id: string;
    owner_user_id: string;
    owner_slug: string;
    name: string;
    role: string;
    email: string;
    phone: string | null;
    status: "active" | "inactive";
  };
  sessionToken: string;
  expiresAt: string;
};

function getApiBase(): string {
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL || "";
  if (envBase) return envBase;
  if (isLocalDev && window.location.port !== "5001") return "http://localhost:5001";
  return "";
}

async function getOwnerAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchOwnerSlug(): Promise<{ ok: true; ownerSlug: string } | { ok: false; error: string }> {
  try {
    const endpoint = `${getApiBase()}/api/team/owner-slug`;
    const resp = await fetch(endpoint, {
      headers: { "Content-Type": "application/json", ...(await getOwnerAuthHeader()) },
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      return { ok: false, error: json?.message || "Impossible de récupérer le lien de connexion membre." };
    }
    return { ok: true, ownerSlug: String(json.ownerSlug || "") };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau." };
  }
}

export async function createTeamMemberViaApi(input: {
  name: string;
  role: string;
  email: string;
  phone?: string;
  code: string;
}): Promise<{ ok: true; member: any } | { ok: false; code?: string; error: string }> {
  try {
    const endpoint = `${getApiBase()}/api/team/member`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getOwnerAuthHeader()),
      },
      body: JSON.stringify(input),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      return { ok: false, code: json?.code, error: json?.message || "Impossible de créer le membre." };
    }
    return { ok: true, member: json.member };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau." };
  }
}

export async function updateMemberCodeViaApi(
  memberId: string,
  code: string,
): Promise<{ ok: true } | { ok: false; code?: string; error: string }> {
  try {
    const endpoint = `${getApiBase()}/api/team/member/${memberId}/code`;
    const resp = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await getOwnerAuthHeader()),
      },
      body: JSON.stringify({ code }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      return { ok: false, code: json?.code, error: json?.message || "Impossible de modifier le code." };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau." };
  }
}

export async function loginTeamWithCode(input: {
  ownerSlug: string;
  code: string;
}): Promise<{ ok: true; session: TeamSession } | { ok: false; code?: string; error: string }> {
  try {
    const endpoint = `${getApiBase()}/api/team/login`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      return { ok: false, code: json?.code, error: json?.message || "Connexion impossible." };
    }
    return {
      ok: true,
      session: {
        member: json.member,
        sessionToken: String(json.sessionToken),
        expiresAt: String(json.expiresAt),
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau." };
  }
}

export async function validateTeamSessionViaApi(
  sessionToken: string,
): Promise<{ ok: true; member: TeamSession["member"]; expiresAt: string } | { ok: false; code?: string; error: string }> {
  try {
    const endpoint = `${getApiBase()}/api/team/session/validate?sessionToken=${encodeURIComponent(sessionToken)}`;
    const resp = await fetch(endpoint, { method: "GET" });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      return { ok: false, code: json?.code, error: json?.message || "Session invalide." };
    }
    return { ok: true, member: json.member, expiresAt: String(json.expiresAt) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau." };
  }
}

export type TeamSessionContextApi = {
  member: TeamSession["member"];
  expiresAt: string;
  permissions: { feature_key: string; can_view: boolean; can_edit: boolean }[];
  assignedChantierIds: string[];
  chantiers: {
    id: string;
    nom: string;
    clientId: string;
    clientName: string;
    dateDebut: string;
    duree: string;
    images: string[];
    statut: "planifié" | "en cours" | "terminé";
    assignedMemberIds: string[];
  }[];
};

export async function fetchTeamMemberSessionContext(
  sessionToken: string,
): Promise<{ ok: true; data: TeamSessionContextApi } | { ok: false; code?: string; error: string }> {
  try {
    const endpoint = `${getApiBase()}/api/team/session/context?sessionToken=${encodeURIComponent(sessionToken)}`;
    const resp = await fetch(endpoint, { method: "GET" });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      return { ok: false, code: json?.code, error: json?.message || "Session invalide." };
    }
    return {
      ok: true,
      data: {
        member: json.member,
        expiresAt: String(json.expiresAt),
        permissions: Array.isArray(json.permissions) ? json.permissions : [],
        assignedChantierIds: Array.isArray(json.assignedChantierIds) ? json.assignedChantierIds : [],
        chantiers: Array.isArray(json.chantiers) ? json.chantiers : [],
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau." };
  }
}

export async function logoutTeamSessionViaApi(sessionToken: string): Promise<void> {
  try {
    const endpoint = `${getApiBase()}/api/team/session/logout`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    });
  } catch {
    // noop
  }
}
