import { useState } from 'react';
import { useLocation } from 'wouter';
import Sidebar from '@/components/Sidebar';
import { UserAccountButton } from '@/components/UserAccountButton';
import { DevisForm } from '@/components/devis/DevisForm';
import { DevisPreview } from '@/components/devis/DevisPreview';
import { MentionsChecklist, usePDFPeutEtreGenere } from '@/components/devis/MentionsChecklist';
import { useDevisStore } from '@/store/devisStore';
import { ouvrirPDFNatif, telechargerPDF, ouvrirEmailClient } from '@/lib/pdfExport';
import { formatEuros } from '@/lib/devisCalculs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Save, FileDown, Copy, Mail, Plus, List, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuotesPage() {
  const [location, setLocation] = useLocation();
  const isListView = location === '/dashboard/quotes';

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { toast } = useToast();
  const state = useDevisStore((s) => s.state);
  const savedList = useDevisStore((s) => s.savedList);
  const saveCurrentDevis = useDevisStore((s) => s.saveCurrentDevis);
  const resetDevis = useDevisStore((s) => s.resetDevis);
  const loadDevis = useDevisStore((s) => s.loadDevis);
  const duplicateDevis = useDevisStore((s) => s.duplicateDevis);
  const peutGenererPDF = usePDFPeutEtreGenere();

  const handleNouveauDevis = () => {
    resetDevis();
    setLocation('/dashboard/quotes/nouveau');
  };

  const handleOuvrirDevis = (id: string) => {
    loadDevis(id);
    setLocation('/dashboard/quotes/nouveau');
  };


  const handleSauvegarder = () => {
    const nom = saveName.trim() || `Devis ${state.details.numeroDevis}`;
    saveCurrentDevis(nom);
    setSaveName('');
    setSaveDialogOpen(false);
    toast({ title: 'Devis enregistré', description: `"${nom}" a été sauvegardé.` });
  };

  const handleGenererPDF = async () => {
    if (!peutGenererPDF) return;
    try {
      await ouvrirPDFNatif(state);
      toast({ title: 'PDF généré', description: 'Ouverture dans un nouvel onglet.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF.', variant: 'destructive' });
    }
  };

  const handleTelecharger = async () => {
    if (!peutGenererPDF) return;
    try {
      await telechargerPDF(state);
      toast({ title: 'Téléchargement', description: 'Le PDF a été téléchargé.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de télécharger le PDF.', variant: 'destructive' });
    }
  };

  const handleDupliquer = () => {
    const nom = `Devis ${state.details.numeroDevis} (copie)`;
    saveCurrentDevis(nom);
    resetDevis();
    toast({ title: 'Devis dupliqué', description: 'Un nouveau devis a été créé à partir de la copie.' });
  };

  const handleEmail = () => {
    ouvrirEmailClient(state);
    toast({ title: 'Email', description: 'Ouverture du client mail avec sujet et corps pré-remplis.' });
  };

  return (
    <div className="min-h-screen relative overflow-hidden z-10 flex w-full">
      <Sidebar />
      <UserAccountButton />

      {isListView ? (
        /* Vue liste des devis — même fond que le reste du dashboard */
        <div className="flex-1 min-w-0 min-h-screen overflow-y-auto pt-20 pl-14 md:pt-6 md:pl-0">
          <div className="p-4 md:p-6 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-light tracking-tight text-white drop-shadow-lg">
                  Mes devis
                </h1>
                <p className="text-sm text-white/90 drop-shadow-md mt-1">
                  Consultez vos devis enregistrés ou créez-en un nouveau.
                </p>
              </div>
              <Button
                onClick={handleNouveauDevis}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un devis
              </Button>
            </div>

            {savedList.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-xl border-white/10 text-white">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-white/50 mb-4" />
                  <p className="font-medium text-white">Aucun devis enregistré</p>
                  <p className="text-sm text-white/70 mt-1 mb-6">
                    Sauvegardez un devis depuis l'éditeur pour le retrouver ici.
                  </p>
                  <Button
                    onClick={handleNouveauDevis}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un devis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {savedList.map((d) => {
                  const ttc = d.state.recap?.totalTTC ?? 0;
                  const clientNom = d.state.client?.nom || '—';
                  const dateLabel = d.updatedAt
                    ? new Date(d.updatedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <li key={d.id}>
                      <Card
                        className="cursor-pointer transition-colors bg-black/20 backdrop-blur-xl border-white/10 text-white hover:bg-black/30"
                        onClick={() => handleOuvrirDevis(d.id)}
                      >
                        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-white">{d.nom}</p>
                            <p className="text-sm text-white/70 mt-0.5">
                              N° {d.state.details?.numeroDevis ?? '—'} · {clientNom}
                            </p>
                            <p className="text-xs text-white/60 mt-1">{dateLabel}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium text-white/90">
                              {formatEuros(ttc)} TTC
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white/80 hover:bg-white/10 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateDevis(d.id);
                                toast({
                                  title: 'Devis dupliqué',
                                  description: 'Une copie a été ajoutée à la liste.',
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 flex flex-col min-h-0 pt-20 pl-14 md:pt-0 md:pl-0">
          {/* Barre d'actions en haut — style glass */}
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-lg flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
              disabled={!peutGenererPDF}
              onClick={handleGenererPDF}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Générer le PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={handleTelecharger}
              disabled={!peutGenererPDF}
            >
              Télécharger
            </Button>
            <Button type="button" variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={handleDupliquer}>
              <Copy className="h-4 w-4 mr-2" />
              Dupliquer ce devis
            </Button>
            <Button type="button" variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={handleEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Envoyer par email
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            {/* Colonne gauche 55% — Formulaire (plus large pour remplir les champs) */}
            <div className="w-full lg:w-[55%] min-h-0 overflow-y-auto border-r-0 lg:border-r border-white/10 bg-transparent">
              <div
                className="p-4 md:p-6 max-w-4xl [&_.shadcn-card]:bg-black/20 [&_.shadcn-card]:backdrop-blur-xl [&_.shadcn-card]:border-white/10 [&_.shadcn-card]:text-white [&_.text-muted-foreground]:text-white/80 [&_label]:text-white/90 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_textarea]:bg-white/10 [&_textarea]:border-white/20 [&_textarea]:text-white [&_.rounded-lg]:bg-black/20 [&_.rounded-lg]:border-white/10 [&_.text-green-600]:text-green-300 [&_.text-amber-600]:text-amber-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h1 className="text-2xl font-light tracking-tight text-white drop-shadow-lg mb-1">
                    Générateur de devis
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => setLocation('/dashboard/quotes')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Voir la liste
                  </Button>
                </div>
                <p className="text-sm text-white/90 drop-shadow-md mb-6">
                  Remplissez le formulaire — l'aperçu se met à jour en temps réel.
                </p>
                <DevisForm />
                <div className="mt-6">
                  <MentionsChecklist />
                </div>
              </div>
            </div>

            {/* Colonne droite 45% — Aperçu PDF */}
            <div className="hidden lg:block lg:w-[45%]">
              <DevisPreview />
            </div>
          </div>
        </div>
      )}

      {/* Dialog sauvegarde */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder le devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Nom du devis</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`Ex. Dupont - Salle de bain - ${state.details.numeroDevis}`}
              />
            </div>
            <Button onClick={handleSauvegarder} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
