import { supabase } from '@/lib/supabase';
import { PERMISSION_KEYS, type StoredMemberPermissions } from '@/lib/teamMemberPermissions';

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function fetchTeamMemberPermissionRows(teamMemberId: string): Promise<
  { ok: true; rows: { feature_key: string; can_view: boolean; can_edit: boolean }[] } | { ok: false; error: string }
> {
  try {
    const { data, error } = await supabase
      .from('team_member_permissions')
      .select('feature_key, can_view, can_edit')
      .eq('team_member_id', teamMemberId);
    if (error) throw error;
    return {
      ok: true,
      rows: (data || []).map((r: any) => ({
        feature_key: String(r.feature_key),
        can_view: Boolean(r.can_view),
        can_edit: Boolean(r.can_edit),
      })),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erreur lecture permissions' };
  }
}

export async function fetchTeamMemberChantierIds(teamMemberId: string): Promise<
  { ok: true; ids: string[] } | { ok: false; error: string }
> {
  try {
    const { data, error } = await supabase
      .from('team_member_chantiers')
      .select('chantier_id')
      .eq('team_member_id', teamMemberId);
    if (error) throw error;
    return {
      ok: true,
      ids: (data || []).map((r: any) => String(r.chantier_id)).filter(Boolean),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erreur lecture affectations' };
  }
}

export async function replaceTeamMemberPermissions(
  teamMemberId: string,
  permissions: StoredMemberPermissions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Non authentifié' };
    const now = new Date().toISOString();
    const rows = PERMISSION_KEYS.map((key) => ({
      owner_user_id: userId,
      team_member_id: teamMemberId,
      feature_key: key,
      can_view: permissions.view[key],
      can_edit: permissions.edit[key],
      updated_at: now,
    }));
    const { error: delErr } = await supabase
      .from('team_member_permissions')
      .delete()
      .eq('team_member_id', teamMemberId);
    if (delErr) throw delErr;
    const { error: insErr } = await supabase.from('team_member_permissions').insert(rows);
    if (insErr) throw insErr;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erreur sauvegarde permissions' };
  }
}

export async function replaceTeamMemberChantiers(
  teamMemberId: string,
  chantierIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Non authentifié' };
    const { error: delErr } = await supabase
      .from('team_member_chantiers')
      .delete()
      .eq('team_member_id', teamMemberId);
    if (delErr) throw delErr;
    if (chantierIds.length === 0) return { ok: true };
    const rows = chantierIds.map((chantier_id) => ({
      owner_user_id: userId,
      team_member_id: teamMemberId,
      chantier_id,
    }));
    const { error: insErr } = await supabase.from('team_member_chantiers').insert(rows);
    if (insErr) throw insErr;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erreur sauvegarde affectations chantiers' };
  }
}
