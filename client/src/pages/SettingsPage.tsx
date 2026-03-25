import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SortableSidebarNavRow } from '@/components/settings/SortableSidebarNavRow';
import { useDevisStore } from '@/store/devisStore';
import { useSidebarNavVisibility } from '@/hooks/useSidebarNavVisibility';
import { SIDEBAR_ALWAYS_VISIBLE_PATHS } from '@/lib/sidebarNav';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Trash2,
  Plus,
  Settings2,
  Package,
  Building2,
  ChevronDown,
  ImageIcon,
  PanelLeft,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MaterialSetting = {
  id: string;
  nom: string;
  prix: number;
  updatedAt: number;
};

const MATERIALS_SETTINGS_KEY = 'aosrenov.settings.materials.v1';

function safeParseMaterials(raw: string | null): MaterialSetting[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SettingsPage() {
  const { toast } = useToast();
  const emetteur = useDevisStore((s) => s.state.emetteur);
  const setEmetteur = useDevisStore((s) => s.setEmetteur);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const { hidden, setPathVisible, orderedItems, setPathOrder } = useSidebarNavVisibility();

  const navSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleNavDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = orderedItems.map((i) => i.path);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      setPathOrder(arrayMove(ids, oldIndex, newIndex));
    },
    [orderedItems, setPathOrder],
  );

  const [materials, setMaterials] = useState<MaterialSetting[]>([]);
  const [newNom, setNewNom] = useState('');
  const [newPrix, setNewPrix] = useState<number | ''>('');

  useEffect(() => {
    if (localStorage.getItem(MATERIALS_SETTINGS_KEY) == null) {
      const t = Date.now();
      const demo: MaterialSetting[] = [
        { id: 'dm1', nom: 'Carrelage grès cérame 60×60', prix: 42.5, updatedAt: t },
        { id: 'dm2', nom: 'Enduit façade PSE', prix: 38, updatedAt: t },
        { id: 'dm3', nom: 'Peinture acrylique blanche 10 L', prix: 89, updatedAt: t },
        { id: 'dm4', nom: 'Plaque de plâtre BA13', prix: 11.2, updatedAt: t },
        { id: 'dm5', nom: 'Laine de verre 100 mm (m²)', prix: 8.9, updatedAt: t },
      ];
      localStorage.setItem(MATERIALS_SETTINGS_KEY, JSON.stringify(demo));
    }
    const loaded = safeParseMaterials(localStorage.getItem(MATERIALS_SETTINGS_KEY))
      .filter((m) => m && m.nom)
      .map((m) => ({
        id: String(m.id),
        nom: String(m.nom),
        prix: Number(m.prix ?? 0),
        updatedAt: Number(m.updatedAt ?? Date.now()),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setMaterials(loaded);
  }, []);

  const persist = (next: MaterialSetting[]) => {
    setMaterials(next);
    localStorage.setItem(MATERIALS_SETTINGS_KEY, JSON.stringify(next));
  };

  const addMaterial = () => {
    const nom = newNom.trim();
    const prix = Number(newPrix);
    if (!nom || !Number.isFinite(prix)) return;

    const now = Date.now();
    const key = nom.toLowerCase();
    const byKey = new Map(materials.map((m) => [m.nom.trim().toLowerCase(), m] as const));
    const prev = byKey.get(key);
    byKey.set(key, {
      id: prev?.id || `${now}_${Math.random().toString(16).slice(2)}`,
      nom,
      prix,
      updatedAt: now,
    });
    const next = Array.from(byKey.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    persist(next);
    setNewNom('');
    setNewPrix('');
  };

  const updatePrice = (id: string, prix: number) => {
    const next = materials.map((m) => (m.id === id ? { ...m, prix, updatedAt: Date.now() } : m))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    persist(next);
  };

  const removeMaterial = (id: string) => {
    const next = materials.filter((m) => m.id !== id);
    persist(next);
  };

  const sorted = useMemo(() => materials, [materials]);

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-white/70" />
              Paramètres
            </h1>
            <p className="text-sm text-white/70">Gérez les éléments enregistrés automatiquement.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 ml-0 md:ml-20">
        <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white overflow-hidden">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-4 md:p-6 text-left hover:bg-white/5 transition-colors"
              >
                <CardTitle className="text-lg flex items-center gap-2 font-semibold text-white mb-0">
                  <Building2 className="h-5 w-5 text-violet-300 shrink-0" />
                  Entreprise
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-white/60 shrink-0 transition-transform',
                    companyOpen && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-6 px-4 md:px-6 space-y-4 border-t border-white/10">
                <p className="text-sm text-white/65">
                  Ces informations sont utilisées comme émetteur sur les devis et factures PDF. Elles
                  sont enregistrées automatiquement à chaque modification.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="em-raison" className="text-white/90">
                      Raison sociale
                    </Label>
                    <Input
                      id="em-raison"
                      value={emetteur.raisonSociale}
                      onChange={(e) => setEmetteur({ raisonSociale: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Ex. AXYOS Renov SARL"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="em-adresse" className="text-white/90">
                      Adresse
                    </Label>
                    <Textarea
                      id="em-adresse"
                      value={emetteur.adresse}
                      onChange={(e) => setEmetteur({ adresse: e.target.value })}
                      rows={2}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-y min-h-[60px]"
                      placeholder="Numéro et rue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em-cp" className="text-white/90">
                      Code postal
                    </Label>
                    <Input
                      id="em-cp"
                      value={emetteur.codePostal}
                      onChange={(e) => setEmetteur({ codePostal: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em-ville" className="text-white/90">
                      Ville
                    </Label>
                    <Input
                      id="em-ville"
                      value={emetteur.ville}
                      onChange={(e) => setEmetteur({ ville: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em-tel" className="text-white/90">
                      Téléphone
                    </Label>
                    <Input
                      id="em-tel"
                      value={emetteur.telephone}
                      onChange={(e) => setEmetteur({ telephone: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em-mail" className="text-white/90">
                      E-mail
                    </Label>
                    <Input
                      id="em-mail"
                      type="email"
                      value={emetteur.email}
                      onChange={(e) => setEmetteur({ email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em-siret" className="text-white/90">
                      SIRET
                    </Label>
                    <Input
                      id="em-siret"
                      value={emetteur.siret}
                      onChange={(e) => setEmetteur({ siret: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em-tva" className="text-white/90">
                      N° TVA intracommunautaire
                    </Label>
                    <Input
                      id="em-tva"
                      value={emetteur.tvaIntra}
                      onChange={(e) => setEmetteur({ tvaIntra: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="em-forme" className="text-white/90">
                      Forme juridique
                    </Label>
                    <Input
                      id="em-forme"
                      value={emetteur.formeJuridique}
                      onChange={(e) => setEmetteur({ formeJuridique: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Ex. SARL au capital de 20 000 €"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="em-assurance" className="text-white/90">
                      Assurance décennale
                    </Label>
                    <Textarea
                      id="em-assurance"
                      value={emetteur.assuranceDecennale}
                      onChange={(e) => setEmetteur({ assuranceDecennale: e.target.value })}
                      rows={2}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-y min-h-[60px]"
                      placeholder="Organisme et n° de police"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-white/90 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Logo (PDF)
                    </Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="file"
                        accept="image/*"
                        className="max-w-xs bg-white/10 border-white/20 text-white file:mr-3 file:text-white/80"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const data = reader.result as string;
                            if (data.length > 200_000) {
                              toast({
                                title: 'Logo trop volumineux',
                                description:
                                  'Choisissez une image plus légère (le logo n’est pas enregistré au-delà d’environ 200 Ko en base64).',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setEmetteur({ logoBase64: data });
                            toast({
                              title: 'Logo mis à jour',
                              description: 'Il apparaîtra sur les prochains PDF.',
                            });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      {emetteur.logoBase64 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            setEmetteur({ logoBase64: null });
                            toast({ title: 'Logo retiré' });
                          }}
                        >
                          Retirer le logo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={navOpen} onOpenChange={setNavOpen}>
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white overflow-hidden">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-4 md:p-6 text-left hover:bg-white/5 transition-colors"
              >
                <CardTitle className="text-lg flex items-center gap-2 font-semibold text-white mb-0">
                  <PanelLeft className="h-5 w-5 text-violet-300 shrink-0" />
                  Préférences d'affichage
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-white/60 shrink-0 transition-transform',
                    navOpen && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-6 px-4 md:px-6 space-y-4 border-t border-white/10">
                <p className="text-sm text-white/65">
                  Glisse les entrées pour les réordonner (poignée à gauche). Coche celles à afficher dans la
                  barre latérale et le menu mobile. Paramètres reste toujours visible.
                </p>
                <DndContext
                  sensors={navSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleNavDragEnd}
                >
                  <SortableContext
                    items={orderedItems.map((i) => i.path)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {orderedItems.map((item) => {
                        const locked = SIDEBAR_ALWAYS_VISIBLE_PATHS.has(item.path);
                        const checked = locked || !hidden.has(item.path);
                        return (
                          <SortableSidebarNavRow
                            key={item.path}
                            item={item}
                            locked={locked}
                            checked={checked}
                            onCheckedChange={(v) => setPathVisible(item.path, v)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={materialsOpen} onOpenChange={setMaterialsOpen}>
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white overflow-hidden">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-4 md:p-6 text-left hover:bg-white/5 transition-colors"
              >
                <CardTitle className="text-lg flex items-center gap-2 font-semibold text-white mb-0">
                  <Package className="h-5 w-5 text-white/70 shrink-0" />
                  Matériaux
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-white/60 shrink-0 transition-transform',
                    materialsOpen && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0 pb-6 px-4 md:px-6 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-2">
                    <Label className="text-white">Nom</Label>
                    <Input
                      value={newNom}
                      onChange={(e) => setNewNom(e.target.value)}
                      placeholder="Ex: Carrelage"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Prix (€)</Label>
                    <Input
                      type="number"
                      value={newPrix}
                      onChange={(e) => setNewPrix(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ex: 800"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <Button onClick={addMaterial} className="bg-white/20 hover:bg-white/30 text-white border border-white/10">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>

                {sorted.length === 0 ? (
                  <div className="text-sm text-white/70">
                    Aucun matériau enregistré pour le moment. Les prix seront ajoutés automatiquement quand tu enregistres une analyse.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sorted.map((m) => (
                      <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-black/10 border border-white/10">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-white truncate">{m.nom}</div>
                          <div className="text-xs text-white/60">
                            Mis à jour le {new Date(m.updatedAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={m.prix}
                            onChange={(e) => updatePrice(m.id, Number(e.target.value || 0))}
                            className="w-32 bg-white/10 border-white/20 text-white"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeMaterial(m.id)}
                            className="text-white border-white/20 hover:bg-white/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </main>
    </PageWrapper>
  );
}

