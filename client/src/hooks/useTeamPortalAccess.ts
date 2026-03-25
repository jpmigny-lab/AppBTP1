import { useMemo, useState, useEffect } from 'react';
import type { TeamMember } from '@/lib/supabase';
import {
  createFullAccessPermissions,
  getMemberPermissions,
  TEAM_MEMBER_PERMISSIONS_EVENT,
  type StoredMemberPermissions,
} from '@/lib/teamMemberPermissions';
import {
  canEditTeamArea,
  canViewTeamArea,
  firstAccessibleTeamPath,
  type TeamPortalArea,
} from '@/lib/teamPortalAccess';

export function useTeamPortalAccess() {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [permissions, setPermissions] = useState<StoredMemberPermissions>(() =>
    createFullAccessPermissions(),
  );

  useEffect(() => {
    const sync = () => {
      const raw = localStorage.getItem('teamMember');
      const ut = localStorage.getItem('userType');
      if (!raw || ut !== 'team') {
        setMember(null);
        return;
      }
      try {
        const m = JSON.parse(raw) as TeamMember;
        setMember(m);
        setPermissions(getMemberPermissions(m.id));
      } catch {
        setMember(null);
      }
    };
    sync();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'teamMember' ||
        e.key === 'aosrenov.team.memberPermissions.v1' ||
        e.key === null
      ) {
        sync();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(TEAM_MEMBER_PERMISSIONS_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(TEAM_MEMBER_PERMISSIONS_EVENT, sync);
    };
  }, []);

  const firstPath = useMemo(() => firstAccessibleTeamPath(permissions), [permissions]);

  const canView = useMemo(
    () => (area: TeamPortalArea) => canViewTeamArea(permissions, area),
    [permissions],
  );

  const canEdit = useMemo(
    () => (area: TeamPortalArea) => canEditTeamArea(permissions, area),
    [permissions],
  );

  return { member, permissions, firstPath, canView, canEdit };
}
