import type { TeamMember } from '@/lib/supabase';

const now = new Date().toISOString();

/** Membres fictifs pour la démo (affichés si aucune donnée Supabase). */
export const DEMO_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'demo-tm-1',
    name: 'Lucas Mercier',
    role: 'Chef de chantier',
    email: 'l.mercier@axyos-renov.fr',
    phone: '06 12 00 11 22',
    status: 'actif',
    login_code: '452891',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-2',
    name: 'Amélie Rousseau',
    role: 'Commercial',
    email: 'a.rousseau@axyos-renov.fr',
    phone: '06 23 44 55 66',
    status: 'actif',
    login_code: '781204',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-3',
    name: 'Karim Benali',
    role: 'Ouvrier qualifié',
    email: 'k.benali@axyos-renov.fr',
    phone: '06 98 77 10 33',
    status: 'actif',
    login_code: '339012',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-4',
    name: 'Julie Petit',
    role: 'Assistante administrative',
    email: 'j.petit@axyos-renov.fr',
    phone: '04 72 88 12 40',
    status: 'actif',
    login_code: '665544',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-5',
    name: 'Nicolas Gauthier',
    role: 'Chef de chantier',
    email: 'n.gauthier@axyos-renov.fr',
    phone: '06 55 40 22 18',
    status: 'actif',
    login_code: '201845',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
];

export function isDemoTeamMemberId(id: string): boolean {
  return id.startsWith('demo-tm-');
}
