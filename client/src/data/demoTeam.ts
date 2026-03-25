import type { TeamMember } from '@/lib/supabase';

const now = new Date().toISOString();

/**
 * 5 collaborateurs fictifs pour la démo (liste Équipe + connexion « Équipe » quand aucun membre Supabase).
 * Codes à saisir sur la page Connexion, onglet Équipe (ou clic sur la carte du membre).
 */
export const DEMO_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'demo-tm-1',
    name: 'Thomas Leroy',
    role: 'Chef de chantier',
    email: 't.leroy@demo.axyos-renov.fr',
    phone: '06 18 22 90 41',
    status: 'actif',
    login_code: '110842',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-2',
    name: 'Camille Bernard',
    role: 'Commercial',
    email: 'c.bernard@demo.axyos-renov.fr',
    phone: '06 72 55 13 08',
    status: 'actif',
    login_code: '229503',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-3',
    name: 'Mehdi Cherkaoui',
    role: 'Employé',
    email: 'm.cherkaoui@demo.axyos-renov.fr',
    phone: '06 44 91 67 22',
    status: 'actif',
    login_code: '338174',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-4',
    name: 'Léa Fontaine',
    role: 'Assistante administrative',
    email: 'l.fontaine@demo.axyos-renov.fr',
    phone: '04 78 60 12 95',
    status: 'actif',
    login_code: '447625',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-tm-5',
    name: 'Julien Morel',
    role: 'Ouvrier qualifié',
    email: 'j.morel@demo.axyos-renov.fr',
    phone: '06 03 88 74 19',
    status: 'actif',
    login_code: '556091',
    user_id: null,
    created_at: now,
    updated_at: now,
  },
];

export function isDemoTeamMemberId(id: string): boolean {
  return id.startsWith('demo-tm-');
}
