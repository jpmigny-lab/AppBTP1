import { useState } from 'react';
import { useLocation } from 'wouter';
import { BlobProvider } from '@react-pdf/renderer';
import Sidebar from '@/components/Sidebar';
import { UserAccountButton } from '@/components/UserAccountButton';
import { DevisForm } from '@/components/devis/DevisForm';
import { DevisDocument } from '@/components/devis/DevisDocument';
import { DevisPreview } from '@/components/devis/DevisPreview';
import {
  MentionsChecklist,
  pdfPeutEtreGenerePourState,
  usePDFPeutEtreGenere,
} from '@/components/devis/MentionsChecklist';
import { useDevisStore } from '@/store/devisStore';
import { ouvrirPDFNatif, telechargerPDF, ouvrirEmailClient } from '@/lib/pdfExport';
import { formatEuros } from '@/lib/devisCalculs';
import { cn } from '@/lib/utils';
import type { DevisStatut, DevisState } from '@/types/devis';
import {
  DEVIS_STATUT_LABELS,
  DEVIS_STATUT_ROW_CLASS,
  DEVIS_STATUTS_VISIBLES,
  devisStatutBadgeClass,
} from '@/lib/devisStatut';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Save,
  FileDown,
  Copy,
  Mail,
  Plus,
  List,
  FileText,
  Trash2,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuotesPage() {
  const [location, setLocation] = useLocation();
  const isListView = location === '/dashboard/quotes';

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { toast } = useToast();
  const state = useDevisStore((s) => s.state);
  const savedList = useDevisStore((s) => s.savedList);
  const loadedDevisId = useDevisStore((s) => s.loadedDevisId);
  const saveCurrentDevis = useDevisStore((s) => s.saveCurrentDevis);
  const resetDevis = useDevisStore((s) => s.resetDevis);
  const loadDevis = useDevisStore((s) => s.loadDevis);
  const duplicateDevis = useDevisStore((s) => s.duplicateDevis);
  const deleteDevis = useDevisStore((s) => s.deleteDevis);
  const updateDevisStatut = useDevisStore((s) => s.updateDevisStatut);
  const [devisToDelete, setDevisToDelete] = useState<string | null>(null);
  const [previewDevisId, setPreviewDevisId] = useState<string | null>(null);
  const peutGenererPDF = usePDFPeutEtreGenere();
  const previewDevis = savedList.find((d) => d.id === previewDevisId) ?? null;

  const handleNouveauDevis = () => {
    resetDevis();
    setLocation('/dashboard/quotes/nouveau');
  };

  const handleOuvrirDevis = (id: string) => {
    loadDevis(id);
    setLocation('/dashboard/quotes/nouveau');
  };


  const handleSauvegarder = (overwriteExisting?: boolean) => {
    const nom = saveName.trim() || `Devis ${state.details.numeroDevis}`;
    if (overwriteExisting && loadedDevisId) {
      saveCurrentDevis(nom, loadedDevisId);
      toast({ title: 'Devis enregistré', description: `"${nom}" a été mis à jour.` });
    } else {
      saveCurrentDevis(nom);
      toast({ title: 'Devis enregistré', description: `"${nom}" a été sauvegardé.` });
    }
    setSaveName('');
    setSaveDialogOpen(false);
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

  const handleTelechargerDevisSauvegarde = async (
    e: React.MouseEvent,
    savedState: DevisState,
  ) => {
    e.stopPropagation();
    if (!pdfPeutEtreGenerePourState(savedState)) {
      toast({
        title: 'PDF indisponible',
        description:
          'Ouvrez le devis et complétez les champs obligatoires (SIRET, dates, prestations…).',
        variant: 'destructive',
      });
      return;
    }
    try {
      await telechargerPDF(savedState);
      toast({
        title: 'Téléchargement',
        description: 'Le PDF a été téléchargé.',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden z-10 flex w-full">
      <Sidebar />
      <UserAccountButton />

      {isListView ? (
        /* Vue liste des devis — même fond que le reste du dashboard */
        <div className="flex-1 min-w-0 min-h-screen overflow-y-auto pt-20 pl-14 md:pt-6 md:pl-0">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
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
                  const statut: DevisStatut = d.statut ?? 'brouillon';
                  const sousTitre =
                    d.state.details?.lieuExecution?.trim() || clientNom;
                  return (
                    <li key={d.id}>
                      <Card
                        className={cn(
                          'cursor-pointer transition-all backdrop-blur-xl text-white',
                          DEVIS_STATUT_ROW_CLASS[statut],
                        )}
                        onClick={() => handleOuvrirDevis(d.id)}
                      >
                        <CardContent className="p-2.5 sm:p-3 flex flex-col gap-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                                <FileText className="h-4.5 w-4.5 text-white/85" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white truncate text-[15px] tracking-tight">
                                  {d.state.details?.numeroDevis ?? '—'}
                                </p>
                                <p className="text-sm text-white/65 truncate mt-0.5">
                                  {sousTitre}
                                </p>
                                <p className="text-xs text-white/45 truncate mt-1">
                                  {d.nom}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3">
                              <div className="flex items-center gap-1.5 text-white/90 tabular-nums">
                                <span className="text-sm font-semibold">
                                  {formatEuros(ttc)}
                                </span>
                                <ChevronRight className="h-4 w-4 text-white/35 hidden sm:block" />
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-white/85 hover:bg-white/10 hover:text-white shrink-0"
                                  aria-label="Ouvrir le devis"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewDevisId(d.id);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-white/85 hover:bg-white/10 hover:text-white shrink-0"
                                  aria-label="Télécharger le PDF"
                                  onClick={(e) =>
                                    void handleTelechargerDevisSauvegarde(e, d.state)
                                  }
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white shrink-0"
                                  aria-label="Dupliquer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateDevis(d.id);
                                    toast({
                                      title: 'Devis dupliqué',
                                      description:
                                        'Une copie a été ajoutée à la liste.',
                                    });
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-300/90 hover:bg-red-500/20 hover:text-red-200 shrink-0"
                                  aria-label="Supprimer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDevisToDelete(d.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 justify-end pt-1 border-t border-white/10">
                            {DEVIS_STATUTS_VISIBLES.map((key) => (
                              <button
                                key={key}
                                type="button"
                                className={devisStatutBadgeClass(statut, key)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateDevisStatut(d.id, key);
                                }}
                              >
                                {DEVIS_STATUT_LABELS[key]}
                              </button>
                            ))}
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
      <Dialog open={saveDialogOpen} onOpenChange={(open) => {
        setSaveDialogOpen(open);
        if (open && loadedDevisId) {
          const existing = savedList.find((d) => d.id === loadedDevisId);
          setSaveName(existing?.nom ?? '');
        } else if (!open) setSaveName('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {loadedDevisId ? 'Enregistrer les modifications' : 'Sauvegarder le devis'}
            </DialogTitle>
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
            {loadedDevisId ? (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSauvegarder(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Enregistrer (écraser l&apos;existant)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSauvegarder(false)}
                  className="w-full"
                >
                  Enregistrer sous un autre nom
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => handleSauvegarder(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Enregistrer
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={!!devisToDelete} onOpenChange={(open) => !open && setDevisToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (devisToDelete) {
                  const wasLoaded = loadedDevisId === devisToDelete;
                  deleteDevis(devisToDelete);
                  setDevisToDelete(null);
                  if (wasLoaded) setLocation('/dashboard/quotes');
                  toast({ title: 'Devis supprimé', description: 'Le devis a été supprimé de la liste.' });
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!previewDevis}
        onOpenChange={(open) => {
          if (!open) setPreviewDevisId(null);
        }}
      >
        <DialogContent className="max-w-[95vw] w-[1100px] h-[90vh] p-0 bg-black/80 border-white/20 overflow-hidden">
          {previewDevis ? (
            <BlobProvider document={<DevisDocument state={previewDevis.state} />}>
              {({ url, loading, error }) => {
                if (loading) {
                  return (
                    <div className="h-full w-full flex items-center justify-center text-white/70">
                      Génération du PDF...
                    </div>
                  );
                }
                if (error || !url) {
                  return (
                    <div className="h-full w-full flex items-center justify-center text-red-300 px-4 text-sm">
                      Impossible d&apos;afficher le PDF de ce devis.
                    </div>
                  );
                }
                return (
                  <iframe
                    src={url}
                    className="h-full w-full border-0"
                    title={`PDF ${previewDevis.state.details.numeroDevis}`}
                  />
                );
              }}
            </BlobProvider>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
