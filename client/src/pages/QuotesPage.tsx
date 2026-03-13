import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { UserAccountButton } from '@/components/UserAccountButton';
import { DevisForm } from '@/components/devis/DevisForm';
import { DevisPreview } from '@/components/devis/DevisPreview';
import { MentionsChecklist, usePDFPeutEtreGenere } from '@/components/devis/MentionsChecklist';
import { CatalogueModal } from '@/components/devis/CatalogueModal';
import { ModelesModal } from '@/components/devis/ModelesModal';
import { useDevisStore } from '@/store/devisStore';
import { ouvrirPDFNatif, telechargerPDF, ouvrirEmailClient } from '@/lib/pdfExport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, FileDown, Copy, Mail, Star, FileStack } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuotesPage() {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { toast } = useToast();
  const state = useDevisStore((s) => s.state);
  const saveCurrentDevis = useDevisStore((s) => s.saveCurrentDevis);
  const resetDevis = useDevisStore((s) => s.resetDevis);
  const saveAsModele = useDevisStore((s) => s.saveAsModele);
  const peutGenererPDF = usePDFPeutEtreGenere();
  const [modeleDialogOpen, setModeleDialogOpen] = useState(false);
  const [modeleName, setModeleName] = useState('');


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
    <div className="min-h-screen relative overflow-hidden">
      <Sidebar />
      <UserAccountButton />

      <div className="flex ml-0 lg:ml-0">
        {/* Colonne gauche 40% — Formulaire */}
        <div className="w-full lg:w-[40%] min-h-screen overflow-y-auto border-r border-border/50 bg-background/95">
          <div className="p-6 max-w-2xl">
            <h1 className="text-2xl font-light tracking-tight mb-1">
              Générateur de devis
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Remplissez le formulaire — l'aperçu se met à jour en temps réel.
            </p>
            <DevisForm />
            <div className="mt-6">
              <MentionsChecklist />
            </div>
          </div>
        </div>

        {/* Colonne droite 60% — Aperçu PDF */}
        <div className="hidden lg:block lg:w-[60%]">
          <DevisPreview />
        </div>
      </div>

      {/* Barre d'actions fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 py-3 px-4 bg-background/95 border-t shadow-lg flex-wrap">
        <CatalogueModal>
          <Button type="button" variant="outline" size="sm">
            <Star className="h-4 w-4 mr-2" />
            Favoris
          </Button>
        </CatalogueModal>
        <ModelesModal>
          <Button type="button" variant="outline" size="sm">
            <FileStack className="h-4 w-4 mr-2" />
            Modèles
          </Button>
        </ModelesModal>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
        >
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
        <Button
          type="button"
          size="sm"
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
          onClick={handleTelecharger}
          disabled={!peutGenererPDF}
        >
          Télécharger
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDupliquer}>
          <Copy className="h-4 w-4 mr-2" />
          Dupliquer ce devis
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Envoyer par email
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModeleDialogOpen(true)}
        >
          <FileStack className="h-4 w-4 mr-2" />
          Enregistrer comme modèle
        </Button>
      </div>

      {/* Dialog enregistrer comme modèle */}
      <Dialog open={modeleDialogOpen} onOpenChange={setModeleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer comme modèle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modele-name">Nom du modèle</Label>
              <Input
                id="modele-name"
                value={modeleName}
                onChange={(e) => setModeleName(e.target.value)}
                placeholder="Ex. Salle de bain standard"
              />
            </div>
            <Button
              onClick={() => {
                const nom = modeleName.trim() || 'Modèle';
                saveAsModele(nom);
                setModeleName('');
                setModeleDialogOpen(false);
                toast({ title: 'Modèle enregistré', description: `"${nom}" est disponible dans Modèles.` });
              }}
              className="w-full"
            >
              Enregistrer le modèle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <Button onClick={handleSauvegarder} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
