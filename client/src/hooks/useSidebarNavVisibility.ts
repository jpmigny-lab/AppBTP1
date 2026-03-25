import { useCallback, useEffect, useMemo, useState } from 'react';
import { orderNavItemsByPaths } from '@/lib/sidebarNav';
import {
  getSidebarPrefs,
  normalizePathOrder,
  notifySidebarPrefsChange,
  setSidebarPrefs,
  SIDEBAR_PREFS_EVENT,
  type SidebarPrefs,
} from '@/lib/sidebarPrefs';

export function useSidebarNavVisibility() {
  const [prefs, setPrefs] = useState<SidebarPrefs>(getSidebarPrefs);

  useEffect(() => {
    const sync = () => setPrefs(getSidebarPrefs());
    window.addEventListener(SIDEBAR_PREFS_EVENT, sync);
    return () => window.removeEventListener(SIDEBAR_PREFS_EVENT, sync);
  }, []);

  const hidden = useMemo(() => new Set(prefs.hiddenPaths), [prefs.hiddenPaths]);

  const orderedItems = useMemo(() => orderNavItemsByPaths(prefs.pathOrder), [prefs.pathOrder]);

  const setPathVisible = useCallback((path: string, visible: boolean) => {
    setPrefs((prev) => {
      const h = new Set(prev.hiddenPaths);
      if (visible) h.delete(path);
      else h.add(path);
      const next: SidebarPrefs = { ...prev, hiddenPaths: Array.from(h) };
      setSidebarPrefs(next);
      return next;
    });
    notifySidebarPrefsChange();
  }, []);

  const setPathOrder = useCallback((pathOrder: string[]) => {
    setPrefs((prev) => {
      const next: SidebarPrefs = { ...prev, pathOrder: normalizePathOrder(pathOrder) };
      setSidebarPrefs(next);
      return next;
    });
    notifySidebarPrefsChange();
  }, []);

  const isPathHidden = useCallback((path: string) => hidden.has(path), [hidden]);

  return { hidden, setPathVisible, isPathHidden, orderedItems, setPathOrder };
}
