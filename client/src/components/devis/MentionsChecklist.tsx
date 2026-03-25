import { useDevisStore } from '@/store/devisStore';
import { getLignes } from '@/lib/devisCalculs';
import type { ChecklistItem, DevisState } from '@/types/devis';
import { Check, AlertCircle } from 'lucide-react';

export function getMentionsChecklistForState(
  state: DevisState,
): ChecklistItem[] {
  const { emetteur, client, details, items, recap, conditions, mentions } =
    state;
  const lignes = getLignes(items);

  return [
    {
      id: 'siret',
      label: 'SIRET renseigné',
      critique: true,
      valide: emetteur.siret.replace(/\s/g, '').length === 14,
    },
    {
      id: 'tva',
      label: "TVA ou mention d'exonération",
      critique: true,
      valide: !!emetteur.tvaIntra || mentions.tva293BActive,
    },
    {
      id: 'numero',
      label: 'Numéro de devis',
      critique: true,
      valide: !!details.numeroDevis,
    },
    {
      id: 'dateRedaction',
      label: 'Date de rédaction',
      critique: true,
      valide: !!details.dateRedaction,
    },
    {
      id: 'dateValidite',
      label: 'Date de validité',
      critique: true,
      valide: !!details.dateValidite,
    },
    {
      id: 'lignes',
      label: 'Au moins une prestation',
      critique: true,
      valide: lignes.length > 0,
    },
    {
      id: 'totalTTC',
      label: 'Total TTC calculé',
      critique: true,
      valide: recap.totalTTC >= 0,
    },
    {
      id: 'client',
      label: 'Nom client renseigné',
      critique: false,
      valide: !!client.nom,
    },
    {
      id: 'delai',
      label: "Délai d'exécution",
      critique: false,
      valide: !!conditions.delaiExecution,
    },
    {
      id: 'paiement',
      label: 'Conditions de paiement',
      critique: false,
      valide: !!conditions.modePaiement && !!conditions.delaiPaiement,
    },
    {
      id: 'penalites',
      label: 'Pénalités de retard',
      critique: false,
      valide: !!conditions.penalitesRetard,
    },
    {
      id: 'assurance',
      label: 'Assurance décennale (BTP)',
      critique: false,
      valide:
        !mentions.assuranceDecennaleActive || !!emetteur.assuranceDecennale,
    },
  ];
}

export function useMentionsChecklist(): ChecklistItem[] {
  const state = useDevisStore((s) => s.state);
  return getMentionsChecklistForState(state);
}

export function pdfPeutEtreGenerePourState(state: DevisState): boolean {
  const checklist = getMentionsChecklistForState(state);
  return checklist.filter((i) => i.critique).every((i) => i.valide);
}

export function usePDFPeutEtreGenere(): boolean {
  const checklist = useMentionsChecklist();
  return checklist.filter((i) => i.critique).every((i) => i.valide);
}

export function MentionsChecklist() {
  const checklist = useMentionsChecklist();

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Mentions obligatoires
      </p>
      <ul className="space-y-1">
        {checklist.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-2 text-xs ${
              item.valide ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {item.valide ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{item.label}</span>
            {item.critique && !item.valide && (
              <span className="text-muted-foreground">(obligatoire)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
