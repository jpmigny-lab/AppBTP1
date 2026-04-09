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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Impossible de convertir le PDF en base64"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Erreur FileReader"));
    reader.readAsDataURL(blob);
  });
}

function isPdfSafeDataImage(src: string): boolean {
  const s = src.toLowerCase();
  return s.startsWith('data:image/png') || s.startsWith('data:image/jpeg') || s.startsWith('data:image/jpg');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Chargement logo impossible'));
    img.src = src;
  });
}

async function normalizeLogoForPdf(logoBase64: string | null): Promise<string | null> {
  if (!logoBase64) return null;
  if (typeof window === 'undefined') return logoBase64;
  if (isPdfSafeDataImage(logoBase64)) return logoBase64;

  try {
    const img = await loadImage(logoBase64);
    const width = Math.max(1, Math.round(img.naturalWidth || img.width || 1));
    const height = Math.max(1, Math.round(img.naturalHeight || img.height || 1));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function envoyerDevisParEmail(state: DevisState): Promise<{ messageId: string }> {
  // Normalise le logo pour garder l'image dans le PDF email sans erreurs react-pdf.
  const safeLogo = await normalizeLogoForPdf(state.emetteur.logoBase64);
  const stateForMail: DevisState = {
    ...state,
    emetteur: {
      ...state.emetteur,
      logoBase64: safeLogo,
    },
  };
  const element = React.createElement(DevisDocument, { state: stateForMail });
  const blob = await pdf(element as React.ReactElement).toBlob();
  const contentBase64 = await blobToBase64(blob);
  const filename = `Devis-${state.details.numeroDevis}.pdf`;

  const payload = {
    to: state.client.email,
    subject: `Devis ${state.details.numeroDevis} — ${state.client.nom}`,
    html: `
      <p>Bonjour ${state.client.nom},</p>
      <p>Veuillez trouver en pièce jointe notre devis <strong>${state.details.numeroDevis}</strong>.</p>
      <p>Montant: <strong>${state.recap.totalTTC.toFixed(2)} EUR TTC</strong></p>
      <p>Validité: ${state.details.dateValidite}</p>
      <p>Cordialement,<br/>${state.emetteur.raisonSociale}</p>
    `,
    text: `Bonjour ${state.client.nom}, veuillez trouver le devis ${state.details.numeroDevis} en pièce jointe.`,
    attachments: [
      {
        filename,
        contentBase64,
        contentType: "application/pdf",
      },
    ],
    metadata: {
      numeroDevis: state.details.numeroDevis,
      clientNom: state.client.nom,
    },
  };

  const isLocalDev = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const apiBase =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    (isLocalDev && window.location.port !== "5001" ? "http://localhost:5001" : "");
  const endpoint = `${apiBase}/api/mail/send-quote`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = resp.headers.get("content-type") || "";
  const json = contentType.includes("application/json")
    ? await resp.json().catch(() => null)
    : null;
  const textBody = !json ? await resp.text().catch(() => "") : "";
  if (!resp.ok || !json?.ok) {
    const message =
      json?.message ||
      (resp.status === 404
        ? `Endpoint ${endpoint} introuvable.`
        : resp.status === 413
          ? "PDF trop volumineux pour l’API (limite serveur atteinte)."
          : `Erreur envoi email (${resp.status})${textBody ? `: ${textBody.slice(0, 180)}` : ""}`);
    const err = new Error(message);
    (err as any).code = json?.error || "UPSTREAM_ERROR";
    (err as any).status = resp.status;
    throw err;
  }

  return { messageId: String(json.messageId) };
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
