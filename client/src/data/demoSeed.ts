/**
 * Données fictives pour démonstration (BTP / rénovation France).
 * Utilisées au premier chargement lorsque le localStorage est vide.
 */
import { v4 as uuidv4 } from 'uuid';
import type {
  DevisSauvegarde,
  DevisState,
  DevisItem,
  LignePrestation,
  InfosEmetteur,
  PrestationFavorite,
} from '@/types/devis';
import { calculerRecap } from '@/lib/devisCalculs';

export const DEMO_EMETTEUR: InfosEmetteur = {
  raisonSociale: 'AXYOS Renov SARL',
  adresse: '12 rue des Artisans',
  codePostal: '69003',
  ville: 'Lyon',
  telephone: '04 72 88 12 34',
  email: 'contact@axyos-renov.fr',
  siret: '84930256100018',
  tvaIntra: 'FR45849302561',
  formeJuridique: 'SARL au capital de 20 000 €',
  assuranceDecennale: 'MAIF Pro — police n° DEC-2024-AXY-0892',
  logoBase64: null,
};

function ligne(
  designation: string,
  unite: LignePrestation['unite'],
  quantite: number,
  prixUnitaireHT: number,
  tauxTVA: LignePrestation['tauxTVA'],
  sectionId: string | null,
): LignePrestation {
  return {
    id: uuidv4(),
    type: 'ligne',
    designation,
    unite,
    quantite,
    prixUnitaireHT,
    tauxTVA,
    sectionId,
  };
}

function buildStateForDevis(params: {
  numeroDevis: string;
  clientNom: string;
  clientEmail: string;
  clientTel: string;
  lieu: string;
  description: string;
  items: DevisItem[];
}): DevisState {
  const { items } = params;
  const recap = calculerRecap(items, null, 0, null, 0);
  const today = new Date().toISOString().split('T')[0];
  const valid = new Date();
  valid.setDate(valid.getDate() + 30);
  return {
    emetteur: { ...DEMO_EMETTEUR },
    client: {
      nom: params.clientNom,
      adresse: '45 avenue Jean Jaurès',
      codePostal: '69100',
      ville: 'Villeurbanne',
      email: params.clientEmail,
      telephone: params.clientTel,
      typeClient: 'particulier',
    },
    details: {
      numeroDevis: params.numeroDevis,
      dateRedaction: today,
      dateValidite: valid.toISOString().split('T')[0],
      lieuExecution: params.lieu,
      descriptionChantier: params.description,
    },
    items,
    recap,
    conditions: {
      delaiExecution: '6 semaines à compter de la signature',
      modePaiement: 'Virement bancaire — 30 % à la commande, solde à la livraison',
      delaiPaiement: 'À réception de facture',
      penalitesRetard: "3 fois le taux d'intérêt légal en vigueur",
      indemniteRecouvrement: '40 €',
      reservePropriete: true,
      notes: 'Devis valable 30 jours. Travaux soumis à TVA réduite 10 % (rénovation).',
    },
    mentions: {
      assuranceDecennaleActive: true,
      rgeActive: true,
      tva293BActive: false,
      garantieParfaitAchevement: true,
      garantieBiennale: true,
      garantieDecennale: true,
    },
  };
}

export function getDemoSavedDevis(): DevisSauvegarde[] {
  const secSdb = uuidv4();
  const secCuisine = uuidv4();
  const now = new Date().toISOString();

  const items1: DevisItem[] = [
    { id: secSdb, type: 'section', titre: 'Salle de bain — niveau RDC' },
    ligne('Dépose ancien carrelage + évacuation gravats', 'forfait', 1, 480, 10, secSdb),
    ligne('Pose carrelage mural 60×60 (fourniture client)', 'm2', 22, 42, 10, secSdb),
    ligne('Pose carrelage sol antidérapant', 'm2', 8, 55, 10, secSdb),
    ligne('Fourniture et pose robinetterie Grohe', 'forfait', 1, 890, 10, secSdb),
    ligne('Étanchéité et raccordements plomberie', 'forfait', 1, 620, 10, secSdb),
  ];

  const items2: DevisItem[] = [
    { id: secCuisine, type: 'section', titre: 'Cuisine — rénovation complète' },
    ligne('Démolition ancienne cuisine + évacuation', 'forfait', 1, 650, 10, secCuisine),
    ligne('Pose meubles bas et plans de travail quartz', 'forfait', 1, 3200, 10, secCuisine),
    ligne('Raccordements électriques (four, plaques, LV)', 'forfait', 1, 420, 10, secCuisine),
    ligne('Peinture murs et plafond', 'm2', 28, 32, 10, secCuisine),
  ];

  const state1 = buildStateForDevis({
    numeroDevis: `DEV-${new Date().getFullYear()}-001`,
    clientNom: 'Marie Martin',
    clientEmail: 'marie.martin@email.com',
    clientTel: '06 98 76 54 32',
    lieu: 'Appartement T4 — Villeurbanne',
    description: 'Rénovation salle de bain principale — carrelage, plomberie, robinetterie.',
    items: items1,
  });

  const state2 = buildStateForDevis({
    numeroDevis: `DEV-${new Date().getFullYear()}-002`,
    clientNom: 'Jean Dupont',
    clientEmail: 'jean.dupont@email.com',
    clientTel: '06 12 34 56 78',
    lieu: 'Maison — Caluire-et-Cuire',
    description: 'Rénovation cuisine ouverte sur séjour — dépose, pose, finitions.',
    items: items2,
  });

  const state3 = buildStateForDevis({
    numeroDevis: `DEV-${new Date().getFullYear()}-003`,
    clientNom: 'SCI Bellevue',
    clientEmail: 'gestion@sci-bellevue.fr',
    clientTel: '04 78 11 22 33',
    lieu: 'Local commercial — Lyon 7e',
    description: 'Devis préliminaire — mise aux normes électrique et peinture locaux.',
    items: [
      ligne('Mise aux normes tableau électrique', 'forfait', 1, 1850, 10, null),
      ligne('Peinture locaux (murs + plafonds)', 'm2', 85, 28, 10, null),
    ],
  });

  return [
    { id: uuidv4(), nom: 'Martin — Salle de bain', state: state1, createdAt: now, updatedAt: now },
    { id: uuidv4(), nom: 'Dupont — Cuisine', state: state2, createdAt: now, updatedAt: now },
    { id: uuidv4(), nom: 'SCI Bellevue — Local', state: state3, createdAt: now, updatedAt: now },
  ];
}

export function getDemoCatalogue(): PrestationFavorite[] {
  return [
    {
      id: uuidv4(),
      label: 'Pose carrelage sol standard',
      designation: 'Pose carrelage sol collé (fourniture hors devis)',
      unite: 'm2',
      quantite: 1,
      prixUnitaireHT: 38,
      tauxTVA: 10,
    },
    {
      id: uuidv4(),
      label: 'Peinture acrylique 2 couches',
      designation: 'Peinture murs et plafonds — finition mate',
      unite: 'm2',
      quantite: 1,
      prixUnitaireHT: 28,
      tauxTVA: 10,
    },
    {
      id: uuidv4(),
      label: 'Forfait dépose + évacuation',
      designation: 'Dépose ancien revêtement et évacuation gravats',
      unite: 'forfait',
      quantite: 1,
      prixUnitaireHT: 450,
      tauxTVA: 10,
    },
  ];
}
