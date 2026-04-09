import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchTeamMemberSessionContext,
  logoutTeamSessionViaApi,
  type TeamSession,
  type TeamSessionContextApi,
} from "@/lib/teamApi";
import { storedPermissionsFromPermissionRows, type StoredMemberPermissions } from "@/lib/teamMemberPermissions";
import { clearTeamSession, readTeamSession, writeTeamSession } from "@/lib/teamSession";

/** Même forme que `Chantier` (évite import circulaire avec ChantiersContext). */
export type TeamPortalChantier = {
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

export type TeamPortalContextState = {
  member: TeamSession["member"];
  expiresAt: string;
  permissions: StoredMemberPermissions;
  assignedChantierIds: string[];
  chantiers: TeamPortalChantier[];
};

type TeamMemberContextType = {
  member: TeamSession["member"] | null;
  sessionToken: string | null;
  ownerSlug: string | null;
  isAuthenticated: boolean;
  isTeamPortal: boolean;
  portal: TeamPortalContextState | null;
  contextLoading: boolean;
  loading: boolean;
  login: (session: TeamSession) => void;
  logout: () => Promise<void>;
  refetchPortal: () => Promise<void>;
};

const TeamMemberContext = createContext<TeamMemberContextType | undefined>(undefined);

function mapChantiers(raw: TeamSessionContextApi["chantiers"]): TeamPortalChantier[] {
  return raw.map((c) => ({
    id: c.id,
    nom: c.nom,
    clientId: c.clientId,
    clientName: c.clientName,
    dateDebut: c.dateDebut,
    duree: c.duree,
    images: Array.isArray(c.images) ? c.images : [],
    statut: c.statut,
    assignedMemberIds: Array.isArray(c.assignedMemberIds) ? c.assignedMemberIds : [],
  }));
}

export function TeamMemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<TeamSession["member"] | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [portal, setPortal] = useState<TeamPortalContextState | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);

  const applyContextFromApi = useCallback((token: string, data: TeamSessionContextApi) => {
    const p: TeamPortalContextState = {
      member: data.member,
      expiresAt: data.expiresAt,
      permissions: storedPermissionsFromPermissionRows(data.permissions),
      assignedChantierIds: data.assignedChantierIds,
      chantiers: mapChantiers(data.chantiers),
    };
    setPortal(p);
    setMember(data.member);
    writeTeamSession({
      member: data.member,
      sessionToken: token,
      expiresAt: data.expiresAt,
    });
  }, []);

  const loadPortal = useCallback(
    async (token: string): Promise<boolean> => {
      setContextLoading(true);
      const r = await fetchTeamMemberSessionContext(token);
      setContextLoading(false);
      if (!r.ok) return false;
      applyContextFromApi(token, r.data as TeamSessionContextApi);
      return true;
    },
    [applyContextFromApi],
  );

  const refetchPortal = useCallback(async () => {
    const t = sessionToken || readTeamSession()?.sessionToken;
    if (!t) return;
    await loadPortal(t);
  }, [loadPortal, sessionToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = readTeamSession();
      if (!current?.sessionToken) {
        if (active) setLoading(false);
        return;
      }
      setSessionToken(current.sessionToken);
      const ok = await loadPortal(current.sessionToken);
      if (!active) return;
      if (!ok) {
        clearTeamSession();
        setMember(null);
        setSessionToken(null);
        setPortal(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadPortal]);

  const value = useMemo<TeamMemberContextType>(
    () => ({
      member,
      sessionToken,
      ownerSlug: member?.owner_slug ?? null,
      isAuthenticated: Boolean(member && sessionToken),
      isTeamPortal: Boolean(member && sessionToken && portal),
      portal,
      contextLoading,
      loading,
      login: (session) => {
        writeTeamSession(session);
        setMember(session.member);
        setSessionToken(session.sessionToken);
        void loadPortal(session.sessionToken);
      },
      logout: async () => {
        const token = sessionToken;
        clearTeamSession();
        setMember(null);
        setSessionToken(null);
        setPortal(null);
        if (token) await logoutTeamSessionViaApi(token);
      },
      refetchPortal,
    }),
    [member, sessionToken, portal, contextLoading, loading, loadPortal, refetchPortal],
  );

  return <TeamMemberContext.Provider value={value}>{children}</TeamMemberContext.Provider>;
}

export function useTeamMemberAuth() {
  const ctx = useContext(TeamMemberContext);
  if (!ctx) throw new Error("useTeamMemberAuth must be used within TeamMemberProvider");
  return ctx;
}
