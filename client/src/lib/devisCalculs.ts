import {
  DevisItem,
  LignePrestation,
  TauxTVA,
  RecapFinancier,
} from '@/types/devis';

export function getLignes(items: DevisItem[]): LignePrestation[] {
  return items.filter((i): i is LignePrestation => i.type === 'ligne');
}

export function totalHTLigne(ligne: LignePrestation): number {
  return arrondir(ligne.quantite * ligne.prixUnitaireHT);
}

export function arrondir(val: number, decimales = 2): number {
  return Math.round(val * 10 ** decimales) / 10 ** decimales;
}

export function formatEuros(val: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(val);
}

export function formatPourcentage(val: number): string {
  return `${val.toString().replace('.', ',')} %`;
}

export function calculerRecap(
  items: DevisItem[],
  remiseType: 'pourcentage' | 'montant' | null,
  remiseValeur: number,
  acompteType: 'pourcentage' | 'montant' | null,
  acompteValeur: number,
): RecapFinancier {
  const lignes = getLignes(items);

  const totalHTBrut = arrondir(
    lignes.reduce((acc, l) => acc + totalHTLigne(l), 0),
  );

  let remiseMontant = 0;
  if (remiseType === 'pourcentage' && remiseValeur > 0) {
    remiseMontant = arrondir(totalHTBrut * (remiseValeur / 100));
  } else if (remiseType === 'montant') {
    remiseMontant = remiseValeur;
  }
  const totalHTApresRemise = arrondir(totalHTBrut - remiseMontant);

  const ratioRemise = totalHTBrut > 0 ? totalHTApresRemise / totalHTBrut : 1;

  const groupes = new Map<TauxTVA, number>();
  for (const ligne of lignes) {
    const htLigne = totalHTLigne(ligne) * ratioRemise;
    groupes.set(ligne.tauxTVA, (groupes.get(ligne.tauxTVA) ?? 0) + htLigne);
  }

  const detailTVA = Array.from(groupes.entries()).map(([taux, baseHT]) => ({
    taux,
    baseHT: arrondir(baseHT),
    montantTVA: arrondir(baseHT * (taux / 100)),
  }));

  const totalTVA = arrondir(
    detailTVA.reduce((acc, t) => acc + t.montantTVA, 0),
  );
  const totalTTC = arrondir(totalHTApresRemise + totalTVA);

  let acompteMontant = 0;
  if (acompteType === 'pourcentage' && acompteValeur > 0) {
    acompteMontant = arrondir(totalTTC * (acompteValeur / 100));
  } else if (acompteType === 'montant') {
    acompteMontant = acompteValeur;
  }

  return {
    totalHT: totalHTBrut,
    remiseType,
    remiseValeur,
    totalHTApresRemise,
    detailTVA,
    totalTVA,
    totalTTC,
    acompteType,
    acompteValeur,
    acompteMontant,
  };
}
