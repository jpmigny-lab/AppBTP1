export type MailCategory =
  | "intervention"
  | "devis"
  | "validation_devis"
  | "relance_facture"
  | "autre";

export type MailAttachment = {
  id: string;
  name: string;
  url?: string;
};

export type MailMessage = {
  id: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  /** En-tête From brut (affichage / mailto) */
  fromDisplay: string;
  preview: string;
  receivedAt: Date;
  category: MailCategory;
  starred: boolean;
  hasAttachment: boolean;
  urgent: boolean;
  attachments: MailAttachment[];
  read: boolean;
  archived?: boolean;
};

export const CATEGORY_LABELS: Record<MailCategory, string> = {
  intervention: "Demande d'intervention",
  devis: "Demande de devis",
  validation_devis: "Validation de devis",
  relance_facture: "Relance de facture",
  autre: "Autre",
};

/** Pastilles sémantiques (hors charte primaire violet) */
export const CATEGORY_DOT_CLASS: Record<MailCategory, string> = {
  intervention: "bg-sky-400",
  devis: "bg-fuchsia-400",
  validation_devis: "bg-emerald-400",
  relance_facture: "bg-amber-400",
  autre: "bg-white/40",
};

export const FILTER_CHIPS: MailCategory[] = [
  "intervention",
  "devis",
  "validation_devis",
  "relance_facture",
];

export function categoryBadgeLabel(cat: MailCategory): string {
  return CATEGORY_LABELS[cat].toUpperCase();
}

export function parseFromHeader(from: string): { name: string; email: string } {
  const trimmed = (from || "").trim();
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    const rawName = angle[1].replace(/^"|"$/g, "").trim();
    const email = angle[2].trim();
    return { name: rawName || email, email };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+/.test(trimmed)) {
    const local = trimmed.split("@")[0];
    return { name: local || trimmed, email: trimmed };
  }
  return { name: trimmed || "—", email: "" };
}

export function parseMailDate(raw: string): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Affichage liste : heure du jour, Hier, ou date courte (ex. 14 déc.) */
export function formatMailDateShort(d: Date, now: Date = new Date()): string {
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (isYesterday) return "Hier";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatMailTimeLong(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultBodyFromPreview(preview: string): string {
  return `${preview}\n\n— Contenu complet : ouvrez le message dans votre messagerie (aperçu API v1).`;
}

/** À partir d’un message API minimal (Gmail / Outlook) */
export function enrichFromProviderRow(row: {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview: string;
  read?: boolean;
}): MailMessage {
  const { name, email } = parseFromHeader(row.from);
  const receivedAt = parseMailDate(row.date);
  return {
    id: row.id,
    subject: row.subject,
    body: defaultBodyFromPreview(row.preview),
    senderName: name,
    senderEmail: email,
    fromDisplay: row.from,
    preview: row.preview,
    receivedAt,
    category: "autre",
    starred: false,
    hasAttachment: false,
    urgent: false,
    attachments: [],
    read: row.read !== false,
  };
}

function headerValue(
  headers: { name?: string; value?: string }[] | undefined,
  name: string,
): string {
  if (!headers?.length) return "";
  const h = headers.find(
    (x) => (x.name || "").toLowerCase() === name.toLowerCase(),
  );
  return h?.value || "";
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeGmailMessages(raw: unknown[]): MailMessage[] {
  return raw.map((m: any) =>
    enrichFromProviderRow({
      id: m.id || randomId(),
      subject: headerValue(m.payload?.headers, "Subject") || "(Sans objet)",
      from: headerValue(m.payload?.headers, "From") || "—",
      date: headerValue(m.payload?.headers, "Date") || "",
      preview: m.snippet || "",
      read: !m.labelIds?.includes?.("UNREAD"),
    }),
  );
}

export function normalizeOutlookMessages(raw: unknown[]): MailMessage[] {
  return raw.map((m: any) =>
    enrichFromProviderRow({
      id: m.id || randomId(),
      subject: m.subject || "(Sans objet)",
      from: m.from?.emailAddress
        ? `${m.from.emailAddress.name || ""} <${m.from.emailAddress.address || ""}>`.trim()
        : "—",
      date: m.receivedDateTime || "",
      preview: m.bodyPreview || "",
      read: m.isRead !== false,
    }),
  );
}

/** 4 messages alignés sur la maquette (filtres + urgent + PJ) */
export function createDemoMailMessages(): MailMessage[] {
  const now = new Date();
  const today1032 = new Date(now);
  today1032.setHours(10, 32, 0, 0);

  return [
    {
      id: "demo-intervention",
      subject: "Fuite d'eau - Urgent",
      body: `Bonjour,\n\nNous constatons une fuite d'eau importante dans les parties communes du bâtiment A. Merci d'intervenir dans les plus brefs délais.\n\nCordialement,\nLe syndic`,
      senderName: "Syndic Résidence Voltaire",
      senderEmail: "contact@residence-voltaire.fr",
      fromDisplay: "Syndic Résidence Voltaire <contact@residence-voltaire.fr>",
      preview:
        "Fuite constatée cage d'escalier — intervention souhaitée aujourd'hui si possible.",
      receivedAt: today1032,
      category: "intervention",
      starred: true,
      hasAttachment: true,
      urgent: true,
      attachments: [
        { id: "pj-1", name: "photo_fuite.jpg", url: undefined },
      ],
      read: false,
    },
    {
      id: "demo-devis",
      subject: "Demande de devis rénovation salle de bain",
      body: `Bonjour,\n\nNous souhaiterions obtenir un devis pour la rénovation complète d'une salle de bain d'environ 6 m².\n\nMerci de nous recontacter.\n\nBien à vous`,
      senderName: "Marie Dupont",
      senderEmail: "marie.dupont@email.fr",
      fromDisplay: "Marie Dupont <marie.dupont@email.fr>",
      preview: "Pourriez-vous nous envoyer un devis détaillé avec délai d'exécution ?",
      receivedAt: new Date(now.getTime() - 86400000),
      category: "devis",
      starred: false,
      hasAttachment: false,
      urgent: false,
      attachments: [],
      read: true,
    },
    {
      id: "demo-validation",
      subject: "Accord sur devis n°2025-118",
      body: `Bonjour,\n\nNous validons le devis n°2025-118 pour les travaux prévus. Vous pouvez lancer le planning.\n\nCordialement`,
      senderName: "Gestion ABC",
      senderEmail: "projets@gestion-abc.fr",
      fromDisplay: "Gestion ABC <projets@gestion-abc.fr>",
      preview: "Validation du montant et des prestations — merci de confirmer la date de démarrage.",
      receivedAt: new Date(now.getTime() - 86400000 * 3),
      category: "validation_devis",
      starred: false,
      hasAttachment: false,
      urgent: false,
      attachments: [],
      read: true,
    },
    {
      id: "demo-relance",
      subject: "Relance facture F-2025-089",
      body: `Bonjour,\n\nSauf erreur de notre part, la facture F-2025-089 n'a pas encore été réglée. Merci de procéder au règlement sous 8 jours.\n\nCordialement,\nService comptabilité`,
      senderName: "Compta Fournisseur Pro",
      senderEmail: "compta@fournisseur-pro.fr",
      fromDisplay: "Compta Fournisseur Pro <compta@fournisseur-pro.fr>",
      preview: "Nous vous prions de bien vouloir régulariser la situation au plus vite.",
      receivedAt: new Date(now.getTime() - 86400000 * 10),
      category: "relance_facture",
      starred: false,
      hasAttachment: false,
      urgent: false,
      attachments: [],
      read: true,
    },
  ];
}
