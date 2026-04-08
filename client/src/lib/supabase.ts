import { createClient } from '@supabase/supabase-js';
import { DEMO_TEAM_MEMBERS } from '@/data/demoTeam';
import { z } from 'zod';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://hvnjlxxcxfxvuwlmnwtw.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bmpseHhjeGZ4dnV3bG1ud3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NzA3ODIsImV4cCI6MjA3OTU0Njc4Mn0.SmL4eqGq8XLfbLOolxGdafLhS6eeTgYGGn1w9gcrWdU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type RepoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; retryable?: boolean };

const RetryOptionsSchema = z.object({
  retries: z.number().int().min(0).max(5).default(2),
  baseDelayMs: z.number().int().min(50).max(2000).default(250),
});

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  const msg = String((err as any)?.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('network') || msg.includes('fetch');
}

async function runWithRetry<T>(fn: () => Promise<T>, options?: Partial<z.infer<typeof RetryOptionsSchema>>): Promise<T> {
  const cfg = RetryOptionsSchema.parse(options || {});
  let lastError: unknown;
  for (let i = 0; i <= cfg.retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === cfg.retries || !isRetryable(err)) break;
      const wait = cfg.baseDelayMs * 2 ** i + Math.floor(Math.random() * 50);
      await sleep(wait);
    }
  }
  throw lastError;
}

function fail<T>(error: unknown, fallbackMessage: string): RepoResult<T> {
  const message = (error as any)?.message ? String((error as any).message) : fallbackMessage;
  return { ok: false, error: message, retryable: isRetryable(error) };
}

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: 'actif' | 'inactif';
  login_code: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'actif')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

const AppClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

const AppChantierSchema = z.object({
  id: z.string(),
  nom: z.string().min(1),
  clientId: z.string(),
  clientName: z.string(),
  dateDebut: z.string(),
  duree: z.string(),
  images: z.array(z.string()).default([]),
  statut: z.enum(['planifié', 'en cours', 'terminé']),
  assignedMemberIds: z.array(z.string()).default([]),
});

export type AppClient = z.infer<typeof AppClientSchema>;
export type AppChantier = z.infer<typeof AppChantierSchema>;

export async function listAppClients(): Promise<RepoResult<AppClient[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: true, data: [] };
    const { data, error } = await runWithRetry(() =>
      supabase.from('app_clients').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    );
    if (error) throw error;
    const rows = (data || []).map((r: any) =>
      AppClientSchema.parse({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
      }),
    );
    return { ok: true, data: rows };
  } catch (error) {
    return fail(error, 'Erreur lecture clients');
  }
}

export async function upsertAppClients(clients: AppClient[]): Promise<RepoResult<number>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Utilisateur non authentifié', code: 'AUTH_REQUIRED' };
    const payload = clients.map((c) => {
      const parsed = AppClientSchema.parse(c);
      return { ...parsed, owner_user_id: userId };
    });
    const { error } = await runWithRetry(() =>
      supabase.from('app_clients').upsert(payload, { onConflict: 'id' }),
    );
    if (error) throw error;
    return { ok: true, data: payload.length };
  } catch (error) {
    return fail(error, 'Erreur sauvegarde clients');
  }
}

export async function listAppChantiers(): Promise<RepoResult<AppChantier[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: true, data: [] };
    const { data, error } = await runWithRetry(() =>
      supabase.from('app_chantiers').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    );
    if (error) throw error;
    const rows = (data || []).map((r: any) =>
      AppChantierSchema.parse({
        id: r.id,
        nom: r.nom,
        clientId: r.client_id,
        clientName: r.client_name,
        dateDebut: r.date_debut,
        duree: r.duree,
        images: r.images || [],
        statut: r.statut,
        assignedMemberIds: r.assigned_member_ids || [],
      }),
    );
    return { ok: true, data: rows };
  } catch (error) {
    return fail(error, 'Erreur lecture chantiers');
  }
}

export async function upsertAppChantiers(chantiers: AppChantier[]): Promise<RepoResult<number>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Utilisateur non authentifié', code: 'AUTH_REQUIRED' };
    const payload = chantiers.map((c) => {
      const parsed = AppChantierSchema.parse(c);
      return {
        id: parsed.id,
        owner_user_id: userId,
        nom: parsed.nom,
        client_id: parsed.clientId,
        client_name: parsed.clientName,
        date_debut: parsed.dateDebut,
        duree: parsed.duree,
        images: parsed.images,
        statut: parsed.statut,
        assigned_member_ids: parsed.assignedMemberIds,
      };
    });
    const { error } = await runWithRetry(() =>
      supabase.from('app_chantiers').upsert(payload, { onConflict: 'id' }),
    );
    if (error) throw error;
    return { ok: true, data: payload.length };
  } catch (error) {
    return fail(error, 'Erreur sauvegarde chantiers');
  }
}

export async function saveJsonSetting(key: string, value: unknown): Promise<RepoResult<boolean>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Utilisateur non authentifié', code: 'AUTH_REQUIRED' };
    const { error } = await runWithRetry(() =>
      supabase.from('app_settings').upsert(
        { owner_user_id: userId, key, value_json: value },
        { onConflict: 'owner_user_id,key' },
      ),
    );
    if (error) throw error;
    return { ok: true, data: true };
  } catch (error) {
    return fail(error, `Erreur sauvegarde paramètre ${key}`);
  }
}

export async function loadJsonSetting<T>(key: string): Promise<RepoResult<T | null>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: true, data: null };
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('app_settings')
        .select('value_json')
        .eq('owner_user_id', userId)
        .eq('key', key)
        .maybeSingle(),
    );
    if (error) throw error;
    return { ok: true, data: ((data as any)?.value_json ?? null) as T | null };
  } catch (error) {
    return fail(error, `Erreur lecture paramètre ${key}`);
  }
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Generate a random 6-digit code if not provided
    const loginCode = member.login_code || Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        ...member,
        login_code: loginCode,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating team member:', error);
    return null;
  }
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating team member:', error);
    return null;
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error deleting team member:', error);
    return false;
  }
}

export async function verifyTeamMemberCode(code: string, invitationToken?: string): Promise<TeamMember | null> {
  try {
    // Si un token d'invitation est fourni, on peut vérifier sans auth
    if (invitationToken) {
      // D'abord, vérifier que l'invitation est valide
      const invitation = await getInvitationByToken(invitationToken);
      if (!invitation) return null;

      // Ensuite, vérifier le code pour ce membre spécifique
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', invitation.team_member_id)
        .eq('login_code', code)
        .eq('status', 'actif')
        .single();

      if (error || !data) return null;
      return data;
    }

    // Sinon, vérification normale avec auth
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('login_code', code)
      .eq('status', 'actif')
      .eq('user_id', userId)
      .single();

    if (data && !error) return data;

    const demoMember = DEMO_TEAM_MEMBERS.find(
      (m) => m.login_code === code.trim() && m.status === 'actif',
    );
    return demoMember ?? null;
  } catch (error) {
    console.error('Error verifying code:', error);
    const demoMember = DEMO_TEAM_MEMBERS.find(
      (m) => m.login_code === code.trim() && m.status === 'actif',
    );
    return demoMember ?? null;
  }
}

// Admin code functions
export interface AdminCode {
  id: string;
  code: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

function isAdminCodesTableMissing(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = String((error as any)?.message || '').toLowerCase();
  return code === 'PGRST205' && message.includes('admin_codes');
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run3',hypothesisId:'H9',location:'supabase.ts:verifyAdminCode:start',message:'verifyAdminCode start',data:{hasUserId:Boolean(userId),codeLength:code.trim().length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('code', code)
      .eq('user_id', userId)
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run3',hypothesisId:'H9',location:'supabase.ts:verifyAdminCode:queryResult',message:'verifyAdminCode query result',data:{hasData:Boolean(data),hasError:Boolean(error),errorCode:(error as any)?.code || null,errorMessage:error?.message || null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (error) throw error;
    return !!data;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run3',hypothesisId:'H10',location:'supabase.ts:verifyAdminCode:catch',message:'verifyAdminCode catch fallback path',data:{errorCode:(error as any)?.code || null,errorMessage:(error as any)?.message || null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (isAdminCodesTableMissing(error)) {
      const fallback = await loadJsonSetting<{ code?: string }>('admin_code');
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run3',hypothesisId:'H10',location:'supabase.ts:verifyAdminCode:fallbackResult',message:'verifyAdminCode fallback result',data:{fallbackOk:fallback.ok,hasFallbackData:Boolean((fallback as any).data),matches:Boolean(fallback.ok && !!fallback.data?.code && fallback.data.code === code)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return fallback.ok && !!fallback.data?.code && fallback.data.code === code;
    }
    console.error('Error verifying admin code:', error);
    return false;
  }
}

export async function getAdminCode(): Promise<AdminCode | null> {
  try {
    const userId = await getCurrentUserId();
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H5',location:'supabase.ts:getAdminCode:start',message:'getAdminCode start',data:{hasUserId:Boolean(userId)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H5',location:'supabase.ts:getAdminCode:error',message:'getAdminCode query error',data:{message:error.message,code:(error as any).code || null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      throw error;
    }
    if (!data) return null;
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H5',location:'supabase.ts:getAdminCode:found',message:'getAdminCode found row',data:{hasData:true},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return data;
  } catch (error) {
    if (isAdminCodesTableMissing(error)) {
      const fallback = await loadJsonSetting<{ code?: string; updated_at?: string }>('admin_code');
      if (!fallback.ok || !fallback.data?.code) return null;
      return {
        id: 'fallback-admin-code',
        code: fallback.data.code,
        user_id: null,
        created_at: fallback.data.updated_at || new Date().toISOString(),
        updated_at: fallback.data.updated_at || new Date().toISOString(),
      };
    }
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H5',location:'supabase.ts:getAdminCode:catch',message:'getAdminCode catch',data:{errorMessage:error instanceof Error ? error.message : 'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Error getting admin code:', error);
    return null;
  }
}

// Team Invitation functions
export interface TeamInvitation {
  id: string;
  user_id: string;
  team_member_id: string | null;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  updated_at: string;
}

// --- Estimations IA ---
export type EstimationStatus = 'brouillon' | 'converti en chantier'

export interface EstimationRow {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  status: EstimationStatus
  form_data: any
  result_json: any
}

export async function createEstimation(input: {
  form_data: any
  result_json: any
  status: EstimationStatus
}): Promise<EstimationRow | null> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('estimations')
      .insert({
        user_id: userId,
        status: input.status,
        form_data: input.form_data,
        result_json: input.result_json,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throw error
    return data as any
  } catch (error) {
    console.error('Error creating estimation:', error)
    return null
  }
}

export async function listEstimations(): Promise<EstimationRow[]> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('estimations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as any
  } catch (error) {
    console.error('Error listing estimations:', error)
    return []
  }
}

export async function getEstimationById(id: string): Promise<EstimationRow | null> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('estimations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data as any
  } catch (error) {
    console.error('Error getting estimation:', error)
    return null
  }
}

export async function updateEstimationStatus(id: string, status: EstimationStatus): Promise<boolean> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('estimations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    return !error
  } catch (error) {
    console.error('Error updating estimation status:', error)
    return false
  }
}

export async function convertEstimationToChantier(id: string): Promise<boolean> {
  // MVP: on marque comme converti (la création chantier DB dépend de ta table chantiers)
  return await updateEstimationStatus(id, 'converti en chantier')
}

// Générer un token unique pour l'invitation
function generateInvitationToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

// Créer une invitation pour un membre d'équipe
export async function createTeamInvitation(
  teamMemberId: string,
  email: string
): Promise<{ invitation: TeamInvitation | null; inviteLink: string | null }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        user_id: userId,
        team_member_id: teamMemberId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Générer le lien d'invitation
    const inviteLink = `${window.location.origin}/invite/${token}`;

    return { invitation: data, inviteLink };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { invitation: null, inviteLink: null };
  }
}

// Vérifier et récupérer une invitation par token
export async function getInvitationByToken(
  token: string
): Promise<TeamInvitation | null> {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !data) return null;

    // Vérifier si l'invitation a expiré
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting invitation:', error);
    return null;
  }
}

// Marquer une invitation comme utilisée
export async function markInvitationAsUsed(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_invitations')
      .update({
        used: true,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token);

    return !error;
  } catch (error) {
    console.error('Error marking invitation as used:', error);
    return false;
  }
}

export async function updateAdminCode(newCode: string): Promise<AdminCode | null> {
  try {
    const userId = await getCurrentUserId();
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H6',location:'supabase.ts:updateAdminCode:start',message:'updateAdminCode start',data:{hasUserId:Boolean(userId),codeLength:newCode.trim().length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!userId) throw new Error('User not authenticated');
    if (!newCode || newCode.trim().length < 3) {
      throw new Error('Le code admin doit contenir au moins 3 caractères');
    }

    // First, get the existing admin code
    const existing = await getAdminCode();
    
    if (existing) {
      // Update existing code
      const { data, error } = await supabase
        .from('admin_codes')
        .update({
          code: newCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H6',location:'supabase.ts:updateAdminCode:updateError',message:'update branch failed',data:{message:error.message,code:(error as any).code || null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw error;
      }
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H6',location:'supabase.ts:updateAdminCode:updateOk',message:'update branch success',data:{ok:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return data;
    } else {
      // Create new admin code
      const { data, error } = await supabase
        .from('admin_codes')
        .insert({
          code: newCode,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H6',location:'supabase.ts:updateAdminCode:insertError',message:'insert branch failed',data:{message:error.message,code:(error as any).code || null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw error;
      }
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H6',location:'supabase.ts:updateAdminCode:insertOk',message:'insert branch success',data:{ok:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return data;
    }
  } catch (error) {
    if (isAdminCodesTableMissing(error)) {
      const updatedAt = new Date().toISOString();
      const saved = await saveJsonSetting('admin_code', { code: newCode.trim(), updated_at: updatedAt });
      if (!saved.ok) return null;
      return {
        id: 'fallback-admin-code',
        code: newCode.trim(),
        user_id: null,
        created_at: updatedAt,
        updated_at: updatedAt,
      };
    }
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run2',hypothesisId:'H6',location:'supabase.ts:updateAdminCode:catch',message:'updateAdminCode catch',data:{errorMessage:error instanceof Error ? error.message : 'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Error updating admin code:', error);
    return null;
  }
}

