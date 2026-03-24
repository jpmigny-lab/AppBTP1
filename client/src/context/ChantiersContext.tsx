import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const [chantiers, setChantiers] = useState<Chantier[]>(() =>
    loadFromStorage(LS_CHANTIERS, defaultChantiers),
  );

  const addClient = useCallback((client: Client) => {
    setClients((prev) => {
      const next = [...prev, client];
      try {
        localStorage.setItem(LS_CLIENTS, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      try {
        localStorage.setItem(LS_CLIENTS, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    if (updates.name !== undefined) {
      setChantiers((prev) => {
        const next = prev.map((ch) => (ch.clientId === id ? { ...ch, clientName: updates.name! } : ch));
        try {
          localStorage.setItem(LS_CHANTIERS, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    }
  }, []);

  const addChantier = useCallback((chantier: Chantier) => {
    setChantiers((prev) => {
      const next = [...prev, chantier];
      try {
        localStorage.setItem(LS_CHANTIERS, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const updateChantier = useCallback((id: string, updates: Partial<Chantier>) => {
    setChantiers((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      try {
        localStorage.setItem(LS_CHANTIERS, JSON.stringify(next));
      } catch (_) {}
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

