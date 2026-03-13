// ─── Primitives ────────────────────────────────────────────────────────────────

export type Unite = 'm2' | 'ml' | 'forfait' | 'heure' | 'u';

export const UNITE_LABELS: Record<Unite, string> = {
  m2: 'm²',
  ml: 'ml',
  forfait: 'Forfait',
  heure: 'Heure',
  u: 'U',
};

export type TauxTVA = 20 | 10 | 5.5 | 0;

export const TVA_LABELS: Record<TauxTVA, string> = {
  20: '20% — Taux normal',
  10: '10% — Travaux de rénovation',
  5.5: '5,5% — Amélioration énergétique',
  0: '0% — Exonéré / Auto-entrepreneur',
};

// Mots-clés BTP → suggestion TVA 10%
export const TVA_KEYWORDS_10: string[] = [
  'rénovation', 'renovation', 'peinture', 'carrelage', 'plomberie',
  'électricité', 'electricite', 'isolation', 'menuiserie', 'revêtement',
  'revetement', 'sol', 'mur', 'plafond', 'cuisine', 'salle de bain',
  'chauffage', 'sanitaire', 'maçonnerie', 'maconnerie',
];

// Mots-clés → suggestion TVA 5.5%
export const TVA_KEYWORDS_5_5: string[] = [
  'pompe à chaleur', 'pac', 'panneaux solaires', 'photovoltaïque',
  'photovoltaique', 'chauffe-eau thermodynamique', 'isolation thermique',
  'VMC', 'double vitrage', 'energetique', 'énergétique',
];

// ─── Éléments du devis ────────────────────────────────────────────────────────

export type ItemType = 'ligne' | 'section';

export interface LignePrestation {
  id: string;
  type: 'ligne';
  designation: string;
  unite: Unite;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: TauxTVA;
  sectionId: string | null;
}

export interface SectionDevis {
  id: string;
  type: 'section';
  titre: string;
}

export type DevisItem = LignePrestation | SectionDevis;

// ─── Blocs formulaire ─────────────────────────────────────────────────────────

export interface InfosEmetteur {
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
  tvaIntra: string;
  formeJuridique: string;
  assuranceDecennale: string;
  logoBase64: string | null;
}

export interface InfosClient {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  email: string;
  telephone: string;
  typeClient: 'particulier' | 'professionnel';
}

export interface DetailsDevis {
  numeroDevis: string;
  dateRedaction: string;
  dateValidite: string;
  lieuExecution: string;
  descriptionChantier: string;
}

export interface RecapFinancier {
  totalHT: number;
  remiseType: 'pourcentage' | 'montant' | null;
  remiseValeur: number;
  totalHTApresRemise: number;
  detailTVA: { taux: TauxTVA; baseHT: number; montantTVA: number }[];
  totalTVA: number;
  totalTTC: number;
  acompteType: 'pourcentage' | 'montant' | null;
  acompteValeur: number;
  acompteMontant: number;
}

export interface Conditions {
  delaiExecution: string;
  modePaiement: string;
  delaiPaiement: string;
  penalitesRetard: string;
  indemniteRecouvrement: string;
  reservePropriete: boolean;
  notes: string;
}

export interface MentionsLegales {
  assuranceDecennaleActive: boolean;
  rgeActive: boolean;
  tva293BActive: boolean;
  garantieParfaitAchevement: boolean;
  garantieBiennale: boolean;
  garantieDecennale: boolean;
}

// ─── State global ─────────────────────────────────────────────────────────────

export interface DevisState {
  emetteur: InfosEmetteur;
  client: InfosClient;
  details: DetailsDevis;
  items: DevisItem[];
  recap: RecapFinancier;
  conditions: Conditions;
  mentions: MentionsLegales;
}

// ─── Catalogue & modèles ──────────────────────────────────────────────────────

export type PrestationFavorite = Omit<LignePrestation, 'id' | 'type' | 'sectionId'> & {
  id: string;
  label: string;
};

export interface ModeleDevis {
  id: string;
  nom: string;
  state: DevisState;
  createdAt: string;
}

export interface DevisSauvegarde {
  id: string;
  nom: string;
  state: DevisState;
  createdAt: string;
  updatedAt: string;
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
  critique: boolean;
  valide: boolean;
}
