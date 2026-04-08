import { getSidebarPrefs } from '@/lib/sidebarPrefs';

export const PERMISSION_KEYS = [
  'quotes',
  'invoices',
  'clients',
  'services',
  'planning',
  'projects',
  'team',
  'settings',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type LayoutPreset = 'none' | 'from_sidebar' | 'commercial' | 'chantier' | 'office';

export interface StoredMemberPermissions {
  view: Record<PermissionKey, boolean>;
  edit: Record<PermissionKey, boolean>;
  layoutPreset: LayoutPreset;
}

export const PERMISSION_ROWS: {
  key: PermissionKey;
  viewLabel: string;
  editLabel: string;
}[] = [
  { key: 'quotes', viewLabel: 'Voir les devis', editLabel: 'Créer ou modifier les devis' },
  { key: 'invoices', viewLabel: 'Voir les factures', editLabel: 'Créer ou modifier les factures' },
  { key: 'clients', viewLabel: 'Voir les clients', editLabel: 'Créer ou modifier les clients' },
  { key: 'services', viewLabel: 'Voir les services', editLabel: 'Créer ou modifier les services' },
  { key: 'planning', viewLabel: 'Voir le planning', editLabel: 'Créer ou modifier le planning' },
  { key: 'projects', viewLabel: 'Voir les chantiers', editLabel: 'Créer ou modifier les chantiers' },
  { key: 'team', viewLabel: 'Voir les employés', editLabel: 'Gérer les employés' },
  { key: 'settings', viewLabel: 'Voir les réglages', editLabel: 'Modifier les réglages' },
];

const PATH_BY_KEY: Record<PermissionKey, string[]> = {
  quotes: ['/dashboard/quotes'],
  invoices: ['/dashboard/invoices'],
  clients: ['/dashboard/clients'],
  services: [],
  planning: ['/dashboard/planning'],
  projects: ['/dashboard/projects'],
  team: ['/dashboard/team'],
  settings: ['/dashboard/settings'],
};

function allTrue(): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<PermissionKey, boolean>;
}

function allFalse(): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>;
}

export function createFullAccessPermissions(): StoredMemberPermissions {
  return {
    view: allTrue(),
    edit: allTrue(),
    layoutPreset: 'none',
  };
}

export function createReadOnlyPermissions(): StoredMemberPermissions {
  return {
    view: allTrue(),
    edit: allFalse(),
    layoutPreset: 'none',
  };
}

/** Applique la visibilité de la barre latérale (Paramètres) sur la colonne « Voir » uniquement. */
export function applySidebarVisibilityToView(prev: StoredMemberPermissions): StoredMemberPermissions {
  const { hiddenPaths } = getSidebarPrefs();
  const hidden = new Set(hiddenPaths);
  const view = { ...prev.view };
  const edit = { ...prev.edit };

  for (const key of PERMISSION_KEYS) {
    const paths = PATH_BY_KEY[key];
    const anyVisible = paths.some((p) => !hidden.has(p));
    view[key] = anyVisible;
    if (!anyVisible) edit[key] = false;
  }

  return { ...prev, view, edit, layoutPreset: 'from_sidebar' };
}

export function applyLayoutPreset(preset: LayoutPreset, prev: StoredMemberPermissions): StoredMemberPermissions {
  if (preset === 'none') return { ...prev, layoutPreset: 'none' };
  if (preset === 'from_sidebar') return applySidebarVisibilityToView({ ...prev, layoutPreset: 'none' });

  const v = allFalse();
  const e = allFalse();

  if (preset === 'commercial') {
    ['quotes', 'invoices', 'clients', 'planning', 'projects'].forEach((k) => {
      v[k as PermissionKey] = true;
    });
    ['quotes', 'clients', 'planning'].forEach((k) => {
      e[k as PermissionKey] = true;
    });
  }

  if (preset === 'chantier') {
    ['services', 'planning', 'projects'].forEach((k) => {
      v[k as PermissionKey] = true;
      e[k as PermissionKey] = true;
    });
  }

  if (preset === 'office') {
    PERMISSION_KEYS.forEach((k) => {
      v[k] = true;
    });
    PERMISSION_KEYS.forEach((k) => {
      e[k] = k !== 'team' && k !== 'settings';
    });
  }

  return { view: v, edit: e, layoutPreset: preset };
}

export function permissionsMatchFull(p: StoredMemberPermissions): boolean {
  return PERMISSION_KEYS.every((k) => p.view[k] && p.edit[k]);
}

export function permissionsMatchReadOnly(p: StoredMemberPermissions): boolean {
  return PERMISSION_KEYS.every((k) => p.view[k] && !p.edit[k]);
}

const STORAGE_KEY = 'aosrenov.team.memberPermissions.v1';

/** Réagir dans l’espace collaborateur si les droits sont modifiés (même onglet). */
export const TEAM_MEMBER_PERMISSIONS_EVENT = 'aosrenov:team-member-permissions';

function loadMap(): Record<string, StoredMemberPermissions> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, StoredMemberPermissions> = {};
    for (const [id, val] of Object.entries(parsed)) {
      if (!val || typeof val !== 'object') continue;
      const o = val as Record<string, unknown>;
      if (!o.view || !o.edit) continue;
      out[id] = normalizeStored({
        view: o.view as Record<string, boolean>,
        edit: o.edit as Record<string, boolean>,
        layoutPreset: (o.layoutPreset as LayoutPreset) || 'none',
      });
    }
    return out;
  } catch {
    return {};
  }
}

function normalizeStored(p: Partial<StoredMemberPermissions>): StoredMemberPermissions {
  const view = allFalse();
  const edit = allFalse();
  for (const k of PERMISSION_KEYS) {
    view[k] = Boolean(p.view?.[k]);
    edit[k] = Boolean(p.edit?.[k]);
  }
  const lp = p.layoutPreset && ['none', 'from_sidebar', 'commercial', 'chantier', 'office'].includes(p.layoutPreset)
    ? p.layoutPreset
    : 'none';
  return { view, edit, layoutPreset: lp };
}

function saveMap(map: Record<string, StoredMemberPermissions>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getMemberPermissions(memberId: string): StoredMemberPermissions {
  const map = loadMap();
  return map[memberId] ? normalizeStored(map[memberId]) : createFullAccessPermissions();
}

export function setMemberPermissions(memberId: string, permissions: StoredMemberPermissions) {
  const map = loadMap();
  map[memberId] = normalizeStored(permissions);
  saveMap(map);
  window.dispatchEvent(new Event(TEAM_MEMBER_PERMISSIONS_EVENT));
}

export function removeMemberPermissions(memberId: string) {
  const map = loadMap();
  delete map[memberId];
  saveMap(map);
  window.dispatchEvent(new Event(TEAM_MEMBER_PERMISSIONS_EVENT));
}
