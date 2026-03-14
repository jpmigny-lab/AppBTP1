import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Calculator, Building, Calendar, Workflow, FileText, Wand2, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = '20rem'; // w-80

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { icon: Home, label: 'Vue d\'ensemble', path: '/dashboard' },
    { icon: Calculator, label: 'Estimation automatique', path: '/dashboard/estimation' },
    { icon: Building, label: 'Mes Chantiers', path: '/dashboard/projects' },
    { icon: Calendar, label: 'Planning', path: '/dashboard/planning' },
    { icon: Workflow, label: 'CRM Pipeline', path: '/dashboard/crm' },
    { icon: FileText, label: 'Devis', path: '/dashboard/quotes' },
    { icon: Wand2, label: 'Visualisation IA', path: '/dashboard/ai-visualization' },
    { icon: Users, label: 'Équipe', path: '/dashboard/team' },
    { icon: User, label: 'Clients', path: '/dashboard/clients' },
  ];

  return (
    <>
      {/* Sidebar fixe, conforme à la DA (glassmorphism sur MeshGradient) */}
      <nav
        className="fixed top-0 left-0 h-full z-40 shadow-2xl bg-black/20 backdrop-blur-xl flex flex-col rounded-r-3xl border-r border-white/10"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 pt-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1 text-white">
              Aos Renov
            </h2>
            <p className="text-sm text-white/70">
              Construire pour durer
            </p>
            <div className="h-1 w-20 rounded bg-violet-500 mt-2" />
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-3 text-white/70">
              Navigation
            </p>
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = item.path === '/dashboard'
                  ? location === '/dashboard'
                  : location === item.path || location.startsWith(item.path + '/');
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
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
                            isActive
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/10 text-white/90 group-hover:bg-white/20'
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
        </div>
      </nav>

      {/* Espace réservé pour que le contenu principal ne passe pas sous la sidebar */}
      <div aria-hidden className="shrink-0" style={{ width: SIDEBAR_WIDTH }} />
    </>
  );
}
