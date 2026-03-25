import type { StoredMemberPermissions } from '@/lib/teamMemberPermissions';

/** Zones de l’espace collaborateur (/team-dashboard…). */
export type TeamPortalArea = 'overview' | 'projects' | 'planning';

export function teamAreaFromPath(path: string): TeamPortalArea {
  if (path.startsWith('/team-dashboard/projects')) return 'projects';
  if (path.startsWith('/team-dashboard/planning')) return 'planning';
  return 'overview';
}

export function pathForTeamArea(area: TeamPortalArea): string {
  switch (area) {
    case 'projects':
      return '/team-dashboard/projects';
    case 'planning':
      return '/team-dashboard/planning';
    default:
      return '/team-dashboard';
  }
}

export function canViewTeamArea(p: StoredMemberPermissions, area: TeamPortalArea): boolean {
  if (area === 'projects') return p.view.projects;
  if (area === 'planning') return p.view.planning;
  return p.view.projects || p.view.planning;
}

export function canEditTeamArea(p: StoredMemberPermissions, area: TeamPortalArea): boolean {
  if (area === 'projects') return p.edit.projects;
  if (area === 'planning') return p.edit.planning;
  return p.edit.projects || p.edit.planning;
}

/** Première URL autorisée, ou `null` si aucun module chantier / planning. */
export function firstAccessibleTeamPath(p: StoredMemberPermissions): string | null {
  if (!canViewTeamArea(p, 'overview')) return null;
  if (p.view.projects) return '/team-dashboard';
  if (p.view.planning) return '/team-dashboard/planning';
  return null;
}
