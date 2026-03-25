import type { Chantier } from '@/context/ChantiersContext';

/** Aucune affectation explicite = tous les collaborateurs avec accès « chantiers » voient le projet. */
export function isChantierVisibleToTeamMember(chantier: Chantier, memberId: string | undefined): boolean {
  const ids = chantier.assignedMemberIds;
  if (!memberId) return true;
  if (!ids || ids.length === 0) return true;
  return ids.includes(memberId);
}
