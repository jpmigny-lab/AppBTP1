import { SIDEBAR_NAV_ITEMS } from './sidebarNav';

const PREFS_KEY = 'aosrenov.settings.sidebar.prefs.v1';
const LEGACY_HIDDEN_KEY = 'aosrenov.settings.sidebar.hiddenPaths.v1';

/** Conservé pour compatibilité avec les écouteurs existants. */
export const SIDEBAR_PREFS_EVENT = 'aosrenov:sidebar-visibility';

export type SidebarPrefs = {
  hiddenPaths: string[];
  pathOrder: string[];
};

export function defaultSidebarPathOrder(): string[] {
  return SIDEBAR_NAV_ITEMS.map((i) => i.path);
}

export function normalizePathOrder(order: string[]): string[] {
  const paths = new Set(SIDEBAR_NAV_ITEMS.map((i) => i.path));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of order) {
    if (paths.has(p) && !seen.has(p)) {
      result.push(p);
      seen.add(p);
    }
  }
  for (const item of SIDEBAR_NAV_ITEMS) {
    if (!seen.has(item.path)) result.push(item.path);
  }
  return result;
}

export function getSidebarPrefs(): SidebarPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>;
      const hiddenRaw = p.hiddenPaths;
      const orderRaw = p.pathOrder;
      const hiddenPaths = Array.isArray(hiddenRaw)
        ? hiddenRaw.filter((x): x is string => typeof x === 'string')
        : [];
      const pathOrder = Array.isArray(orderRaw)
        ? normalizePathOrder(orderRaw.filter((x): x is string => typeof x === 'string'))
        : defaultSidebarPathOrder();
      return { hiddenPaths, pathOrder };
    }
  } catch {
    // migration / défaut
  }

  let hiddenPaths: string[] = [];
  try {
    const legacy = localStorage.getItem(LEGACY_HIDDEN_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown;
      if (Array.isArray(parsed)) {
        hiddenPaths = parsed.filter((x): x is string => typeof x === 'string');
      }
    }
  } catch {
    // ignore
  }

  return {
    hiddenPaths,
    pathOrder: defaultSidebarPathOrder(),
  };
}

export function setSidebarPrefs(prefs: SidebarPrefs) {
  const normalized: SidebarPrefs = {
    hiddenPaths: prefs.hiddenPaths,
    pathOrder: normalizePathOrder(prefs.pathOrder),
  };
  localStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
}

export function notifySidebarPrefsChange() {
  window.dispatchEvent(new Event(SIDEBAR_PREFS_EVENT));
}
