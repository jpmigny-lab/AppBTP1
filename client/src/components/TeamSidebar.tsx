import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home, Building, Calendar } from 'lucide-react';
import { useTeamPortalAccess } from '@/hooks/useTeamPortalAccess';
import type { TeamPortalArea } from '@/lib/teamPortalAccess';

const NAV: { area: TeamPortalArea; icon: typeof Home; label: string; path: string }[] = [
  { area: 'overview', icon: Home, label: "Vue d'ensemble", path: '/team-dashboard' },
  { area: 'projects', icon: Building, label: 'Mes Chantiers', path: '/team-dashboard/projects' },
  { area: 'planning', icon: Calendar, label: 'Planning', path: '/team-dashboard/planning' },
];

export default function TeamSidebar() {
  const [location] = useLocation();
  const { canView } = useTeamPortalAccess();

  const visibleNav = NAV.filter((item) => canView(item.area));

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col z-50 rounded-r-3xl',
      )}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-col">
          <span className="font-semibold text-white">Membre d&apos;équipe</span>
          <span className="text-xs text-white/70 italic">AXYOS Renov</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-medium text-white/60 uppercase tracking-wide mb-4">Navigation</div>

        {visibleNav.map((item) => {
          const active =
            item.path === '/team-dashboard'
              ? location === '/team-dashboard'
              : location === item.path || location.startsWith(item.path + '/');
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 h-10 text-white',
                  active && 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30',
                  !active && 'hover:bg-white/10',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
