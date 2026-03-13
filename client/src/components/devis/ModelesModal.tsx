import { useState } from 'react';
import { useDevisStore } from '@/store/devisStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileStack } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export function ModelesModal({ children }: Props) {
  const [open, setOpen] = useState(false);
  const modeles = useDevisStore((s) => s.modeles);
  const loadFromTemplate = useDevisStore((s) => s.loadFromTemplate);
  const deleteModele = useDevisStore((s) => s.deleteModele);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            Modèles de devis
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2">
          {modeles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucun modèle enregistré. Utilisez « Enregistrer comme modèle » dans
              la barre d'actions pour sauvegarder le devis en cours.
            </p>
          ) : (
            modeles.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium text-sm">{m.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    Créé le {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      loadFromTemplate(m);
                      setOpen(false);
                    }}
                  >
                    Charger
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteModele(m.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
