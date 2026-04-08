import {
  getChantiers,
  getClients,
  getSetting,
  loadDevisList,
  loadFacturesList,
  saveChantiers,
  saveClients,
  saveDevisList,
  saveFacturesList,
  saveSetting,
} from '@/lib/repositories/appDataRepository';

const MIGRATION_FLAG_KEY = 'aosrenov:migration:v1';
const LS_CLIENTS = 'aosrenov:clients';
const LS_CHANTIERS = 'aosrenov:chantiers';
const LS_SAVED_DEVIS = 'devis:saved';
const LS_SAVED_FACTURES = 'facture:saved';
const LS_SIDEBAR_PREFS = 'aosrenov.settings.sidebar.prefs.v1';
const LS_TEAM_MEMBER_PERMISSIONS = 'aosrenov.team.memberPermissions.v1';

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function runFirstLoginMigration(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'done') return;

  const localClients = parseJson<any[]>(localStorage.getItem(LS_CLIENTS), []);
  const localChantiers = parseJson<any[]>(localStorage.getItem(LS_CHANTIERS), []);
  const localDevis = parseJson<any[]>(localStorage.getItem(LS_SAVED_DEVIS), []);
  const localFactures = parseJson<any[]>(localStorage.getItem(LS_SAVED_FACTURES), []);
  const sidebarPrefs = parseJson<any>(localStorage.getItem(LS_SIDEBAR_PREFS), null);
  const memberPerms = parseJson<any>(localStorage.getItem(LS_TEAM_MEMBER_PERMISSIONS), null);

  const remoteClients = await getClients();
  if (remoteClients.ok && remoteClients.data.length === 0 && localClients.length > 0) {
    await saveClients(localClients);
  } else if (remoteClients.ok && remoteClients.data.length > 0) {
    localStorage.setItem(LS_CLIENTS, JSON.stringify(remoteClients.data));
  }

  const remoteChantiers = await getChantiers();
  if (remoteChantiers.ok && remoteChantiers.data.length === 0 && localChantiers.length > 0) {
    await saveChantiers(localChantiers);
  } else if (remoteChantiers.ok && remoteChantiers.data.length > 0) {
    localStorage.setItem(LS_CHANTIERS, JSON.stringify(remoteChantiers.data));
  }

  const remoteDevis = await loadDevisList();
  if (remoteDevis.ok && remoteDevis.data.length === 0 && localDevis.length > 0) {
    await saveDevisList(localDevis);
  } else if (remoteDevis.ok && remoteDevis.data.length > 0) {
    localStorage.setItem(LS_SAVED_DEVIS, JSON.stringify(remoteDevis.data));
  }

  const remoteFactures = await loadFacturesList();
  if (remoteFactures.ok && remoteFactures.data.length === 0 && localFactures.length > 0) {
    await saveFacturesList(localFactures);
  } else if (remoteFactures.ok && remoteFactures.data.length > 0) {
    localStorage.setItem(LS_SAVED_FACTURES, JSON.stringify(remoteFactures.data));
  }

  if (sidebarPrefs) {
    await saveSetting('sidebar_prefs', sidebarPrefs);
  } else {
    const remoteSidebar = await getSetting<any>('sidebar_prefs');
    if (remoteSidebar.ok && remoteSidebar.data) {
      localStorage.setItem(LS_SIDEBAR_PREFS, JSON.stringify(remoteSidebar.data));
    }
  }

  if (memberPerms) {
    await saveSetting('team_member_permissions', memberPerms);
  } else {
    const remotePerms = await getSetting<any>('team_member_permissions');
    if (remotePerms.ok && remotePerms.data) {
      localStorage.setItem(LS_TEAM_MEMBER_PERMISSIONS, JSON.stringify(remotePerms.data));
    }
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
}
