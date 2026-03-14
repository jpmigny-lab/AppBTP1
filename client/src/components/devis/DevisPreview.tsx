import { BlobProvider } from '@react-pdf/renderer';
import { useDebounce } from 'use-debounce';
import { useDevisStore } from '@/store/devisStore';
import { DevisDocument } from './DevisDocument';
import type { DevisState } from '@/types/devis';

export function DevisPreview() {
  const state = useDevisStore((s) => s.state);
  const [debouncedState] = useDebounce<DevisState>(state, 400);

  return (
    <div className="flex flex-col h-screen bg-transparent sticky top-0">
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 py-2 text-sm font-medium text-white shrink-0">
        Aperçu en temps réel
      </div>

      <BlobProvider
        document={<DevisDocument state={debouncedState} />}
      >
        {({ blob, url, loading, error }) => {
          if (loading) {
            return (
              <div className="flex-1 flex items-center justify-center text-white/70">
                Génération de l'aperçu...
              </div>
            );
          }
          if (error || !url) {
            return (
              <div className="flex-1 flex items-center justify-center text-red-300 text-sm px-4">
                Erreur d'aperçu. Vérifiez les données saisies.
              </div>
            );
          }
          return (
            <iframe
              src={url}
              className="flex-1 w-full min-h-0 border-0"
              title="Aperçu du devis"
            />
          );
        }}
      </BlobProvider>
    </div>
  );
}
