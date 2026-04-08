import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  DevisState,
  DevisItem,
  LignePrestation,
  SectionDevis,
  InfosEmetteur,
  InfosClient,
  DetailsDevis,
  Conditions,
  MentionsLegales,
  PrestationFavorite,
  ModeleDevis,
  DevisSauvegarde,
  DevisStatut,
} from '@/types/devis';
import { calculerRecap } from '@/lib/devisCalculs';
import {
  DEMO_EMETTEUR,
  getDemoSavedDevis,
  getDemoCatalogue,
} from '@/data/demoSeed';
import { loadDevisList, saveDevisList } from '@/lib/repositories/appDataRepository';

const LS_EMETTEUR = 'devis:emetteur';
const LS_NUMERO = 'devis:lastNumber';
const LS_FORMAT = 'devis:numeroFormat';
const LS_CATALOGUE = 'devis:catalogue';
const LS_MODELES = 'devis:modeles';
const LS_SAVED = 'devis:saved';

function devisUpdatedAtMs(d: DevisSauvegarde): number {
  return +new Date(d.updatedAt || d.createdAt || 0).getTime();
}

/**
 * Évite qu’un chargement Supabase lent n’écrase un statut fraîchement enregistré
 * (cas fréquent sur Vercel : hydrate initial vs. envoi email).
 */
function mergeDevisListsPreferNewer(
  local: DevisSauvegarde[],
  remote: DevisSauvegarde[],
): DevisSauvegarde[] {
  const ids = new Set<string>([...local.map((d) => d.id), ...remote.map((d) => d.id)]);
  const out: DevisSauvegarde[] = [];
  for (const id of ids) {
    const l = local.find((x) => x.id === id);
    const r = remote.find((x) => x.id === id);
    if (!l) {
      if (r) out.push(r);
      continue;
    }
    if (!r) {
      out.push(l);
      continue;
    }
    out.push(devisUpdatedAtMs(l) >= devisUpdatedAtMs(r) ? l : r);
  }
  return out.sort(
    (a, b) =>
      +new Date(b.createdAt || 0).getTime() - +new Date(a.createdAt || 0).getTime(),
  );
}

let hydrateDevisInflight: Promise<void> | null = null;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function plusTrenteJoursISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export function getNextNumeroDevis(): string {
  const format = localStorage.getItem(LS_FORMAT) ?? 'DEV-YYYY-NNN';
  const lastNumber = parseInt(localStorage.getItem(LS_NUMERO) ?? '0', 10);
  const next = lastNumber + 1;
  const year = new Date().getFullYear().toString();
  const numero = next.toString().padStart(3, '0');
  const result = format.replace('YYYY', year).replace('NNN', numero);
  localStorage.setItem(LS_NUMERO, next.toString());
  return result;
}

function getEmetteurFromLS(): Partial<InfosEmetteur> {
  try {
    return JSON.parse(localStorage.getItem(LS_EMETTEUR) ?? '{}');
  } catch {
    return {};
  }
}

function buildInitialState(): DevisState {
  const emetteurSaved = getEmetteurFromLS();
  const items: DevisItem[] = [];
  const recap = calculerRecap(items, null, 0, null, 0);

  return {
    emetteur: {
      raisonSociale: '',
      adresse: '',
      codePostal: '',
      ville: '',
      telephone: '',
      email: '',
      siret: '',
      tvaIntra: '',
      formeJuridique: '',
      assuranceDecennale: '',
      logoBase64: null,
      ...emetteurSaved,
    },
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
      numeroDevis: getNextNumeroDevis(),
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

function recalcAndPatch(
  items: DevisItem[],
  current: DevisState,
): DevisState {
  const recap = calculerRecap(
    items,
    current.recap.remiseType,
    current.recap.remiseValeur,
    current.recap.acompteType,
    current.recap.acompteValeur,
  );
  return { ...current, items, recap };
}

interface DevisStore {
  state: DevisState;
  loadedDevisId: string | null;
  catalogue: PrestationFavorite[];
  modeles: ModeleDevis[];
  savedList: DevisSauvegarde[];

  setEmetteur: (data: Partial<InfosEmetteur>) => void;
  setClient: (data: Partial<InfosClient>) => void;
  setDetails: (data: Partial<DetailsDevis>) => void;
  setConditions: (data: Partial<Conditions>) => void;
  setMentions: (data: Partial<MentionsLegales>) => void;
  setRecapRemiseAcompte: (data: {
    remiseType?: 'pourcentage' | 'montant' | null;
    remiseValeur?: number;
    acompteType?: 'pourcentage' | 'montant' | null;
    acompteValeur?: number;
  }) => void;

  addLigne: (sectionId?: string | null) => void;
  updateLigne: (
    id: string,
    data: Partial<Omit<LignePrestation, 'id' | 'type'>>,
  ) => void;
  removeLigne: (id: string) => void;
  duplicateLigne: (id: string) => void;
  addSection: (titre?: string) => void;
  updateSection: (id: string, titre: string) => void;
  removeSection: (id: string) => void;
  reorderItems: (newItems: DevisItem[]) => void;

  resetDevis: () => void;
  loadFromTemplate: (modele: ModeleDevis) => void;
  saveCurrentDevis: (nom: string, overwriteId?: string) => void;
  loadDevis: (id: string) => void;
  duplicateDevis: (id: string) => void;
  deleteDevis: (id: string) => void;
  updateDevisStatut: (id: string, statut: DevisStatut) => void;

  /**
   * Après envoi email réussi : une seule écriture locale + await Supabase
   * (évite deux upserts concurrents qui peuvent réécraser le statut sur Vercel).
   */
  applyAfterQuoteEmailSent: () => Promise<
    | { ok: true; markedAsEnvoyee: boolean }
    | { ok: false; error: string }
  >;

  addToCatalogue: (prestation: Omit<PrestationFavorite, 'id'>) => void;
  removeFromCatalogue: (id: string) => void;
  insertFromCatalogue: (
    prestation: PrestationFavorite,
    sectionId?: string | null,
  ) => void;

  saveAsModele: (nom: string) => void;
  deleteModele: (id: string) => void;
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Premier chargement navigateur : devis sauvegardés, émetteur, catalogue de démo. */
function ensureDemoDevisLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!localStorage.getItem(LS_SAVED)) {
      const demo = getDemoSavedDevis();
      localStorage.setItem(LS_SAVED, JSON.stringify(demo));
      localStorage.setItem(LS_NUMERO, '3');
    }
    if (!localStorage.getItem(LS_EMETTEUR)) {
      localStorage.setItem(LS_EMETTEUR, JSON.stringify(DEMO_EMETTEUR));
    }
    if (!localStorage.getItem(LS_CATALOGUE)) {
      localStorage.setItem(LS_CATALOGUE, JSON.stringify(getDemoCatalogue()));
    }
  } catch {
    /* ignore */
  }
}

ensureDemoDevisLocalStorage();

export const useDevisStore = create<DevisStore>((set, get) => ({
  state: buildInitialState(),
  loadedDevisId: null,
  catalogue: safeParse(LS_CATALOGUE, []),
  modeles: safeParse(LS_MODELES, []),
  savedList: safeParse(LS_SAVED, []),

  setEmetteur: (data) =>
    set((s) => {
      const emetteur = { ...s.state.emetteur, ...data };
      const toSave = { ...emetteur };
      if (
        toSave.logoBase64 &&
        toSave.logoBase64.length > 200_000
      ) {
        const { logoBase64: _, ...withoutLogo } = toSave;
        localStorage.setItem(LS_EMETTEUR, JSON.stringify(withoutLogo));
      } else {
        localStorage.setItem(LS_EMETTEUR, JSON.stringify(toSave));
      }
      return { state: { ...s.state, emetteur } };
    }),

  setClient: (data) =>
    set((s) => ({
      state: { ...s.state, client: { ...s.state.client, ...data } },
    })),

  setDetails: (data) =>
    set((s) => ({
      state: { ...s.state, details: { ...s.state.details, ...data } },
    })),

  setConditions: (data) =>
    set((s) => ({
      state: {
        ...s.state,
        conditions: { ...s.state.conditions, ...data },
      },
    })),

  setMentions: (data) =>
    set((s) => ({
      state: { ...s.state, mentions: { ...s.state.mentions, ...data } },
    })),

  setRecapRemiseAcompte: (data) =>
    set((s) => {
      const recap = {
        ...s.state.recap,
        ...data,
      };
      const newRecap = calculerRecap(
        s.state.items,
        recap.remiseType ?? s.state.recap.remiseType,
        data.remiseValeur ?? s.state.recap.remiseValeur,
        recap.acompteType ?? s.state.recap.acompteType,
        data.acompteValeur ?? s.state.recap.acompteValeur,
      );
      return { state: { ...s.state, recap: newRecap } };
    }),

  addLigne: (sectionId = null) =>
    set((s) => {
      const newLigne: LignePrestation = {
        id: uuidv4(),
        type: 'ligne',
        designation: '',
        unite: 'm2',
        quantite: 1,
        prixUnitaireHT: 0,
        tauxTVA: 10,
        sectionId,
      };
      const items = [...s.state.items, newLigne];
      return { state: recalcAndPatch(items, s.state) };
    }),

  updateLigne: (id, data) =>
    set((s) => {
      const items = s.state.items.map((item) =>
        item.id === id && item.type === 'ligne'
          ? { ...item, ...data }
          : item,
      );
      return { state: recalcAndPatch(items, s.state) };
    }),

  removeLigne: (id) =>
    set((s) => {
      const items = s.state.items.filter((item) => item.id !== id);
      return { state: recalcAndPatch(items, s.state) };
    }),

  duplicateLigne: (id) =>
    set((s) => {
      const idx = s.state.items.findIndex((i) => i.id === id);
      if (idx === -1) return s;
      const original = s.state.items[idx] as LignePrestation;
      const clone: LignePrestation = { ...original, id: uuidv4() };
      const items = [
        ...s.state.items.slice(0, idx + 1),
        clone,
        ...s.state.items.slice(idx + 1),
      ];
      return { state: recalcAndPatch(items, s.state) };
    }),

  addSection: (titre = 'NOUVELLE SECTION') =>
    set((s) => {
      const section: SectionDevis = {
        id: uuidv4(),
        type: 'section',
        titre,
      };
      const items = [...s.state.items, section];
      return { state: { ...s.state, items } };
    }),

  updateSection: (id, titre) =>
    set((s) => ({
      state: {
        ...s.state,
        items: s.state.items.map((item) =>
          item.id === id && item.type === 'section'
            ? { ...item, titre }
            : item,
        ),
      },
    })),

  removeSection: (id) =>
    set((s) => {
      const items = s.state.items
        .filter((item) => item.id !== id)
        .map((item) =>
          item.type === 'ligne' && item.sectionId === id
            ? { ...item, sectionId: null }
            : item,
        );
      return { state: recalcAndPatch(items, s.state) };
    }),

  reorderItems: (newItems) =>
    set((s) => ({
      state: recalcAndPatch(newItems, s.state),
    })),

  resetDevis: () => set(() => ({ state: buildInitialState(), loadedDevisId: null })),

  loadFromTemplate: (modele) =>
    set(() => ({
      state: {
        ...modele.state,
        details: {
          ...modele.state.details,
          numeroDevis: getNextNumeroDevis(),
          dateRedaction: todayISO(),
          dateValidite: plusTrenteJoursISO(),
        },
      },
    })),

  saveCurrentDevis: (nom, overwriteId) =>
    set((s) => {
      const now = new Date().toISOString();
      if (overwriteId) {
        const found = s.savedList.find((d) => d.id === overwriteId);
        if (!found) return s;
        const updated: DevisSauvegarde = {
          ...found,
          nom,
          state: s.state,
          updatedAt: now,
          statut: found.statut ?? 'brouillon',
        };
        const savedList = s.savedList.map((d) => (d.id === overwriteId ? updated : d));
        localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
        void saveDevisList(savedList as any[]);
        return { savedList };
      }
      const devis: DevisSauvegarde = {
        id: uuidv4(),
        nom,
        state: s.state,
        createdAt: now,
        updatedAt: now,
        statut: 'brouillon',
      };
      const savedList = [...s.savedList, devis];
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
      void saveDevisList(savedList as any[]);
      return { savedList, loadedDevisId: devis.id };
    }),

  loadDevis: (id) =>
    set((s) => {
      const found = s.savedList.find((d) => d.id === id);
      if (!found) return s;
      return { state: found.state, loadedDevisId: id };
    }),

  duplicateDevis: (id) =>
    set((s) => {
      const found = s.savedList.find((d) => d.id === id);
      if (!found) return s;
      const clone: DevisSauvegarde = {
        ...found,
        id: uuidv4(),
        nom: `${found.nom} (copie)`,
        state: {
          ...found.state,
          details: {
            ...found.state.details,
            numeroDevis: getNextNumeroDevis(),
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statut: found.statut ?? 'brouillon',
      };
      const savedList = [...s.savedList, clone];
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
      void saveDevisList(savedList as any[]);
      return { savedList };
    }),

  deleteDevis: (id) =>
    set((s) => {
      const savedList = s.savedList.filter((d) => d.id !== id);
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
      void saveDevisList(savedList as any[]);
      return {
        savedList,
        ...(s.loadedDevisId === id ? { state: buildInitialState(), loadedDevisId: null } : {}),
      };
    }),

  updateDevisStatut: (id, statut) =>
    set((s) => {
      const savedList = s.savedList.map((d) =>
        d.id === id
          ? { ...d, statut, updatedAt: new Date().toISOString() }
          : d,
      );
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
      void saveDevisList(savedList as any[]);
      return { savedList };
    }),

  applyAfterQuoteEmailSent: async () => {
    const s = get();
    const now = new Date().toISOString();
    let targetId = s.loadedDevisId;
    let savedList: DevisSauvegarde[];
    let markedAsEnvoyee = false;

    if (!targetId) {
      const devis: DevisSauvegarde = {
        id: uuidv4(),
        nom: `Devis ${s.state.details.numeroDevis}`,
        state: s.state,
        createdAt: now,
        updatedAt: now,
        statut: 'envoyee',
      };
      savedList = [...s.savedList, devis];
      targetId = devis.id;
      markedAsEnvoyee = true;
    } else {
      const found = s.savedList.find((d) => d.id === targetId);
      if (!found) {
        /** Liste désynchronisée (ex. refresh distant) : réinjecter l’entrée courante */
        const orphan: DevisSauvegarde = {
          id: targetId,
          nom: `Devis ${s.state.details.numeroDevis}`,
          state: s.state,
          createdAt: now,
          updatedAt: now,
          statut: 'envoyee',
        };
        savedList = [...s.savedList.filter((d) => d.id !== targetId), orphan];
        markedAsEnvoyee = true;
      } else {
        const current = found.statut ?? 'brouillon';
        if (current === 'payee' || current === 'en_retard') {
          const updated: DevisSauvegarde = {
            ...found,
            state: s.state,
            updatedAt: now,
          };
          savedList = s.savedList.map((d) => (d.id === targetId ? updated : d));
        } else {
          const updated: DevisSauvegarde = {
            ...found,
            state: s.state,
            updatedAt: now,
            statut: 'envoyee',
          };
          savedList = s.savedList.map((d) => (d.id === targetId ? updated : d));
          markedAsEnvoyee = true;
        }
      }
    }

    localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
    set({ savedList, loadedDevisId: targetId });

    const res = await saveDevisList(savedList as any[]);
    if (!res.ok) {
      return {
        ok: false,
        error: res.error ?? 'Échec de la synchronisation (Supabase).',
      };
    }
    return { ok: true, markedAsEnvoyee };
  },

  addToCatalogue: (prestation) =>
    set((s) => {
      const item: PrestationFavorite = { ...prestation, id: uuidv4() };
      const catalogue = [...s.catalogue, item];
      localStorage.setItem(LS_CATALOGUE, JSON.stringify(catalogue));
      return { catalogue };
    }),

  removeFromCatalogue: (id) =>
    set((s) => {
      const catalogue = s.catalogue.filter((p) => p.id !== id);
      localStorage.setItem(LS_CATALOGUE, JSON.stringify(catalogue));
      return { catalogue };
    }),

  insertFromCatalogue: (prestation, sectionId = null) =>
    set((s) => {
      const newLigne: LignePrestation = {
        id: uuidv4(),
        type: 'ligne',
        designation: prestation.designation,
        unite: prestation.unite,
        quantite: prestation.quantite,
        prixUnitaireHT: prestation.prixUnitaireHT,
        tauxTVA: prestation.tauxTVA,
        sectionId,
      };
      const items = [...s.state.items, newLigne];
      return { state: recalcAndPatch(items, s.state) };
    }),

  saveAsModele: (nom) =>
    set((s) => {
      const modele: ModeleDevis = {
        id: uuidv4(),
        nom,
        state: s.state,
        createdAt: new Date().toISOString(),
      };
      const modeles = [...s.modeles, modele];
      localStorage.setItem(LS_MODELES, JSON.stringify(modeles));
      return { modeles };
    }),

  deleteModele: (id) =>
    set((s) => {
      const modeles = s.modeles.filter((m) => m.id !== id);
      localStorage.setItem(LS_MODELES, JSON.stringify(modeles));
      return { modeles };
    }),
}));

/** À appeler une fois la session Supabase connue (voir AuthContext). */
export async function hydrateDevisListFromSupabase(): Promise<void> {
  if (hydrateDevisInflight) return hydrateDevisInflight;

  hydrateDevisInflight = (async () => {
    try {
      const res = await loadDevisList();
      if (!res.ok || !Array.isArray(res.data)) return;
      const remote = res.data as DevisSauvegarde[];
      useDevisStore.setState((s) => {
        const merged = mergeDevisListsPreferNewer(s.savedList, remote);
        try {
          localStorage.setItem(LS_SAVED, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return { savedList: merged };
      });
    } finally {
      hydrateDevisInflight = null;
    }
  })();

  return hydrateDevisInflight;
}
