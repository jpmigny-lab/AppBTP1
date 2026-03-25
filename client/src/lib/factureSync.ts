import type { DevisSauvegarde, DevisStatut } from '@/types/devis';
import { useDevisStore } from '@/store/devisStore';
import { useFactureStore } from '@/store/factureStore';

export function ensureFactureFromSignedDevis(devis: DevisSauvegarde): void {
  useFactureStore.getState().ensureFromSignedDevis(devis);
}

/** À appeler au chargement des listes pour rattraper les devis déjà « Signé » */
export function bootstrapFacturesFromDevis(): void {
  const devisList = useDevisStore.getState().savedList;
  useFactureStore.getState().syncFromSignedDevisList(devisList);
}

export function updateDevisStatutAndSyncFacture(
  id: string,
  statut: DevisStatut,
  updateDevisStatut: (id: string, s: DevisStatut) => void,
): void {
  updateDevisStatut(id, statut);
  if (statut === 'payee') {
    queueMicrotask(() => {
      const cur = useDevisStore.getState().savedList.find((x) => x.id === id);
      if (cur?.statut === 'payee') ensureFactureFromSignedDevis(cur);
    });
  }
}
