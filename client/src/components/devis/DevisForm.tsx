import { useDevisStore } from '@/store/devisStore';
import { formatEuros } from '@/lib/devisCalculs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Building2, User, FileText, ListOrdered, Euro, FileCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SortableLigneRow } from './SortableLigneRow';
import { SortableSectionRow } from './SortableSectionRow';
import { useChantiers, type Client as AppClient } from '@/context/ChantiersContext';
import type { DevisItem } from '@/types/devis';

const MAX_LOGO_BYTES = 200 * 1024;

function compressLogo(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const max = 300;
      if (width > max || height > max) {
        if (width > height) {
          height = (height / width) * max;
          width = max;
        } else {
          width = (width / height) * max;
          height = max;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const tryExport = () => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > MAX_LOGO_BYTES && quality > 0.3) {
          quality -= 0.1;
          tryExport();
        } else {
          resolve(dataUrl);
        }
      };
      tryExport();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function DevisForm() {
  const { clients } = useChantiers();
  const state = useDevisStore((s) => s.state);
  const setEmetteur = useDevisStore((s) => s.setEmetteur);
  const setClient = useDevisStore((s) => s.setClient);
  const setDetails = useDevisStore((s) => s.setDetails);
  const setConditions = useDevisStore((s) => s.setConditions);
  const setMentions = useDevisStore((s) => s.setMentions);
  const setRecapRemiseAcompte = useDevisStore((s) => s.setRecapRemiseAcompte);
  const addLigne = useDevisStore((s) => s.addLigne);
  const addSection = useDevisStore((s) => s.addSection);
  const reorderItems = useDevisStore((s) => s.reorderItems);
  const items = state.items;
  const logoInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderItems(arrayMove(items, oldIdx, newIdx));
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressLogo(file);
    setEmetteur({ logoBase64: dataUrl });
  };

  const [emetteurOpen, setEmetteurOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lignesOpen, setLignesOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [selectedAppClientId, setSelectedAppClientId] = useState<string | null>(null);

  const handleSelectAppClient = (clientId: string) => {
    if (!clientId) {
      setSelectedAppClientId(null);
      return;
    }
    const appClient = clients.find((c: AppClient) => c.id === clientId);
    if (appClient) {
      setSelectedAppClientId(appClient.id);
      setClient({
        nom: appClient.name,
        email: appClient.email,
        telephone: appClient.phone,
      });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Bloc 1 — Émetteur (dépliable) */}
      <Collapsible open={emetteurOpen} onOpenChange={setEmetteurOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity">
              <Building2 className="h-5 w-5 shrink-0" />
              <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                Informations émetteur
              </CardTitle>
              {emetteurOpen ? (
                <ChevronUp className="h-5 w-5 shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-start">
            {state.emetteur.logoBase64 && (
              <img
                src={state.emetteur.logoBase64}
                alt="Logo"
                className="h-14 w-28 object-contain border rounded"
              />
            )}
            <div className="flex-1">
              <Label>Logo (optionnel)</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
              >
                {state.emetteur.logoBase64 ? 'Changer' : 'Ajouter logo'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raison sociale / Nom</Label>
              <Input
                value={state.emetteur.raisonSociale}
                onChange={(e) => setEmetteur({ raisonSociale: e.target.value })}
                placeholder="SARL Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label>SIRET</Label>
              <Input
                value={state.emetteur.siret}
                onChange={(e) => setEmetteur({ siret: e.target.value })}
                placeholder="123 456 789 00012"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Adresse</Label>
              <Input
                value={state.emetteur.adresse}
                onChange={(e) => setEmetteur({ adresse: e.target.value })}
                placeholder="12 rue des Artisans"
              />
            </div>
            <div className="space-y-2">
              <Label>Code postal</Label>
              <Input
                value={state.emetteur.codePostal}
                onChange={(e) => setEmetteur({ codePostal: e.target.value })}
                placeholder="75001"
              />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={state.emetteur.ville}
                onChange={(e) => setEmetteur({ ville: e.target.value })}
                placeholder="Paris"
              />
            </div>
            <div className="space-y-2">
              <Label>TVA intracommunautaire</Label>
              <Input
                value={state.emetteur.tvaIntra}
                onChange={(e) => setEmetteur({ tvaIntra: e.target.value })}
                placeholder="FR12345678901"
              />
            </div>
            <div className="space-y-2">
              <Label>Forme juridique</Label>
              <Input
                value={state.emetteur.formeJuridique}
                onChange={(e) =>
                  setEmetteur({ formeJuridique: e.target.value })
                }
                placeholder="SARL, SAS, Auto-entrepreneur..."
              />
            </div>
            <div className="space-y-2">
              <Label>Assurance décennale (n° police)</Label>
              <Input
                value={state.emetteur.assuranceDecennale}
                onChange={(e) =>
                  setEmetteur({ assuranceDecennale: e.target.value })
                }
                placeholder="Obligatoire BTP"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={state.emetteur.telephone}
                onChange={(e) => setEmetteur({ telephone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={state.emetteur.email}
                onChange={(e) => setEmetteur({ email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bloc 2 — Client (dépliable) */}
      <Collapsible open={clientOpen} onOpenChange={setClientOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity">
              <User className="h-5 w-5 shrink-0" />
              <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                Client
              </CardTitle>
              {clientOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sélectionner un client existant</Label>
            <Select
              value={selectedAppClientId ?? 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  setSelectedAppClientId(null);
                } else {
                  handleSelectAppClient(value);
                }
              }}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/60 [&>span]:text-white">
                <SelectValue placeholder="Saisie manuelle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Saisie manuelle</SelectItem>
                {clients.map((c: AppClient) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` — ${c.email}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <Label>Type</Label>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-normal">Particulier</Label>
              <Switch
                checked={state.client.typeClient === 'professionnel'}
                onCheckedChange={(checked) =>
                  setClient({
                    typeClient: checked ? 'professionnel' : 'particulier',
                  })
                }
              />
              <Label className="text-sm font-normal">Professionnel</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Nom / Raison sociale</Label>
              <Input
                value={state.client.nom}
                onChange={(e) => setClient({ nom: e.target.value })}
                placeholder="M. Martin"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Adresse</Label>
              <Input
                value={state.client.adresse}
                onChange={(e) => setClient({ adresse: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code postal</Label>
              <Input
                value={state.client.codePostal}
                onChange={(e) => setClient({ codePostal: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={state.client.ville}
                onChange={(e) => setClient({ ville: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={state.client.email}
                onChange={(e) => setClient({ email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={state.client.telephone}
                onChange={(e) => setClient({ telephone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bloc 3 — Détails du devis (dépliable) */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity">
              <FileText className="h-5 w-5 shrink-0" />
              <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                Détails du devis
              </CardTitle>
              {detailsOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numéro de devis</Label>
              <Input
                value={state.details.numeroDevis}
                onChange={(e) => setDetails({ numeroDevis: e.target.value })}
                placeholder="DEV-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Date de rédaction</Label>
              <Input
                type="date"
                value={state.details.dateRedaction}
                onChange={(e) =>
                  setDetails({ dateRedaction: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date de validité</Label>
              <Input
                type="date"
                value={state.details.dateValidite}
                onChange={(e) =>
                  setDetails({ dateValidite: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Lieu d'exécution des travaux</Label>
              <Input
                value={state.details.lieuExecution}
                onChange={(e) =>
                  setDetails({ lieuExecution: e.target.value })
                }
                placeholder="Adresse du chantier"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description du chantier</Label>
              <Textarea
                value={state.details.descriptionChantier}
                onChange={(e) =>
                  setDetails({ descriptionChantier: e.target.value })
                }
                placeholder="Description générale..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bloc 4 — Lignes (dépliable) */}
      <Collapsible open={lignesOpen} onOpenChange={setLignesOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity flex-1 min-w-0">
                <ListOrdered className="h-5 w-5 shrink-0" />
                <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                  Lignes de prestation
                </CardTitle>
                {lignesOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
              </div>
            </CollapsibleTrigger>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection()}
              >
                + Section
              </Button>
              <Button type="button" size="sm" onClick={() => addLigne()}>
                + Ligne
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
        <CardContent className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune ligne. Ajoutez une ligne ou une section.
                </p>
              ) : (
                items.map((item) =>
                  item.type === 'section' ? (
                    <SortableSectionRow key={item.id} section={item} />
                  ) : (
                    <SortableLigneRow key={item.id} ligne={item} />
                  ),
                )
              )}
            </SortableContext>
          </DndContext>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bloc 5 — Récap (dépliable) */}
      <Collapsible open={recapOpen} onOpenChange={setRecapOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity">
              <Euro className="h-5 w-5 shrink-0" />
              <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                Récapitulatif financier
              </CardTitle>
              {recapOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total HT</span>
              <span>{formatEuros(state.recap.totalHT)}</span>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Remise</Label>
                <div className="flex gap-2">
                  <Select
                    value={state.recap.remiseType ?? 'none'}
                    onValueChange={(v) =>
                      setRecapRemiseAcompte({
                        remiseType:
                          v === 'none' ? null : (v as 'pourcentage' | 'montant'),
                      })
                    }
                  >
                    <SelectTrigger className="h-8 bg-white text-gray-900 [&>span]:text-gray-900 placeholder:text-gray-500">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="pourcentage">%</SelectItem>
                      <SelectItem value="montant">Montant (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  {(state.recap.remiseType === 'pourcentage' ||
                    state.recap.remiseType === 'montant') && (
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-8 w-24 bg-white text-gray-900 placeholder:text-gray-500"
                      value={
                        state.recap.remiseValeur
                          ? String(state.recap.remiseValeur)
                          : ''
                      }
                      onChange={(e) =>
                        setRecapRemiseAcompte({
                          remiseValeur: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder={
                        state.recap.remiseType === 'pourcentage' ? '%' : '€'
                      }
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Acompte à la commande</Label>
                <div className="flex gap-2">
                  <Select
                    value={state.recap.acompteType ?? 'none'}
                    onValueChange={(v) =>
                      setRecapRemiseAcompte({
                        acompteType:
                          v === 'none' ? null : (v as 'pourcentage' | 'montant'),
                      })
                    }
                  >
                    <SelectTrigger className="h-8 bg-white text-gray-900 [&>span]:text-gray-900 placeholder:text-gray-500">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="pourcentage">%</SelectItem>
                      <SelectItem value="montant">Montant (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  {(state.recap.acompteType === 'pourcentage' ||
                    state.recap.acompteType === 'montant') && (
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-8 w-24 bg-white text-gray-900 placeholder:text-gray-500"
                      value={
                        state.recap.acompteValeur
                          ? String(state.recap.acompteValeur)
                          : ''
                      }
                      onChange={(e) =>
                        setRecapRemiseAcompte({
                          acompteValeur: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder={
                        state.recap.acompteType === 'pourcentage' ? '%' : '€'
                      }
                    />
                  )}
                </div>
              </div>
            </div>
            {state.recap.detailTVA.map((t) => (
              <div
                key={t.taux}
                className="flex justify-between text-sm text-muted-foreground"
              >
                <span>TVA {t.taux} %</span>
                <span>{formatEuros(t.montantTVA)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total TTC</span>
              <span>{formatEuros(state.recap.totalTTC)}</span>
            </div>
            {state.recap.acompteMontant > 0 && (
              <div className="flex justify-between text-sm">
                <span>Acompte</span>
                <span>{formatEuros(state.recap.acompteMontant)}</span>
              </div>
            )}
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bloc 6 — Conditions (dépliable) */}
      <Collapsible open={conditionsOpen} onOpenChange={setConditionsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity">
              <FileCheck className="h-5 w-5 shrink-0" />
              <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                Conditions
              </CardTitle>
              {conditionsOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Délai d'exécution</Label>
              <Input
                value={state.conditions.delaiExecution}
                onChange={(e) =>
                  setConditions({ delaiExecution: e.target.value })
                }
                placeholder="Ex. 4 semaines"
              />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Input
                value={state.conditions.modePaiement}
                onChange={(e) =>
                  setConditions({ modePaiement: e.target.value })
                }
                placeholder="Virement, Chèque, CB..."
              />
            </div>
            <div className="space-y-2">
              <Label>Délai de paiement</Label>
              <Input
                value={state.conditions.delaiPaiement}
                onChange={(e) =>
                  setConditions({ delaiPaiement: e.target.value })
                }
                placeholder="À réception, 30 jours..."
              />
            </div>
            <div className="space-y-2">
              <Label>Pénalités de retard</Label>
              <Input
                value={state.conditions.penalitesRetard}
                onChange={(e) =>
                  setConditions({ penalitesRetard: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Indemnité forfaitaire recouvrement</Label>
              <Input
                value={state.conditions.indemniteRecouvrement}
                onChange={(e) =>
                  setConditions({ indemniteRecouvrement: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={state.conditions.reservePropriete}
                onCheckedChange={(checked) =>
                  setConditions({ reservePropriete: checked })
                }
              />
              <Label>Réserve de propriété</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes / conditions particulières</Label>
            <Textarea
              value={state.conditions.notes}
              onChange={(e) => setConditions({ notes: e.target.value })}
              placeholder="..."
              rows={3}
            />
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bloc 7 — Mentions légales (dépliable) */}
      <Collapsible open={mentionsOpen} onOpenChange={setMentionsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center gap-2 hover:opacity-90 transition-opacity">
              <CardTitle className="flex items-center gap-2 text-lg flex-1 text-left !mb-0">
                Mentions légales
              </CardTitle>
              {mentionsOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-normal">
              Mention assurance décennale (avec n°)
            </Label>
            <Switch
              checked={state.mentions.assuranceDecennaleActive}
              onCheckedChange={(checked) =>
                setMentions({ assuranceDecennaleActive: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">RGE (travaux énergétiques)</Label>
            <Switch
              checked={state.mentions.rgeActive}
              onCheckedChange={(checked) =>
                setMentions({ rgeActive: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">
              TVA non applicable art. 293 B (auto-entrepreneur)
            </Label>
            <Switch
              checked={state.mentions.tva293BActive}
              onCheckedChange={(checked) =>
                setMentions({ tva293BActive: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Garantie de parfait achèvement (1 an)</Label>
            <Switch
              checked={state.mentions.garantieParfaitAchevement}
              onCheckedChange={(checked) =>
                setMentions({ garantieParfaitAchevement: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Garantie biennale (2 ans)</Label>
            <Switch
              checked={state.mentions.garantieBiennale}
              onCheckedChange={(checked) =>
                setMentions({ garantieBiennale: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Garantie décennale (10 ans)</Label>
            <Switch
              checked={state.mentions.garantieDecennale}
              onCheckedChange={(checked) =>
                setMentions({ garantieDecennale: checked })
              }
            />
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
