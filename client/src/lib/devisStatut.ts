import type { DevisStatut } from '@/types/devis';
import { cn } from '@/lib/utils';

/** États affichés dans les listes Devis / Factures */
export const DEVIS_STATUTS_VISIBLES: DevisStatut[] = [
  'brouillon',
  'envoyee',
  'payee',
  'en_retard',
];

export const DEVIS_STATUT_LABELS: Record<DevisStatut, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Signé',
  en_retard: 'En retard',
};

/** Libellés sur l’écran Factures (le statut interne reste `payee`) */
export const FACTURE_STATUT_LABELS: Record<DevisStatut, string> = {
  ...DEVIS_STATUT_LABELS,
  payee: 'Payé',
};

/** Bordure carte = état actif (couleurs maquette) */
export const DEVIS_STATUT_ROW_CLASS: Record<DevisStatut, string> = {
  brouillon:
    'border-2 border-white/15 bg-black/20 hover:bg-black/30 shadow-none',
  envoyee:
    'border-2 border-[#D19A4E] bg-black/20 hover:bg-black/[0.28] shadow-[0_0_0_1px_rgba(209,154,78,0.35),0_0_24px_-8px_rgba(209,154,78,0.25)]',
  payee:
    'border-2 border-[#10A35B] bg-black/20 hover:bg-black/[0.28] shadow-[0_0_0_1px_rgba(16,163,91,0.35),0_0_24px_-8px_rgba(16,163,91,0.22)]',
  en_retard:
    'border-2 border-[#E13023] bg-black/20 hover:bg-black/[0.28] shadow-[0_0_0_1px_rgba(225,48,35,0.35),0_0_24px_-8px_rgba(225,48,35,0.22)]',
};

const BADGE_INACTIVE =
  'border border-white/10 bg-white/[0.06] text-white/45';

const BADGE_ACTIVE: Record<DevisStatut, string> = {
  // Neutre, sans contour coloré
  brouillon: 'border-transparent bg-white/[0.16] text-white',
  envoyee: 'border-transparent bg-[#D19A4E] text-white',
  payee: 'border-transparent bg-[#10A35B] text-white',
  en_retard: 'border-transparent bg-[#E13023] text-white',
};

export function devisStatutBadgeClass(
  statut: DevisStatut,
  key: DevisStatut,
): string {
  const base =
    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors';
  if (statut === key) {
    return cn(base, BADGE_ACTIVE[key]);
  }
  return cn(base, BADGE_INACTIVE);
}
