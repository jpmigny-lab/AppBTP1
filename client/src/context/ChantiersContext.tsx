import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { getChantiers, getClients, saveChantiers, saveClients } from '@/lib/repositories/appDataRepository';

const LS_CLIENTS = 'aosrenov:clients';
const LS_CHANTIERS = 'aosrenov:chantiers';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeChantier(raw: Chantier): Chantier {
  const ids = raw.assignedMemberIds;
  return {
    ...raw,
    assignedMemberIds: Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [],
  };
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const defaultClients: Client[] = [
  { id: '1', name: 'Jean Dupont', email: 'jean.dupont@email.com', phone: '06 12 34 56 78' },
  { id: '2', name: 'Marie Martin', email: 'marie.martin@email.com', phone: '06 98 76 54 32' },
  { id: '3', name: 'SCI Bellevue', email: 'gestion@sci-bellevue.fr', phone: '04 78 11 22 33' },
  { id: '4', name: 'Sophie Bernard', email: 's.bernard@proton.me', phone: '06 44 55 66 77' },
  { id: '5', name: 'Entreprise TechForm', email: 'chantiers@techform.fr', phone: '04 37 28 90 12' },
];

const defaultChantiers: Chantier[] = [
  {
    id: 'ch1',
    nom: 'Rénovation salle de bain — T4 Villeurbanne',
    clientId: '2',
    clientName: 'Marie Martin',
    dateDebut: '2026-02-10',
    duree: '4 semaines',
    images: [],
    statut: 'en cours',
    assignedMemberIds: ['demo-tm-1', 'demo-tm-3'],
  },
  {
    id: 'ch2',
    nom: 'Cuisine ouverte — Caluire',
    clientId: '1',
    clientName: 'Jean Dupont',
    dateDebut: '2026-03-01',
    duree: '6 semaines',
    images: [],
    statut: 'en cours',
    assignedMemberIds: ['demo-tm-2'],
  },
  {
    id: 'ch3',
    nom: 'Mise aux normes local commercial',
    clientId: '3',
    clientName: 'SCI Bellevue',
    dateDebut: '2026-03-20',
    duree: '2 semaines',
    images: [],
    statut: 'planifié',
    assignedMemberIds: [],
  },
  {
    id: 'ch4',
    nom: 'Isolation combles + VMR',
    clientId: '4',
    clientName: 'Sophie Bernard',
    dateDebut: '2025-11-05',
    duree: '10 jours',
    images: [],
    statut: 'terminé',
    assignedMemberIds: [],
  },
  {
    id: 'ch5',
    nom: 'Bureaux — faux plafonds et peinture',
    clientId: '5',
    clientName: 'Entreprise TechForm',
    dateDebut: '2026-01-15',
    duree: '3 semaines',
    images: [],
    statut: 'terminé',
    assignedMemberIds: [],
  },
];

export interface Chantier {
  id: string;
  nom: string;
  clientId: string;
  clientName: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: 'planifié' | 'en cours' | 'terminé';
  /** Membres affectés (ids `team_members` ou démo `demo-tm-*`). Vide = visible par toute l’équipe. */
  assignedMemberIds: string[];
}

interface ChantiersContextType {
  clients: Client[];
  chantiers: Chantier[];
  addClient: (client: Client) => void;
  addChantier: (chantier: Chantier) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  updateChantier: (id: string, updates: Partial<Chantier>) => void;
}

const ChantiersContext = createContext<ChantiersContextType | undefined>(undefined);

export function ChantiersProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(() => loadFromStorage(LS_CLIENTS, defaultClients));
  const [chantiers, setChantiers] = useState<Chantier[]>(() => {
    const loaded = loadFromStorage<Chantier[]>(LS_CHANTIERS, defaultChantiers);
    return loaded.map(normalizeChantier);
  });

  useEffect(() => {
    void (async () => {
      const [clientsRes, chantiersRes] = await Promise.all([getClients(), getChantiers()]);
      if (clientsRes.ok && clientsRes.data.length > 0) {
        setClients(clientsRes.data as Client[]);
        localStorage.setItem(LS_CLIENTS, JSON.stringify(clientsRes.data));
      }
      if (chantiersRes.ok && chantiersRes.data.length > 0) {
        setChantiers((chantiersRes.data as Chantier[]).map(normalizeChantier));
        localStorage.setItem(LS_CHANTIERS, JSON.stringify(chantiersRes.data));
      }
    })();
  }, []);

  const addClient = useCallback((client: Client) => {
    setClients((prev) => {
      const next = [...prev, client];
      try {
        localStorage.setItem(LS_CLIENTS, JSON.stringify(next));
      } catch (_) {}
      void saveClients(next as any);
      return next;
    });
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      try {
        localStorage.setItem(LS_CLIENTS, JSON.stringify(next));
      } catch (_) {}
      void saveClients(next as any);
      return next;
    });
    if (updates.name !== undefined) {
      setChantiers((prev) => {
        const next = prev.map((ch) => (ch.clientId === id ? { ...ch, clientName: updates.name! } : ch));
        try {
          localStorage.setItem(LS_CHANTIERS, JSON.stringify(next));
        } catch (_) {}
        void saveChantiers(next as any);
        return next;
      });
    }
  }, []);

  const addChantier = useCallback((chantier: Chantier) => {
    const normalized = normalizeChantier(chantier);
    setChantiers((prev) => {
      const next = [...prev, normalized];
      try {
        localStorage.setItem(LS_CHANTIERS, JSON.stringify(next));
      } catch (_) {}
      void saveChantiers(next as any);
      return next;
    });
  }, []);

  const updateChantier = useCallback((id: string, updates: Partial<Chantier>) => {
    setChantiers((prev) => {
      const next = prev.map((c) =>
        c.id === id ? normalizeChantier({ ...c, ...updates }) : c,
      );
      try {
        localStorage.setItem(LS_CHANTIERS, JSON.stringify(next));
      } catch (_) {}
      void saveChantiers(next as any);
      return next;
    });
  }, []);

  return (
    <ChantiersContext.Provider value={{ clients, chantiers, addClient, addChantier, updateClient, updateChantier }}>
      {children}
    </ChantiersContext.Provider>
  );
}

export function useChantiers() {
  const context = useContext(ChantiersContext);
  if (context === undefined) {
    throw new Error('useChantiers must be used within a ChantiersProvider');
  }
  return context;
}

