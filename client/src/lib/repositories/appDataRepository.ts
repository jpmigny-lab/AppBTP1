import {
  type AppChantier,
  type AppClient,
  type RepoResult,
  listAppChantiers,
  listAppClients,
  loadJsonSetting,
  saveJsonSetting,
  upsertAppChantiers,
  upsertAppClients,
  supabase,
} from '@/lib/supabase';

export type JsonMap = Record<string, unknown>;

/** PostgREST : table absente ou cache schéma pas à jour */
function friendlyMissingTableError(raw: string, table: 'app_devis' | 'app_factures'): string {
  const msg = raw || '';
  if (
    msg.includes(table) ||
    (msg.includes('schema cache') && msg.includes('Could not find'))
  ) {
    if (table === 'app_devis') {
      return "Table « app_devis » absente sur ce projet Supabase. Ouvrez le SQL Editor et exécutez le fichier supabase/migrations/20260401_app_data.sql (tout le script), puis réessayez.";
    }
    return "Table « app_factures » absente : exécutez la migration supabase/migrations/20260401_app_data.sql dans Supabase.";
  }
  return raw;
}

export async function getClients(): Promise<RepoResult<AppClient[]>> {
  return listAppClients();
}

export async function saveClients(clients: AppClient[]): Promise<RepoResult<number>> {
  return upsertAppClients(clients);
}

export async function getChantiers(): Promise<RepoResult<AppChantier[]>> {
  return listAppChantiers();
}

export async function saveChantiers(chantiers: AppChantier[]): Promise<RepoResult<number>> {
  return upsertAppChantiers(chantiers);
}

export async function saveSetting(key: string, value: unknown): Promise<RepoResult<boolean>> {
  return saveJsonSetting(key, value);
}

export async function getSetting<T>(key: string): Promise<RepoResult<T | null>> {
  return loadJsonSetting<T>(key);
}

export async function saveDevisList(savedList: unknown[]): Promise<RepoResult<number>> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Utilisateur non authentifié', code: 'AUTH_REQUIRED' };
    const rows = savedList.map((d: any) => ({
      id: String(d.id),
      owner_user_id: userId,
      nom: String(d.nom || ''),
      statut: String(d.statut || 'brouillon'),
      state_json: d.state,
      created_at: d.createdAt || new Date().toISOString(),
      updated_at: d.updatedAt || new Date().toISOString(),
    }));
    const { error } = await supabase.from('app_devis').upsert(rows, { onConflict: 'id' });
    if (error)
      return { ok: false, error: friendlyMissingTableError(error.message, 'app_devis') };
    return { ok: true, data: rows.length };
  } catch (error) {
    return { ok: false, error: (error as any)?.message || 'Erreur sauvegarde devis' };
  }
}

export async function loadDevisList(): Promise<RepoResult<unknown[]>> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: true, data: [] };
    const { data, error } = await supabase
      .from('app_devis')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });
    if (error)
      return { ok: false, error: friendlyMissingTableError(error.message, 'app_devis') };
    const mapped = (data || []).map((r: any) => ({
      id: r.id,
      nom: r.nom,
      statut: r.statut,
      state: r.state_json,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return { ok: true, data: mapped };
  } catch (error) {
    return {
      ok: false,
      error: friendlyMissingTableError(
        (error as any)?.message || '',
        'app_devis',
      ) || 'Erreur lecture devis',
    };
  }
}

export async function saveFacturesList(savedList: unknown[]): Promise<RepoResult<number>> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Utilisateur non authentifié', code: 'AUTH_REQUIRED' };
    const rows = savedList.map((f: any) => ({
      id: String(f.id),
      owner_user_id: userId,
      nom: String(f.nom || ''),
      statut: String(f.statut || 'brouillon'),
      devis_source_id: f.devisSourceId ?? null,
      state_json: f.state,
      created_at: f.createdAt || new Date().toISOString(),
      updated_at: f.updatedAt || new Date().toISOString(),
    }));
    const { error } = await supabase.from('app_factures').upsert(rows, { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: rows.length };
  } catch (error) {
    return { ok: false, error: (error as any)?.message || 'Erreur sauvegarde factures' };
  }
}

export async function loadFacturesList(): Promise<RepoResult<unknown[]>> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: true, data: [] };
    const { data, error } = await supabase
      .from('app_factures')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: error.message };
    const mapped = (data || []).map((r: any) => ({
      id: r.id,
      nom: r.nom,
      statut: r.statut,
      devisSourceId: r.devis_source_id,
      state: r.state_json,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return { ok: true, data: mapped };
  } catch (error) {
    return { ok: false, error: (error as any)?.message || 'Erreur lecture factures' };
  }
}

export async function saveCrmColumns(columns: unknown[]): Promise<RepoResult<number>> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: 'Utilisateur non authentifié', code: 'AUTH_REQUIRED' };
    const rows: any[] = [];
    for (const col of columns as any[]) {
      for (const item of col.items || []) {
        rows.push({
          id: String(item.id),
          owner_user_id: userId,
          stage: String(col.id),
          payload: item,
        });
      }
    }
    const { error: purgeError } = await supabase
      .from('app_crm_prospects')
      .delete()
      .eq('owner_user_id', userId);
    if (purgeError) return { ok: false, error: purgeError.message };
    if (!rows.length) return { ok: true, data: 0 };
    const { error } = await supabase.from('app_crm_prospects').insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: rows.length };
  } catch (error) {
    return { ok: false, error: (error as any)?.message || 'Erreur sauvegarde CRM' };
  }
}

export async function loadCrmColumns(): Promise<RepoResult<unknown[]>> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: true, data: [] };
    const { data, error } = await supabase
      .from('app_crm_prospects')
      .select('*')
      .eq('owner_user_id', userId);
    if (error) return { ok: false, error: error.message };
    const map = new Map<string, any[]>();
    for (const row of data || []) {
      const stage = String((row as any).stage || 'all');
      const current = map.get(stage) || [];
      current.push((row as any).payload);
      map.set(stage, current);
    }
    const cols = ['all', 'quote', 'followup1', 'followup2', 'followup3', 'followup4'].map((id) => ({
      id,
      name:
        id === 'all'
          ? 'Tous les prospects'
          : id === 'quote'
          ? 'Envoi du devis'
          : `Relance ${id.replace('followup', '')}`,
      items: map.get(id) || [],
    }));
    return { ok: true, data: cols };
  } catch (error) {
    return { ok: false, error: (error as any)?.message || 'Erreur lecture CRM' };
  }
}
