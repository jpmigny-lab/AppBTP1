import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Settings2, Package } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  const [materials, setMaterials] = useState<MaterialSetting[]>([]);
  const [newNom, setNewNom] = useState('');
  const [newPrix, setNewPrix] = useState<number | ''>('');

  useEffect(() => {
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

    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H7',location:'SettingsPage.tsx:load',message:'Loaded materials settings',data:{count:loaded.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-white/70" />
              Matériaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
        </Card>
      </main>
    </PageWrapper>
  );
}

