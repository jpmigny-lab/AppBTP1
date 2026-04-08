import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Building,
  Calendar,
  Workflow,
  FileText,
  Receipt,
  Users,
  User,
  Settings,
  Mail,
} from 'lucide-react';

export type SidebarNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

/** Ordre d’affichage du menu latéral (desktop + tiroir mobile). */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { icon: Home, label: "Vue d'ensemble", path: '/dashboard' },
  { icon: Building, label: 'Mes Chantiers', path: '/dashboard/projects' },
  { icon: Calendar, label: 'Planning', path: '/dashboard/planning' },
  { icon: Workflow, label: 'CRM Pipeline', path: '/dashboard/crm' },
  { icon: FileText, label: 'Devis', path: '/dashboard/quotes' },
  { icon: Receipt, label: 'Factures', path: '/dashboard/invoices' },
  { icon: Users, label: 'Équipe', path: '/dashboard/team' },
  { icon: User, label: 'Clients', path: '/dashboard/clients' },
  { icon: Mail, label: 'E-mail', path: '/dashboard/mail' },
  { icon: Settings, label: 'Paramètres', path: '/dashboard/settings' },
];

/** Toujours affiché pour éviter de perdre l’accès aux réglages. */
export const SIDEBAR_ALWAYS_VISIBLE_PATHS = new Set<string>(['/dashboard/settings']);

/** Applique un ordre de chemins aux entrées connues (complète si besoin). */
export function orderNavItemsByPaths(pathOrder: string[]): SidebarNavItem[] {
  const map = new Map(SIDEBAR_NAV_ITEMS.map((i) => [i.path, i] as const));
  const seen = new Set<string>();
  const out: SidebarNavItem[] = [];
  for (const p of pathOrder) {
    const item = map.get(p);
    if (item && !seen.has(p)) {
      out.push(item);
      seen.add(p);
    }
  }
  for (const item of SIDEBAR_NAV_ITEMS) {
    if (!seen.has(item.path)) out.push(item);
  }
  return out;
}
