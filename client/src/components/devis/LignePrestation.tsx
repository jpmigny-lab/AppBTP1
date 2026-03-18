import { useDevisStore } from '@/store/devisStore';
import { totalHTLigne, formatEuros } from '@/lib/devisCalculs';
import {
  LignePrestation as LigneType,
  UNITE_LABELS,
  TVA_LABELS,
  TVA_KEYWORDS_10,
  TVA_KEYWORDS_5_5,
  type Unite,
  type TauxTVA,
} from '@/types/devis';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Copy, Trash2, GripVertical, Star } from 'lucide-react';
import { useRef, useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const UNITES: Unite[] = ['m2', 'ml', 'forfait', 'heure', 'u'];
const TAUX_TVA: TauxTVA[] = [20, 10, 5.5, 0];

function suggestTVA(designation: string): TauxTVA | null {
  const lower = designation.toLowerCase();
  if (TVA_KEYWORDS_5_5.some((k) => lower.includes(k))) return 5.5;
  if (TVA_KEYWORDS_10.some((k) => lower.includes(k))) return 10;
  return null;
}

interface Props {
  ligne: LigneType;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function LignePrestation({ ligne, dragHandleProps }: Props) {
  const [favDialogOpen, setFavDialogOpen] = useState(false);
  const [favLabel, setFavLabel] = useState('');
  const updateLigne = useDevisStore((s) => s.updateLigne);
  const removeLigne = useDevisStore((s) => s.removeLigne);
  const duplicateLigne = useDevisStore((s) => s.duplicateLigne);
  const addToCatalogue = useDevisStore((s) => s.addToCatalogue);
  const designationRef = useRef<HTMLInputElement>(null);

  const handleDesignationChange = useCallback(
    (value: string) => {
      updateLigne(ligne.id, { designation: value });
      const suggested = suggestTVA(value);
      if (suggested !== null) {
        updateLigne(ligne.id, { tauxTVA: suggested });
      }
    },
    [ligne.id, updateLigne],
  );

  const totalHT = totalHTLigne(ligne);

  const inputClass = 'h-10 text-base min-w-0 bg-white text-gray-900 placeholder:text-gray-500';
  const triggerClass = 'h-10 text-base min-w-0 bg-white text-gray-900 [&>span]:text-gray-900';

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/30 rounded-lg border">
        <div
          className="flex items-center justify-center cursor-grab active:cursor-grabbing touch-none self-center shrink-0"
          {...dragHandleProps}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1.5 min-w-[140px] flex-1 basis-40">
          <Label className="text-sm">Désignation</Label>
          <Input
            ref={designationRef}
            value={ligne.designation}
            onChange={(e) => handleDesignationChange(e.target.value)}
            placeholder="Ex. Pose carrelage sol"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5 min-w-[72px] w-20 shrink-0">
          <Label className="text-sm">Unité</Label>
          <Select
            value={ligne.unite}
            onValueChange={(v) => updateLigne(ligne.id, { unite: v as Unite })}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITES.map((u) => (
                <SelectItem key={u} value={u}>
                  {UNITE_LABELS[u]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-[64px] w-16 shrink-0">
          <Label className="text-sm">Qté</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={ligne.quantite || ''}
            onChange={(e) =>
              updateLigne(ligne.id, {
                quantite: parseFloat(e.target.value) || 0,
              })
            }
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5 min-w-[80px] w-24 shrink-0">
          <Label className="text-sm">PU HT (€)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={ligne.prixUnitaireHT || ''}
            onChange={(e) =>
              updateLigne(ligne.id, {
                prixUnitaireHT: parseFloat(e.target.value) || 0,
              })
            }
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5 min-w-[72px] w-20 shrink-0">
          <Label className="text-sm">TVA</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={String(ligne.tauxTVA)}
                onValueChange={(v) =>
                  updateLigne(ligne.id, { tauxTVA: Number(v) as TauxTVA })
                }
              >
                <SelectTrigger className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAUX_TVA.map((t) => (
                    <SelectItem key={t} value={String(t)}>
                      {t} %
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">
                {TVA_LABELS[ligne.tauxTVA]}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-end h-10 font-medium text-base shrink-0 min-w-[5rem]">
          {formatEuros(totalHT)}
        </div>
        <div className="flex gap-1 items-end h-10 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              setFavLabel(ligne.designation || '');
              setFavDialogOpen(true);
            }}
            title="Ajouter aux favoris"
          >
            <Star className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => duplicateLigne(ligne.id)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive shrink-0"
            onClick={() => removeLigne(ligne.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={favDialogOpen} onOpenChange={setFavDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter aux prestations favorites</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom dans le catalogue</Label>
              <Input
                value={favLabel}
                onChange={(e) => setFavLabel(e.target.value)}
                placeholder="Ex. Pose carrelage 60x60"
              />
            </div>
            <Button
              onClick={() => {
                addToCatalogue({
                  label: favLabel.trim() || ligne.designation || 'Prestation',
                  designation: ligne.designation,
                  unite: ligne.unite,
                  quantite: ligne.quantite,
                  prixUnitaireHT: ligne.prixUnitaireHT,
                  tauxTVA: ligne.tauxTVA,
                });
                setFavDialogOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
