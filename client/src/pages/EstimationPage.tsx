import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Wand2, Plus, Calculator, User, ArrowRight, ArrowLeft, CheckCircle2, Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChantiers, type Client } from '@/context/ChantiersContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UploadedImage {
  file: File;
  preview: string;
}

export default function EstimationPage() {
  const { clients, addClient } = useChantiers();
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [modeAjoutClient, setModeAjoutClient] = useState(false);
  const [chantierInfo, setChantierInfo] = useState({
    surface: '',
    materiaux: '',
    localisation: '',
    delai: '',
    metier: '',
    informations: '',
  });
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [editResults, setEditResults] = useState(false);
  const [draftResults, setDraftResults] = useState<any>(null);

  const MATERIALS_SETTINGS_KEY = 'aosrenov.settings.materials.v1';

  const persistMaterialPricesFromResults = (results: any) => {
    const mats: any[] = Array.isArray(results?.materiaux) ? results.materiaux : [];
    if (mats.length === 0) return;

    try {
      const raw = localStorage.getItem(MATERIALS_SETTINGS_KEY);
      const existing: Array<{ id: string; nom: string; prix: number; updatedAt: number }> = raw ? JSON.parse(raw) : [];
      const byKey = new Map<string, { id: string; nom: string; prix: number; updatedAt: number }>();
      for (const m of existing) {
        const nom = String(m?.nom || '').trim();
        if (!nom) continue;
        byKey.set(nom.toLowerCase(), m);
      }

      let upserts = 0;
      for (const m of mats) {
        const nom = String(m?.nom || '').trim();
        const prix = Number(m?.prix ?? NaN);
        if (!nom || !Number.isFinite(prix)) continue;
        const key = nom.toLowerCase();
        const prev = byKey.get(key);
        byKey.set(key, {
          id: prev?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          nom,
          prix,
          updatedAt: Date.now(),
        });
        upserts++;
      }

      const nextList = Array.from(byKey.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      localStorage.setItem(MATERIALS_SETTINGS_KEY, JSON.stringify(nextList));

      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H5',location:'EstimationPage.tsx:materials:persist',message:'Persisted material prices to settings',data:{matsCount:mats.length,upserts,finalCount:nextList.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H6',location:'EstimationPage.tsx:materials:persist:error',message:'Failed persisting material prices',data:{error:e?.message||'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
  };

  const startEditResults = () => {
    if (!analysisResults) return;
    // données simples -> clone JSON suffit
    setDraftResults(JSON.parse(JSON.stringify(analysisResults)));
    setEditResults(true);
  };

  const cancelEditResults = () => {
    setEditResults(false);
    setDraftResults(null);
  };

  const saveEditResults = () => {
    if (!draftResults) return;
    persistMaterialPricesFromResults(draftResults);
    setAnalysisResults(draftResults);
    setEditResults(false);
    setDraftResults(null);
  };

  // --- Mode vocal (SpeechRecognition) ---
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(false);
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SR;
    setVoiceSupported(supported);

    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H1',location:'EstimationPage.tsx:voice:init',message:'SpeechRecognition support check',data:{supported},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!supported) return;

    const recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = (res?.[0]?.transcript || '').trim();
        if (!transcript) continue;
        if (res.isFinal) finalText += transcript + ' ';
        else interim += transcript + ' ';
      }

      // Pas de texte dans les logs (PII) → uniquement des longueurs.
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H2',location:'EstimationPage.tsx:voice:onresult',message:'SpeechRecognition result',data:{finalLen:finalText.length,interimLen:interim.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (finalText) {
        setChantierInfo((prev) => ({
          ...prev,
          informations: (prev.informations ? `${prev.informations.trim()} ` : '') + finalText.trim(),
        }));
      }
    };

    recognition.onerror = (e: any) => {
      setListening(false);
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H3',location:'EstimationPage.tsx:voice:onerror',message:'SpeechRecognition error',data:{error:e?.error||'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    recognition.onend = () => {
      setListening(false);
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H4',location:'EstimationPage.tsx:voice:onend',message:'SpeechRecognition ended',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const toggleVoice = () => {
    const recognition = recognitionRef.current;
    if (!voiceSupported || !recognition) return;

    const nextMode = !voiceMode;
    setVoiceMode(nextMode);

    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H2',location:'EstimationPage.tsx:voice:toggle',message:'Toggle voice mode',data:{nextMode},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (nextMode) {
      try {
        recognition.start();
        setListening(true);
      } catch {
        setListening(false);
        setVoiceMode(false);
      }
    } else {
      try { recognition.stop(); } catch {}
      setListening(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files: File[]) => {
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      prev[index].preview && URL.revokeObjectURL(prev[index].preview);
      return newImages;
    });
  };

  const handleNext = () => {
    if (step === 1 && images.length > 0) {
      setStep(2);
    }
  };

  const handleLaunchAnalysis = () => {
    // TODO: Implement AI analysis API call
    // Simulate analysis results
    const results = {
      tempsRealisation: '3 semaines',
      materiaux: [
        { nom: 'Carrelage', quantite: '50m²', prix: 800 },
        { nom: 'Colle carrelage', quantite: '5 sacs', prix: 150 },
        { nom: 'Joint carrelage', quantite: '3kg', prix: 50 }
      ],
      nombreOuvriers: 2,
      coutTotal: 2500,
      marge: 500,
      benefice: 300,
      repartitionCouts: {
        transport: 100,
        mainOeuvre: 1200,
        materiaux: 1000,
        autres: 200
      },
      recommandations: [
        'Prévoir un échafaudage pour les travaux en hauteur',
        'Outil spécifique nécessaire : coupe-carrelage électrique',
        'Vérifier l\'état des murs avant pose du carrelage'
      ]
    };
    setAnalysisResults(results);
    persistMaterialPricesFromResults(results);
    setStep(3);
  };

  const handleCreateClient = () => {
    const client: Client = {
      id: Date.now().toString(),
      ...newClient
    };
    addClient(client);
    setSelectedClient(client);
    setNewClient({ name: '', email: '', phone: '' });
    setModeAjoutClient(false);
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Estimation Automatique des Chantiers
            </h1>
            <p className="text-sm text-white/70">
              Étape {step}/3 - {step === 1 ? 'Import des photos' : step === 2 ? 'Informations du chantier' : 'Résultats de l\'analyse'}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 ml-0 md:ml-20">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-white/70" />
                    Import des Photos du Chantier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      isDragging
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-white/70" />
                    <p className="text-lg font-medium text-white mb-2">
                      Glissez-déposez vos photos ici
                    </p>
                    <p className="text-sm text-white/60 mb-4">
                      ou cliquez pour sélectionner des fichiers
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      variant="outline"
                      className="text-white border-white/20 hover:bg-white/10"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      Sélectionner des photos
                    </Button>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-white/20"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleNext}
                      disabled={images.length === 0}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-white/70" />
                    Informations du Chantier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Client Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Client</h3>
                    {selectedClient ? (
                      <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                        <p className="text-white font-medium">{selectedClient.name}</p>
                        <p className="text-sm text-white/70">{selectedClient.email}</p>
                        <p className="text-sm text-white/70">{selectedClient.phone}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-white border-white/20 hover:bg-white/10"
                          onClick={() => {
                            setSelectedClient(null);
                            setModeAjoutClient(false);
                          }}
                        >
                          Changer de client
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                        {!modeAjoutClient ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white block">Sélectionner un client</label>
                              <Select
                                value={''}
                                onValueChange={(value) => {
                                  const found = clients.find((c) => c.id === value);
                                  if (found) setSelectedClient(found);
                                }}
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/60 [&>span]:text-white">
                                  <SelectValue placeholder="Choisir un client existant" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white">
                                  {clients.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-white">
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="text-white border-white/20 hover:bg-white/10"
                                onClick={() => setModeAjoutClient(true)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Nouveau client
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Nom</label>
                                <input
                                  type="text"
                                  value={newClient.name}
                                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                                  placeholder="Nom du client"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Email</label>
                                <input
                                  type="email"
                                  value={newClient.email}
                                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                                  placeholder="email@example.com"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white block mb-2">Téléphone</label>
                                <input
                                  type="tel"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                                  placeholder="06 12 34 56 78"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setModeAjoutClient(false); setNewClient({ name: '', email: '', phone: '' }); }}
                                className="text-white border-white/20 hover:bg-white/10"
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={handleCreateClient}
                                disabled={!newClient.name || !newClient.email || !newClient.phone}
                                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter le client
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chantier Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Informations du Chantier</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Surface (m²)</label>
                        <input
                          type="number"
                          value={chantierInfo.surface}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, surface: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: 50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Métier</label>
                        <select
                          value={chantierInfo.metier}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, metier: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white"
                        >
                          <option value="">Sélectionner un métier</option>
                          <option value="plombier">Plombier</option>
                          <option value="carreleur">Carreleur</option>
                          <option value="electricien">Électricien</option>
                          <option value="peintre">Peintre</option>
                          <option value="maçon">Maçon</option>
                          <option value="charpentier">Charpentier</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">
                          Matériaux <span className="text-white/60 font-normal">(optionnel)</span>
                        </label>
                        <input
                          type="text"
                          value={chantierInfo.materiaux}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, materiaux: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: Carrelage, Peinture"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white block mb-2">Localisation</label>
                        <input
                          type="text"
                          value={chantierInfo.localisation}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, localisation: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: Paris 75001"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-white block mb-2">Délai souhaité</label>
                        <input
                          type="text"
                          value={chantierInfo.delai}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, delai: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: 2 semaines"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="text-sm font-medium text-white">
                            Informations du chantier <span className="text-white/60 font-normal">(optionnel)</span>
                          </label>
                          <Button
                            type="button"
                            variant={voiceMode ? "default" : "outline"}
                            size="sm"
                            onClick={toggleVoice}
                            disabled={!voiceSupported}
                            className={
                              voiceMode
                                ? "bg-violet-500 hover:bg-violet-600 text-white border-0"
                                : "text-white border-white/20 hover:bg-white/10 disabled:opacity-50"
                            }
                            title={voiceSupported ? "Activer la dictée vocale" : "Dictée vocale non supportée par ce navigateur"}
                          >
                            {voiceMode ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                            {voiceMode ? (listening ? "Arrêter (vocal)" : "Arrêt…") : "Mode vocal"}
                          </Button>
                        </div>
                        <textarea
                          value={chantierInfo.informations}
                          onChange={(e) => setChantierInfo({ ...chantierInfo, informations: e.target.value })}
                          className="w-full min-h-[110px] px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                          placeholder="Décris le chantier (contexte, contraintes, accès, état existant, attentes du client…). Tu peux aussi dicter via “Mode vocal”."
                        />
                        {!voiceSupported && (
                          <p className="text-xs text-white/60 mt-2">
                            La dictée vocale n’est pas disponible sur ce navigateur. Utilise la saisie écrite.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleLaunchAnalysis}
                      disabled={!selectedClient || !chantierInfo.surface || !chantierInfo.metier}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Lancer l'analyse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && analysisResults && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Résultats de l'Analyse IA
                    </CardTitle>
                    {!editResults ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-white border-white/20 hover:bg-white/10"
                        onClick={startEditResults}
                      >
                        Modifier
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="text-white border-white/20 hover:bg-white/10"
                          onClick={cancelEditResults}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          className="bg-violet-500 hover:bg-violet-600 text-white border-0"
                          onClick={saveEditResults}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Estimation du temps */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Estimation du temps de réalisation
                    </h3>
                    {!editResults ? (
                      <p className="text-2xl font-bold text-white">{analysisResults.tempsRealisation}</p>
                    ) : (
                      <input
                        value={draftResults?.tempsRealisation ?? ''}
                        onChange={(e) => setDraftResults((p: any) => ({ ...p, tempsRealisation: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                        placeholder="Ex: 3 semaines"
                      />
                    )}
                  </div>

                  {/* Liste des matériaux */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Liste des matériaux nécessaires
                    </h3>
                    <div className="space-y-2">
                      {(editResults ? (draftResults?.materiaux ?? []) : (analysisResults.materiaux ?? [])).map((mat: any, index: number) => (
                        <div key={index} className="p-2 bg-black/10 rounded">
                          {!editResults ? (
                            <div className="flex justify-between items-center gap-4">
                              <div className="min-w-0">
                                <p className="text-white font-medium">{mat.nom}</p>
                                <p className="text-sm text-white/70">{mat.quantite}</p>
                              </div>
                              <p className="text-white font-semibold shrink-0">{mat.prix} €</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                value={mat.nom ?? ''}
                                onChange={(e) => setDraftResults((p: any) => {
                                  const next = { ...p };
                                  next.materiaux = [...(next.materiaux ?? [])];
                                  next.materiaux[index] = { ...next.materiaux[index], nom: e.target.value };
                                  return next;
                                })}
                                className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                                placeholder="Matériau"
                              />
                              <input
                                value={mat.quantite ?? ''}
                                onChange={(e) => setDraftResults((p: any) => {
                                  const next = { ...p };
                                  next.materiaux = [...(next.materiaux ?? [])];
                                  next.materiaux[index] = { ...next.materiaux[index], quantite: e.target.value };
                                  return next;
                                })}
                                className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                                placeholder="Quantité"
                              />
                              <input
                                type="number"
                                value={mat.prix ?? 0}
                                onChange={(e) => setDraftResults((p: any) => {
                                  const next = { ...p };
                                  next.materiaux = [...(next.materiaux ?? [])];
                                  next.materiaux[index] = { ...next.materiaux[index], prix: Number(e.target.value || 0) };
                                  return next;
                                })}
                                className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50"
                                placeholder="Prix (€)"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nombre d'ouvriers */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Estimation du nombre d'ouvriers requis
                    </h3>
                    {!editResults ? (
                      <p className="text-2xl font-bold text-white">{analysisResults.nombreOuvriers} ouvrier(s)</p>
                    ) : (
                      <input
                        type="number"
                        value={draftResults?.nombreOuvriers ?? 0}
                        onChange={(e) => setDraftResults((p: any) => ({ ...p, nombreOuvriers: Number(e.target.value || 0) }))}
                        className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white"
                      />
                    )}
                  </div>

                  {/* Coût total */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Coût total prévisionnel
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70">Coût de base</span>
                        {!editResults ? (
                          <span className="text-white font-semibold">{analysisResults.coutTotal} €</span>
                        ) : (
                          <input
                            type="number"
                            value={draftResults?.coutTotal ?? 0}
                            onChange={(e) => setDraftResults((p: any) => ({ ...p, coutTotal: Number(e.target.value || 0) }))}
                            className="w-32 text-right px-2 py-1 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white"
                          />
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Marge</span>
                        {!editResults ? (
                          <span className="text-white font-semibold">{analysisResults.marge} €</span>
                        ) : (
                          <input
                            type="number"
                            value={draftResults?.marge ?? 0}
                            onChange={(e) => setDraftResults((p: any) => ({ ...p, marge: Number(e.target.value || 0) }))}
                            className="w-32 text-right px-2 py-1 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white"
                          />
                        )}
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2">
                        <span className="text-white font-semibold">Bénéfice estimé</span>
                        {!editResults ? (
                          <span className="text-green-400 font-bold text-xl">{analysisResults.benefice} €</span>
                        ) : (
                          <input
                            type="number"
                            value={draftResults?.benefice ?? 0}
                            onChange={(e) => setDraftResults((p: any) => ({ ...p, benefice: Number(e.target.value || 0) }))}
                            className="w-32 text-right px-2 py-1 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white font-semibold"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Graphique de répartition */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Répartition des coûts
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(editResults ? (draftResults?.repartitionCouts ?? {}) : (analysisResults.repartitionCouts ?? {})).map(([key, value]: [string, any]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70 capitalize">{key === 'mainOeuvre' ? 'Main-d\'œuvre' : key}</span>
                            {!editResults ? (
                              <span className="text-white font-semibold">{value} €</span>
                            ) : (
                              <input
                                type="number"
                                value={Number(value || 0)}
                                onChange={(e) => setDraftResults((p: any) => ({
                                  ...p,
                                  repartitionCouts: { ...(p?.repartitionCouts ?? {}), [key]: Number(e.target.value || 0) },
                                }))}
                                className="w-28 text-right px-2 py-1 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white"
                              />
                            )}
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-2">
                            <div
                              className="bg-white/30 h-2 rounded-full"
                              style={{
                                width: `${((Number(value || 0) / Number((editResults ? draftResults?.coutTotal : analysisResults.coutTotal) || 1)) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommandations */}
                  <div className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Recommandations automatiques
                    </h3>
                    {!editResults ? (
                      <ul className="space-y-2">
                        {(analysisResults.recommandations ?? []).map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-white/90">
                            <span className="text-green-400 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <textarea
                        value={(draftResults?.recommandations ?? []).join('\n')}
                        onChange={(e) =>
                          setDraftResults((p: any) => ({
                            ...p,
                            recommandations: e.target.value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }))
                        }
                        className="w-full min-h-[120px] px-3 py-2 rounded-md border bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                        placeholder="Une recommandation par ligne…"
                      />
                    )}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => {
                        setStep(1);
                        setImages([]);
                        setSelectedClient(null);
                        setChantierInfo({ surface: '', materiaux: '', localisation: '', delai: '', metier: '', informations: '' });
                        setAnalysisResults(null);
                      }}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                    >
                      Nouvelle estimation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageWrapper>
  );
}
