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
} from '@/types/devis';
import { calculerRecap } from '@/lib/devisCalculs';

const LS_EMETTEUR = 'devis:emetteur';
const LS_NUMERO = 'devis:lastNumber';
const LS_FORMAT = 'devis:numeroFormat';
const LS_CATALOGUE = 'devis:catalogue';
const LS_MODELES = 'devis:modeles';
const LS_SAVED = 'devis:saved';

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
        };
        const savedList = s.savedList.map((d) => (d.id === overwriteId ? updated : d));
        localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
        return { savedList };
      }
      const devis: DevisSauvegarde = {
        id: uuidv4(),
        nom,
        state: s.state,
        createdAt: now,
        updatedAt: now,
      };
      const savedList = [...s.savedList, devis];
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
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
      };
      const savedList = [...s.savedList, clone];
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
      return { savedList };
    }),

  deleteDevis: (id) =>
    set((s) => {
      const savedList = s.savedList.filter((d) => d.id !== id);
      localStorage.setItem(LS_SAVED, JSON.stringify(savedList));
      return {
        savedList,
        ...(s.loadedDevisId === id ? { state: buildInitialState(), loadedDevisId: null } : {}),
      };
    }),

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
