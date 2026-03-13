import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { DevisDocument } from '@/components/devis/DevisDocument';
import type { DevisState } from '@/types/devis';

/**
 * Génère le PDF et l'ouvre dans la visionneuse native du navigateur
 * (fond gris + boutons Imprimer / Télécharger intégrés)
 */
export async function ouvrirPDFNatif(state: DevisState): Promise<void> {
  const element = React.createElement(DevisDocument, { state });
  // @react-pdf/renderer attend un Document en racine ; DevisDocument en contient un
  const blob = await pdf(element as React.ReactElement).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  const tab = window.open(blobUrl, '_blank');
  if (tab) {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
}

/**
 * Télécharge directement le PDF sans ouvrir un nouvel onglet
 */
export async function telechargerPDF(
  state: DevisState,
  nomFichier?: string,
): Promise<void> {
  const element = React.createElement(DevisDocument, { state });
  const blob = await pdf(element as React.ReactElement).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = nomFichier ?? `Devis-${state.details.numeroDevis}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
}

/**
 * mailto: ne supporte pas les pièces jointes dans les navigateurs.
 * Ouvre le client mail avec sujet/corps pré-remplis.
 */
export function ouvrirEmailClient(state: DevisState): void {
  const sujet = encodeURIComponent(
    `Devis ${state.details.numeroDevis} — ${state.client.nom}`,
  );
  const corps = encodeURIComponent(
    `Bonjour ${state.client.nom},\n\nVeuillez trouver ci-joint notre devis n° ${state.details.numeroDevis} d'un montant de ${state.recap.totalTTC.toFixed(2)} € TTC.\n\nCe devis est valable jusqu'au ${state.details.dateValidite}.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${state.emetteur.raisonSociale}`,
  );
  const dest = encodeURIComponent(state.client.email || '');
  window.open(`mailto:${dest}?subject=${sujet}&body=${corps}`, '_blank');
}
