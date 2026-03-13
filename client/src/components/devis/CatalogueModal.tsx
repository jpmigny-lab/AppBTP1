import { useDevisStore } from '@/store/devisStore';
import type { PrestationFavorite } from '@/types/devis';
import { formatEuros } from '@/lib/devisCalculs';
import { UNITE_LABELS } from '@/types/devis';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  sectionId?: string | null;
}

export function CatalogueModal({ children, sectionId = null }: Props) {
  const catalogue = useDevisStore((s) => s.catalogue);
  const insertFromCatalogue = useDevisStore((s) => s.insertFromCatalogue);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Mes prestations favorites
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2">
          {catalogue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucune prestation enregistrée. Ajoutez des lignes depuis le devis
              pour les sauvegarder ici.
            </p>
          ) : (
            catalogue.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium text-sm">{p.label || p.designation}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.designation} — {UNITE_LABELS[p.unite]} —{' '}
                    {formatEuros(p.prixUnitaireHT)} HT — TVA {p.tauxTVA} %
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => insertFromCatalogue(p, sectionId)}
                >
                  Insérer
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
