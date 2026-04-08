import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  DevisState,
  DevisSauvegarde,
  FactureSauvegarde,
  DevisStatut,
} from '@/types/devis';
import { calculerRecap } from '@/lib/devisCalculs';
import { useDevisStore } from '@/store/devisStore';
import { DEMO_EMETTEUR } from '@/data/demoSeed';
import { loadFacturesList, saveFacturesList } from '@/lib/repositories/appDataRepository';

const LS_FACTURES = 'facture:saved';
const LS_FACTURE_NUM = 'facture:lastNumber';
const LS_FACTURE_FORMAT = 'facture:numeroFormat';
const LS_EMETTEUR = 'devis:emetteur';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function plusTrenteJoursISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export function getNextNumeroFacture(): string {
  const format = localStorage.getItem(LS_FACTURE_FORMAT) ?? 'FAC-YYYY-NNN';
  const lastNumber = parseInt(localStorage.getItem(LS_FACTURE_NUM) ?? '0', 10);
  const next = lastNumber + 1;
  const year = new Date().getFullYear().toString();
  const numero = next.toString().padStart(3, '0');
  const result = format.replace('YYYY', year).replace('NNN', numero);
  localStorage.setItem(LS_FACTURE_NUM, next.toString());
  return result;
}

function getEmetteurFromLS(): DevisState['emetteur'] {
  try {
    const raw = localStorage.getItem(LS_EMETTEUR);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<DevisState['emetteur']>)
      : {};
    return {
      ...DEMO_EMETTEUR,
      ...parsed,
    };
  } catch {
    return { ...DEMO_EMETTEUR };
  }
}

function buildDraftFactureState(): DevisState {
  const items: DevisState['items'] = [];
  const recap = calculerRecap(items, null, 0, null, 0);
  return {
    emetteur: getEmetteurFromLS(),
    client: {
      nom: '',
      adresse: '',
      codePostal: '',
      ville: '',
      email: '',
      telephone: '',
      typeClient: 'particulier',
    },
    details: {
      numeroDevis: getNextNumeroFacture(),
      dateRedaction: todayISO(),
      dateValidite: plusTrenteJoursISO(),
      lieuExecution: '',
      descriptionChantier: '',
    },
    items,
    recap,
    conditions: {
      delaiExecution: '',
      modePaiement: 'Virement bancaire',
      delaiPaiement: 'À réception de facture',
      penalitesRetard: "3 fois le taux d'intérêt légal en vigueur",
      indemniteRecouvrement: '40€',
      reservePropriete: false,
      notes: '',
    },
    mentions: {
      assuranceDecennaleActive: true,
      rgeActive: false,
      tva293BActive: false,
      garantieParfaitAchevement: true,
      garantieBiennale: true,
      garantieDecennale: true,
    },
  };
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function withStatut(f: FactureSauvegarde): FactureSauvegarde {
  return { ...f, statut: f.statut ?? 'brouillon' };
}

function migrateFactures(list: FactureSauvegarde[]): FactureSauvegarde[] {
  return list.map(withStatut);
}

interface FactureStore {
  savedList: FactureSauvegarde[];
  /** null = nouvelle facture non encore enregistrée */
  loadedFactureId: string | null;

  prepareNewFacture: () => void;
  loadFactureForEdit: (id: string) => void;
  saveCurrentFacture: (nom: string, overwriteId?: string) => void;
  deleteFacture: (id: string) => void;
  updateFactureStatut: (id: string, statut: DevisStatut) => void;

  /** Crée une facture si le devis est signé (`payee`) et qu’aucune facture n’existe pour ce devis */
  ensureFromSignedDevis: (devis: DevisSauvegarde) => void;
  syncFromSignedDevisList: (devisList: DevisSauvegarde[]) => void;
}

export const useFactureStore = create<FactureStore>((set, get) => ({
  savedList: migrateFactures(safeParse(LS_FACTURES, [])),
  loadedFactureId: null,

  prepareNewFacture: () => {
    const state = buildDraftFactureState();
    useDevisStore.setState({ state, loadedDevisId: null });
    set({ loadedFactureId: null });
  },

  loadFactureForEdit: (id) => {
    const found = get().savedList.find((f) => f.id === id);
    if (!found) return;
    const state = JSON.parse(JSON.stringify(found.state)) as DevisState;
    useDevisStore.setState({ state, loadedDevisId: null });
    set({ loadedFactureId: id });
  },

  saveCurrentFacture: (nom, overwriteId) => {
    const devisState = useDevisStore.getState().state;
    const now = new Date().toISOString();
    const label =
      nom.trim() ||
      `Facture ${devisState.details?.numeroDevis ?? ''}`.trim();

    if (overwriteId) {
      const found = get().savedList.find((f) => f.id === overwriteId);
      if (!found) return;
      const updated: FactureSauvegarde = {
        ...found,
        nom: label,
        state: devisState,
        updatedAt: now,
        statut: found.statut ?? 'brouillon',
      };
      const savedList = get().savedList.map((f) =>
        f.id === overwriteId ? updated : f,
      );
      localStorage.setItem(LS_FACTURES, JSON.stringify(savedList));
      void saveFacturesList(savedList as any[]);
      set({ savedList, loadedFactureId: overwriteId });
      return;
    }

    const id = uuidv4();
    const facture: FactureSauvegarde = {
      id,
      nom: label,
      state: devisState,
      devisSourceId: null,
      createdAt: now,
      updatedAt: now,
      statut: 'brouillon',
    };
    const savedList = [...get().savedList, facture];
    localStorage.setItem(LS_FACTURES, JSON.stringify(savedList));
    void saveFacturesList(savedList as any[]);
    set({ savedList, loadedFactureId: id });
  },

  deleteFacture: (id) => {
    const savedList = get().savedList.filter((f) => f.id !== id);
    localStorage.setItem(LS_FACTURES, JSON.stringify(savedList));
    void saveFacturesList(savedList as any[]);
    set((s) => ({
      savedList,
      loadedFactureId: s.loadedFactureId === id ? null : s.loadedFactureId,
    }));
  },

  updateFactureStatut: (id, statut) => {
    const savedList = get().savedList.map((f) =>
      f.id === id
        ? { ...f, statut, updatedAt: new Date().toISOString() }
        : f,
    );
    localStorage.setItem(LS_FACTURES, JSON.stringify(savedList));
    void saveFacturesList(savedList as any[]);
    set({ savedList });
  },

  ensureFromSignedDevis: (devis) => {
    if (devis.statut !== 'payee') return;
    if (get().savedList.some((f) => f.devisSourceId === devis.id)) return;

    const state = JSON.parse(JSON.stringify(devis.state)) as DevisState;
    state.details = {
      ...state.details,
      numeroDevis: getNextNumeroFacture(),
      dateRedaction: todayISO(),
    };

    const now = new Date().toISOString();
    const facture: FactureSauvegarde = {
      id: uuidv4(),
      nom: `Facture ${state.details.numeroDevis} — ${devis.state.client?.nom ?? 'Client'}`,
      state,
      devisSourceId: devis.id,
      createdAt: now,
      updatedAt: now,
      statut: 'brouillon',
    };
    const savedList = [...get().savedList, facture];
    localStorage.setItem(LS_FACTURES, JSON.stringify(savedList));
    void saveFacturesList(savedList as any[]);
    set({ savedList });
  },

  syncFromSignedDevisList: (devisList) => {
    for (const d of devisList) {
      get().ensureFromSignedDevis(d);
    }
  },
}));

void (async () => {
  const res = await loadFacturesList();
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    useFactureStore.setState({ savedList: res.data as any });
    localStorage.setItem(LS_FACTURES, JSON.stringify(res.data));
  }
})();
