import { useEffect, useState } from 'react';
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
import { useFactureStore } from '@/store/factureStore';
import { bootstrapFacturesFromDevis } from '@/lib/factureSync';
import { ouvrirPDFNatif, telechargerPDF } from '@/lib/pdfExport';
import { formatEuros } from '@/lib/devisCalculs';
import { cn } from '@/lib/utils';
import type { DevisStatut, FactureSauvegarde } from '@/types/devis';
import {
  FACTURE_STATUT_LABELS,
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
  Plus,
  List,
  FileText,
  Trash2,
  Eye,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InvoicesPage() {
  const [location, setLocation] = useLocation();
  const isListView = location === '/dashboard/invoices';
  const isEditor = location === '/dashboard/invoices/nouveau';

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { toast } = useToast();
  const state = useDevisStore((s) => s.state);
  const savedList = useFactureStore((s) => s.savedList);
  const loadedFactureId = useFactureStore((s) => s.loadedFactureId);
  const saveCurrentFacture = useFactureStore((s) => s.saveCurrentFacture);
  const loadFactureForEdit = useFactureStore((s) => s.loadFactureForEdit);
  const deleteFacture = useFactureStore((s) => s.deleteFacture);
  const updateFactureStatut = useFactureStore((s) => s.updateFactureStatut);
  const [factureToDelete, setFactureToDelete] = useState<string | null>(null);
  const [previewFactureId, setPreviewFactureId] = useState<string | null>(null);
  const peutGenererPDF = usePDFPeutEtreGenere();
  const previewFacture =
    savedList.find((f) => f.id === previewFactureId) ?? null;

  useEffect(() => {
    bootstrapFacturesFromDevis();
  }, []);

  useEffect(() => {
    if (!isEditor) return;
    const { loadedFactureId: lid, prepareNewFacture: prep } =
      useFactureStore.getState();
    if (!lid) {
      prep();
    }
  }, [isEditor]);

  const handleNouvelleFacture = () => {
    useFactureStore.setState({ loadedFactureId: null });
    setLocation('/dashboard/invoices/nouveau');
  };

  const handleOuvrirFacture = (id: string) => {
    loadFactureForEdit(id);
    setLocation('/dashboard/invoices/nouveau');
  };

  const handleSauvegarder = (overwriteExisting?: boolean) => {
    const nom =
      saveName.trim() || `Facture ${state.details.numeroDevis}`;
    if (overwriteExisting && loadedFactureId) {
      saveCurrentFacture(nom, loadedFactureId);
      toast({
        title: 'Facture enregistrée',
        description: `"${nom}" a été mis à jour.`,
      });
    } else {
      saveCurrentFacture(nom);
      toast({
        title: 'Facture enregistrée',
        description: `"${nom}" a été sauvegardée.`,
      });
    }
    setSaveName('');
    setSaveDialogOpen(false);
    setLocation('/dashboard/invoices');
  };

  const handleGenererPDF = async () => {
    if (!peutGenererPDF) return;
    try {
      await ouvrirPDFNatif(state);
      toast({
        title: 'PDF généré',
        description: 'Ouverture dans un nouvel onglet.',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleTelecharger = async () => {
    if (!peutGenererPDF) return;
    try {
      await telechargerPDF(
        state,
        `Facture-${state.details.numeroDevis}.pdf`,
      );
      toast({
        title: 'Téléchargement',
        description: 'Le PDF a été téléchargé.',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleTelechargerFactureSauvegarde = async (
    e: React.MouseEvent,
    f: FactureSauvegarde,
  ) => {
    e.stopPropagation();
    if (!pdfPeutEtreGenerePourState(f.state)) {
      toast({
        title: 'PDF indisponible',
        description:
          'Complétez les champs obligatoires (SIRET, dates, prestations…).',
        variant: 'destructive',
      });
      return;
    }
    try {
      await telechargerPDF(
        f.state,
        `Facture-${f.state.details.numeroDevis}.pdf`,
      );
      toast({ title: 'Téléchargement', description: 'Le PDF a été téléchargé.' });
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
        <div className="flex-1 min-w-0 min-h-screen overflow-y-auto pt-20 pl-14 md:pt-6 md:pl-0">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-light tracking-tight text-white drop-shadow-lg flex items-center gap-2">
                  <Receipt className="h-8 w-8 text-violet-300" />
                  Factures
                </h1>
                <p className="text-sm text-white/90 drop-shadow-md mt-1">
                  Les devis signés apparaissent ici automatiquement. Vous pouvez
                  aussi créer une facture libre.
                </p>
              </div>
              <Button
                onClick={handleNouvelleFacture}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle facture
              </Button>
            </div>

            {savedList.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-xl border-white/10 text-white">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-white/50 mb-4" />
                  <p className="font-medium text-white">Aucune facture</p>
                  <p className="text-sm text-white/70 mt-1 mb-6">
                    Passez un devis en « Signé » ou créez une facture manuelle.
                  </p>
                  <Button
                    onClick={handleNouvelleFacture}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle facture
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {savedList.map((f) => {
                  const ttc = f.state.recap?.totalTTC ?? 0;
                  const clientNom = f.state.client?.nom || '—';
                  const statut: DevisStatut = f.statut ?? 'brouillon';
                  const sousTitre =
                    f.state.details?.lieuExecution?.trim() || clientNom;
                  const sourceLabel = f.devisSourceId
                    ? 'Depuis devis signé'
                    : 'Facture manuelle';
                  return (
                    <li key={f.id}>
                      <Card
                        className={cn(
                          'cursor-pointer transition-all backdrop-blur-xl text-white',
                          DEVIS_STATUT_ROW_CLASS[statut],
                        )}
                        onClick={() => handleOuvrirFacture(f.id)}
                      >
                        <CardContent className="p-1 sm:p-1.5 flex flex-col gap-0.5">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <div className="shrink-0 w-6 h-6 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
                                <Receipt className="h-3 w-3 text-white/85" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white truncate text-xs tracking-tight">
                                  {f.state.details?.numeroDevis ?? '—'}
                                </p>
                                <p className="text-[11px] text-white/65 truncate">
                                  {sousTitre}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 sm:justify-end sm:gap-1.5">
                              <div className="flex items-center gap-1 text-white/90 tabular-nums">
                                <span className="text-xs font-semibold">
                                  {formatEuros(ttc)}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 text-white/35 hidden sm:block" />
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 text-white/85 hover:bg-white/10 hover:text-white shrink-0"
                                  aria-label="Voir le PDF"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewFactureId(f.id);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 text-white/85 hover:bg-white/10 hover:text-white shrink-0"
                                  aria-label="Télécharger le PDF"
                                  onClick={(e) =>
                                    void handleTelechargerFactureSauvegarde(e, f)
                                  }
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 text-red-300/90 hover:bg-red-500/20 hover:text-red-200 shrink-0"
                                  aria-label="Supprimer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFactureToDelete(f.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 justify-end pt-0 border-t border-white/10">
                            {DEVIS_STATUTS_VISIBLES.map((key) => (
                              <button
                                key={key}
                                type="button"
                                className={cn(devisStatutBadgeClass(statut, key), "px-2.5 py-1 text-[12px] leading-none")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateFactureStatut(f.id, key);
                                }}
                              >
                                {FACTURE_STATUT_LABELS[key]}
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
              onClick={() => void handleGenererPDF()}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Générer le PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => void handleTelecharger()}
              disabled={!peutGenererPDF}
            >
              Télécharger
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            <div className="w-full lg:w-[55%] min-h-0 overflow-y-auto border-r-0 lg:border-r border-white/10 bg-transparent">
              <div className="p-4 md:p-6 max-w-4xl [&_.shadcn-card]:bg-black/20 [&_.shadcn-card]:backdrop-blur-xl [&_.shadcn-card]:border-white/10 [&_.shadcn-card]:text-white [&_.text-muted-foreground]:text-white/80 [&_label]:text-white/90 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_textarea]:bg-white/10 [&_textarea]:border-white/20 [&_textarea]:text-white [&_.rounded-lg]:bg-black/20 [&_.rounded-lg]:border-white/10 [&_.text-green-600]:text-green-300 [&_.text-amber-600]:text-amber-300">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h1 className="text-2xl font-light tracking-tight text-white drop-shadow-lg mb-1">
                    Facture
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => setLocation('/dashboard/invoices')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Voir la liste
                  </Button>
                </div>
                <p className="text-sm text-white/90 drop-shadow-md mb-6">
                  Même formulaire que pour un devis — le PDF affichera « FACTURE »
                  et le numéro FAC.
                </p>
                <DevisForm />
                <div className="mt-6">
                  <MentionsChecklist />
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:w-[45%]">
              <DevisPreview documentKind="facture" />
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={saveDialogOpen}
        onOpenChange={(open) => {
          setSaveDialogOpen(open);
          if (open && loadedFactureId) {
            const existing = savedList.find((x) => x.id === loadedFactureId);
            setSaveName(existing?.nom ?? '');
          } else if (!open) setSaveName('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {loadedFactureId
                ? 'Enregistrer les modifications'
                : 'Sauvegarder la facture'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-facture-name">Nom de la facture</Label>
              <Input
                id="save-facture-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`Ex. Dupont - ${state.details.numeroDevis}`}
              />
            </div>
            {loadedFactureId ? (
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

      <AlertDialog
        open={!!factureToDelete}
        onOpenChange={(open) => !open && setFactureToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (factureToDelete) {
                  const wasLoaded = loadedFactureId === factureToDelete;
                  deleteFacture(factureToDelete);
                  setFactureToDelete(null);
                  if (wasLoaded) setLocation('/dashboard/invoices');
                  toast({
                    title: 'Facture supprimée',
                    description: 'La facture a été retirée de la liste.',
                  });
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!previewFacture}
        onOpenChange={(open) => {
          if (!open) setPreviewFactureId(null);
        }}
      >
        <DialogContent className="max-w-[95vw] w-[1100px] h-[90vh] p-0 bg-black/80 border-white/20 overflow-hidden">
          {previewFacture ? (
            <BlobProvider
              document={
                <DevisDocument
                  state={previewFacture.state}
                  documentKind="facture"
                />
              }
            >
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
                      Impossible d&apos;afficher le PDF de cette facture.
                    </div>
                  );
                }
                return (
                  <iframe
                    src={url}
                    className="h-full w-full border-0"
                    title={`PDF ${previewFacture.state.details.numeroDevis}`}
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
