import { PageWrapper } from '@/components/PageWrapper';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { CRMPipeline } from '@/components/CRMPipeline';

export default function CRMPipelinePage() {
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              CRM Pipeline
            </h1>
            <p className="text-sm text-white/70">Gérez vos prospects et automatisez vos workflows</p>
          </div>
          <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
            <Mail className="h-4 w-4 mr-2" />
            Connecter Email
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 ml-0 md:ml-20">
        {/* CRM Pipeline */}
        <CRMPipeline />
      </main>
    </PageWrapper>
  );
}

