import { useMemo, useEffect } from 'react';
import type { TeamMember } from '@/lib/supabase';
import { createNoAccessPermissions, type StoredMemberPermissions } from '@/lib/teamMemberPermissions';
import { TEAM_SESSION_EVENT, readTeamSession } from '@/lib/teamSession';
import { useTeamMemberAuth } from '@/context/TeamMemberContext';
import {
  canEditTeamArea,
  canViewTeamArea,
  firstAccessibleTeamPath,
  type TeamPortalArea,
} from '@/lib/teamPortalAccess';

export function useTeamPortalAccess() {
  const { member: ctxMember, portal, isTeamPortal, refetchPortal, contextLoading } = useTeamMemberAuth();

  const member = ctxMember as TeamMember | null;
  const permissions: StoredMemberPermissions = portal?.permissions ?? createNoAccessPermissions();
  const assignedChantierIds = portal?.assignedChantierIds ?? [];

  useEffect(() => {
    const onFocus = () => {
      if (readTeamSession()?.sessionToken) void refetchPortal();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchPortal]);

  useEffect(() => {
    const onSession = () => {
      if (readTeamSession()?.sessionToken) void refetchPortal();
    };
    window.addEventListener(TEAM_SESSION_EVENT, onSession);
    return () => window.removeEventListener(TEAM_SESSION_EVENT, onSession);
  }, [refetchPortal]);

  const firstPath = useMemo(() => firstAccessibleTeamPath(permissions), [permissions]);

  const canView = useMemo(
    () => (area: TeamPortalArea) => canViewTeamArea(permissions, area),
    [permissions],
  );

  const canEdit = useMemo(
    () => (area: TeamPortalArea) => canEditTeamArea(permissions, area),
    [permissions],
  );

  return {
    member,
    permissions,
    assignedChantierIds,
    isTeamPortal,
    contextLoading,
    firstPath,
    canView,
    canEdit,
    refetchPortal,
  };
}
