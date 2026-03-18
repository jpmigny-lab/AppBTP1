import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Calculator, Building, Calendar, Workflow, FileText, Wand2, Users, User, Menu, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const SIDEBAR_WIDTH = '20rem'; // w-80

const menuItems = [
  { icon: Home, label: 'Vue d\'ensemble', path: '/dashboard' },
  { icon: Calculator, label: 'Estimation IA', path: '/dashboard/estimation-ia' },
  { icon: Building, label: 'Mes Chantiers', path: '/dashboard/projects' },
  { icon: Calendar, label: 'Planning', path: '/dashboard/planning' },
  { icon: Workflow, label: 'CRM Pipeline', path: '/dashboard/crm' },
  { icon: FileText, label: 'Devis', path: '/dashboard/quotes' },
  { icon: Wand2, label: 'Visualisation IA', path: '/dashboard/ai-visualization' },
  { icon: Users, label: 'Équipe', path: '/dashboard/team' },
  { icon: User, label: 'Clients', path: '/dashboard/clients' },
  { icon: Settings, label: 'Paramètres', path: '/dashboard/settings' },
];

function NavContent({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 text-white">AXYOS Renov</h2>
        <p className="text-sm text-white/70">Construire pour durer</p>
        <div className="h-1 w-20 rounded bg-violet-500 mt-2" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide mb-3 text-white/70">Navigation</p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = item.path === '/dashboard'
              ? location === '/dashboard'
              : location === item.path || location.startsWith(item.path + '/');
            return (
              <li key={item.path}>
                <Link href={item.path} onClick={onNavigate}>
                  <div
                    className={cn(
                      'flex items-center space-x-3 p-2.5 rounded-lg transition-all cursor-pointer group',
                      isActive
                        ? 'bg-white/20 text-white border border-white/10'
                        : 'text-white/90 hover:bg-white/10 hover:text-white border border-transparent'
                    )}
                  >
                    <div
                      className={cn(
                        'p-1.5 rounded-md transition-all duration-300 shrink-0',
                        isActive ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/90 group-hover:bg-white/20'
                      )}
                    >
                      <item.icon size={16} />
                    </div>
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Bouton hamburger — visible uniquement sur mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-3 rounded-xl bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:bg-black/30 shadow-lg touch-manipulation"
        aria-label="Ouvrir le menu"
      >
        <Menu size={24} />
      </button>

      {/* Drawer mobile (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[min(20rem,85vw)] max-w-[20rem] border-white/10 bg-black/20 backdrop-blur-xl p-6 pt-12 [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:right-4 [&>button]:top-4"
        >
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <NavContent location={location} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Sidebar fixe — visible à partir de md */}
      <nav
        className="hidden md:flex fixed top-0 left-0 h-full z-40 shadow-2xl bg-black/20 backdrop-blur-xl flex-col rounded-r-3xl border-r border-white/10"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 pt-8">
          <NavContent location={location} />
        </div>
      </nav>

      {/* Espace réservé — uniquement sur desktop pour ne pas cacher le contenu */}
      <div aria-hidden className="hidden md:block shrink-0" style={{ width: SIDEBAR_WIDTH }} />
    </>
  );
}
