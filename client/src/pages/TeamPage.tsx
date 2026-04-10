import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, User, Mail, Phone, Trash2, Building, Key, Edit2, Copy, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useChantiers } from '@/context/ChantiersContext';
import { fetchTeamMembers, updateTeamMember, deleteTeamMember, type TeamMember } from '@/lib/supabase';
import { EmployeePermissionsSection } from '@/components/team/EmployeePermissionsSection';
import {
  fetchTeamMemberChantierIds,
  fetchTeamMemberPermissionRows,
  replaceTeamMemberChantiers,
  replaceTeamMemberPermissions,
} from '@/lib/repositories/teamMemberRepository';
import { useToast } from '@/hooks/use-toast';
import {
  createTeamMemberViaApi,
  fetchOwnerSlug,
  updateMemberCodeViaApi,
} from '@/lib/teamApi';
import {
  createFullAccessPermissions,
  removeMemberPermissions,
  storedPermissionsFromPermissionRows,
  type StoredMemberPermissions,
} from '@/lib/teamMemberPermissions';

export default function TeamPage() {
  const MEMBER_CODES_CACHE_KEY = 'team_member_codes_cache_v1';
  const { toast } = useToast();
  const { chantiers } = useChantiers();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    login_code: '',
  });
  const [newPermissions, setNewPermissions] = useState<StoredMemberPermissions>(() =>
    createFullAccessPermissions(),
  );
  const [editPermissions, setEditPermissions] = useState<StoredMemberPermissions>(() =>
    createFullAccessPermissions(),
  );

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await fetchTeamMembers();
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [editableCode, setEditableCode] = useState("");
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);
  const [newAssignedChantierIds, setNewAssignedChantierIds] = useState<string[]>([]);
  const [editAssignedChantierIds, setEditAssignedChantierIds] = useState<string[]>([]);
  const [editDialogLoading, setEditDialogLoading] = useState(false);
  const [editSecurityCode, setEditSecurityCode] = useState('');
  const [ownerLoginLink, setOwnerLoginLink] = useState<string>('');
  const [memberCodesCache, setMemberCodesCache] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(MEMBER_CODES_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const updateMemberCodesCache = (memberId: string, code: string) => {
    setMemberCodesCache((prev) => {
      const next = { ...prev, [memberId]: code };
      localStorage.setItem(MEMBER_CODES_CACHE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.role || !newMember.email || !newMember.login_code) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs, y compris le code de connexion.",
        variant: "destructive",
      });
      return;
    }
    if (!/^\d{4}$/.test(newMember.login_code.trim())) {
      toast({
        title: "Code invalide",
        description: "Le code membre doit contenir exactement 4 chiffres.",
        variant: "destructive",
      });
      return;
    }

    const result = await createTeamMemberViaApi({
      name: newMember.name,
      role: newMember.role,
      email: newMember.email,
      phone: newMember.phone || undefined,
      code: newMember.login_code.trim(),
    });

    if (!result.ok) {
      toast({
        title: result.code === "DUPLICATE_CODE" ? "Code déjà utilisé" : "Création impossible",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const permSave = await replaceTeamMemberPermissions(result.member.id, newPermissions);
    if (!permSave.ok) {
      toast({
        title: "Membre créé",
        description: `Droits non enregistrés : ${permSave.error}`,
        variant: "destructive",
      });
    }
    const chSave = await replaceTeamMemberChantiers(result.member.id, newAssignedChantierIds);
    if (!chSave.ok) {
      toast({
        title: "Membre créé",
        description: `Affectations chantiers non enregistrées : ${chSave.error}`,
        variant: "destructive",
      });
    }
    const slug = await fetchOwnerSlug();
    if (slug.ok) {
      setInviteLink(`${window.location.origin}/team-login/${slug.ownerSlug}`);
      setShowInviteModal(true);
    } else {
      toast({
        title: "Membre ajouté",
        description: "Le membre est créé mais le lien de connexion n'a pas pu être récupéré.",
      });
    }
    setCreatedCode(newMember.login_code.trim());
    setEditableCode(newMember.login_code.trim());
    setCreatedMemberId(result.member.id);
    updateMemberCodesCache(result.member.id, newMember.login_code.trim());
    await loadMembers();
    setNewMember({ name: '', role: '', email: '', phone: '', login_code: '' });
    setNewPermissions(createFullAccessPermissions());
    setNewAssignedChantierIds([]);
    setIsDialogOpen(false);
  };

  const handleEditMember = async (member: TeamMember) => {
    setEditingMember(member);
    setEditSecurityCode(memberCodesCache[member.id] || member.login_code || '');
    const slug = await fetchOwnerSlug();
    if (slug.ok) {
      setOwnerLoginLink(`${window.location.origin}/team-login/${slug.ownerSlug}`);
    } else {
      setOwnerLoginLink('');
    }
    setIsEditDialogOpen(true);
    setEditDialogLoading(true);
    const [pr, cr] = await Promise.all([
      fetchTeamMemberPermissionRows(member.id),
      fetchTeamMemberChantierIds(member.id),
    ]);
    if (pr.ok && pr.rows.length > 0) {
      setEditPermissions(storedPermissionsFromPermissionRows(pr.rows));
    } else {
      setEditPermissions(createFullAccessPermissions());
    }
    if (cr.ok) setEditAssignedChantierIds(cr.ids);
    else setEditAssignedChantierIds([]);
    if (!pr.ok) {
      toast({ title: "Lecture des droits", description: pr.error, variant: "destructive" });
    }
    if (!cr.ok) {
      toast({ title: "Lecture des chantiers", description: cr.error, variant: "destructive" });
    }
    setEditDialogLoading(false);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    const result = await updateTeamMember(editingMember.id, {
      name: editingMember.name,
      role: editingMember.role,
      email: editingMember.email,
      phone: editingMember.phone,
      status:
        editingMember.status === 'actif'
          ? 'active'
          : editingMember.status === 'inactif'
            ? 'inactive'
            : editingMember.status,
    });

    if (!result) {
      toast({
        title: "Mise à jour impossible",
        description: "Le profil du membre n'a pas pu être enregistré.",
        variant: "destructive",
      });
      return;
    }

    const normalizedCode = editSecurityCode.trim();
    if (normalizedCode) {
      if (!/^\d{4}$/.test(normalizedCode)) {
        toast({
          title: "Code invalide",
          description: "Le code membre doit contenir exactement 4 chiffres.",
          variant: "destructive",
        });
        return;
      }
      const codeSave = await updateMemberCodeViaApi(editingMember.id, normalizedCode);
      if (!codeSave.ok) {
        toast({
          title: codeSave.code === "DUPLICATE_CODE" ? "Code déjà utilisé" : "Code non sauvegardé",
          description: codeSave.error,
          variant: "destructive",
        });
        return;
      }
      updateMemberCodesCache(editingMember.id, normalizedCode);
    }

    const permSave = await replaceTeamMemberPermissions(editingMember.id, editPermissions);
    const chSave = await replaceTeamMemberChantiers(editingMember.id, editAssignedChantierIds);
    if (!permSave.ok) {
      toast({ title: "Droits non sauvegardés", description: permSave.error, variant: "destructive" });
    }
    if (!chSave.ok) {
      toast({ title: "Chantiers non sauvegardés", description: chSave.error, variant: "destructive" });
    }
    if (permSave.ok && chSave.ok) {
      toast({ title: "Enregistré", description: "Droits et chantiers mis à jour." });
    }
    removeMemberPermissions(editingMember.id);
    await loadMembers();
    setEditingMember(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    const success = await deleteTeamMember(id);
    if (success) {
      removeMemberPermissions(id);
      await loadMembers();
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">
              Gestion de l'Équipe
            </h1>
            <p className="text-sm text-white/70 break-words">Gérez les membres de votre équipe et leurs codes de connexion</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setNewMember({ name: '', role: '', email: '', phone: '', login_code: '' });
                setNewPermissions(createFullAccessPermissions());
                setNewAssignedChantierIds([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un Membre
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl max-w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">Nouvel employé</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/90">
                      Nom
                    </Label>
                    <Input
                      id="name"
                      value={newMember.name}
                      onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-black/30 border-white/15 text-white placeholder:text-white/40"
                      placeholder="Ex. Jean Dupont"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                      className="bg-black/30 border-white/15 text-white placeholder:text-white/40"
                      placeholder="jean.dupont@exemple.fr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/90">
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember((prev) => ({ ...prev, phone: e.target.value }))}
                      className="bg-black/30 border-white/15 text-white placeholder:text-white/40"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-white/90">
                      Rôle
                    </Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) => setNewMember((prev) => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger
                        id="role"
                        className="w-full bg-black/30 border-white/15 text-white"
                      >
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="Employé">Employé</SelectItem>
                        <SelectItem value="Chef de chantier">Chef de chantier</SelectItem>
                        <SelectItem value="Ouvrier">Ouvrier</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Assistant">Assistant</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <EmployeePermissionsSection
                  value={newPermissions}
                  onChange={setNewPermissions}
                  idPrefix="new"
                />

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <div>
                    <Label className="text-white/90">Chantiers visibles pour ce membre</Label>
                    <p className="text-xs text-white/55 mt-1">
                      Aucune case cochée : le membre voit tous les chantiers. Sinon, uniquement ceux cochés.
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {chantiers.length === 0 ? (
                      <p className="text-sm text-white/50">Aucun chantier. Créez-en dans Mes chantiers.</p>
                    ) : (
                      chantiers.map((c) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`new-ch-${c.id}`}
                            checked={newAssignedChantierIds.includes(c.id)}
                            onCheckedChange={(checked) => {
                              setNewAssignedChantierIds((prev) =>
                                checked === true ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                              );
                            }}
                            className="border-white/40 data-[state=checked]:bg-violet-500"
                          />
                          <label htmlFor={`new-ch-${c.id}`} className="text-sm text-white/85 cursor-pointer">
                            {c.nom}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login_code" className="text-white/90">
                    Code de connexion *
                  </Label>
                  <Input
                    id="login_code"
                    value={newMember.login_code}
                    onChange={(e) =>
                      setNewMember((prev) => ({ ...prev, login_code: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                    }
                    className="bg-black/30 border-white/15 text-white font-mono placeholder:text-white/40"
                    placeholder="0000"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-white border-white/20 hover:bg-white/10 bg-transparent"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleAddMember}
                  className="bg-violet-600 hover:bg-violet-500 text-white border-0"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 ml-0 md:ml-20">
        {/* Membres de l'Équipe */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/70" />
              Membres de l'Équipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-white/70">Chargement...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-white/50" />
                <p className="text-white/70">Aucun membre dans l'équipe</p>
                <p className="text-sm text-white/50 mt-2">Ajoutez votre premier membre pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <User className="h-6 w-6 text-white/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{member.name}</p>
                        <p className="text-sm text-white/70">{member.role}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <div className="flex items-center gap-1 text-xs text-white/60 min-w-0">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[15rem] sm:max-w-[20rem]">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1 text-xs text-white/60">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{member.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <Key className="h-3 w-3" />
                            <span className="font-mono">
                              {memberCodesCache[member.id] || member.login_code || "----"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                      <Badge className={(member.status === 'active' || member.status === 'actif') ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                        {(member.status === 'active' || member.status === 'actif') ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog d'édition */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditDialogLoading(false);
              setEditingMember(null);
              setOwnerLoginLink('');
            }
          }}
        >
          <DialogContent className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl max-w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Modifier le membre</DialogTitle>
            </DialogHeader>
            {editDialogLoading && (
              <p className="text-white/70 py-8 text-center text-sm">Chargement des droits et chantiers…</p>
            )}
            {!editDialogLoading && editingMember && (
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-white/90">
                      Nom
                    </Label>
                    <Input
                      id="edit-name"
                      value={editingMember.name}
                      onChange={(e) =>
                        setEditingMember((prev) => (prev ? { ...prev, name: e.target.value } : null))
                      }
                      className="bg-black/30 border-white/15 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingMember.email}
                      onChange={(e) =>
                        setEditingMember((prev) => (prev ? { ...prev, email: e.target.value } : null))
                      }
                      className="bg-black/30 border-white/15 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" className="text-white/90">
                      Téléphone
                    </Label>
                    <Input
                      id="edit-phone"
                      value={editingMember.phone || ''}
                      onChange={(e) =>
                        setEditingMember((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                      }
                      className="bg-black/30 border-white/15 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role" className="text-white/90">
                      Rôle
                    </Label>
                    <Select
                      value={editingMember.role}
                      onValueChange={(value) =>
                        setEditingMember((prev) => (prev ? { ...prev, role: value } : null))
                      }
                    >
                      <SelectTrigger id="edit-role" className="w-full bg-black/30 border-white/15 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="Employé">Employé</SelectItem>
                        <SelectItem value="Chef de chantier">Chef de chantier</SelectItem>
                        <SelectItem value="Ouvrier">Ouvrier</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Assistant">Assistant</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <EmployeePermissionsSection
                  value={editPermissions}
                  onChange={setEditPermissions}
                  idPrefix="edit"
                />

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <div>
                    <Label className="text-white/90">Chantiers visibles pour ce membre</Label>
                    <p className="text-xs text-white/55 mt-1">
                      Aucune case cochée : le membre voit tous les chantiers. Sinon, uniquement ceux cochés.
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {chantiers.length === 0 ? (
                      <p className="text-sm text-white/50">Aucun chantier.</p>
                    ) : (
                      chantiers.map((c) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`edit-ch-${c.id}`}
                            checked={editAssignedChantierIds.includes(c.id)}
                            onCheckedChange={(checked) => {
                              setEditAssignedChantierIds((prev) =>
                                checked === true ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                              );
                            }}
                            className="border-white/40 data-[state=checked]:bg-violet-500"
                          />
                          <label htmlFor={`edit-ch-${c.id}`} className="text-sm text-white/85 cursor-pointer">
                            {c.nom}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-status" className="text-white/90">
                      Statut
                    </Label>
                    <Select
                      value={editingMember.status === 'actif' ? 'active' : editingMember.status === 'inactif' ? 'inactive' : editingMember.status}
                      onValueChange={(value) =>
                        setEditingMember((prev) =>
                          prev ? { ...prev, status: value as 'active' | 'inactive' } : null,
                        )
                      }
                    >
                      <SelectTrigger id="edit-status" className="w-full bg-black/30 border-white/15 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-security-code" className="text-white/90">
                      Code de sécurité (4 chiffres)
                    </Label>
                    <Input
                      id="edit-security-code"
                      value={editSecurityCode}
                      onChange={(e) => setEditSecurityCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="bg-black/30 border-white/15 text-white font-mono"
                      placeholder="0000"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <Label className="text-white/90">Lien de connexion membre</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={ownerLoginLink}
                      readOnly
                      className="bg-black/20 border-white/10 text-white font-mono text-sm min-w-0"
                      placeholder="Lien indisponible"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (!ownerLoginLink) return;
                        navigator.clipboard.writeText(ownerLoginLink);
                        toast({ title: "Lien copié", description: "Le lien de connexion a été copié." });
                      }}
                      className="w-full sm:w-auto bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!editingMember?.email || !ownerLoginLink) return;
                        const subject = encodeURIComponent("Votre accès espace équipe AXYOS Renov");
                        const body = encodeURIComponent(
                          [
                            `Bonjour ${editingMember.name},`,
                            "",
                            "Voici votre lien de connexion :",
                            ownerLoginLink,
                            "",
                            "Votre code de sécurité :",
                            editSecurityCode || memberCodesCache[editingMember.id] || "à définir",
                          ].join("\n"),
                        );
                        window.location.href = `mailto:${encodeURIComponent(editingMember.email)}?subject=${subject}&body=${body}`;
                      }}
                      className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer
                    </Button>
                  </div>
                  <p className="text-xs text-white/60">
                    Le lien reste identique pour tous vos membres ({`/team-login/{votre-slug}`}); seul le code change.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="text-white border-white/20 hover:bg-white/10 bg-transparent"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleUpdateMember}
                className="bg-violet-600 hover:bg-violet-500 text-white border-0"
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Affectation aux Chantiers */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-white/70" />
              Affectation aux Chantiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70">
              Lorsque vous ajoutez ou modifiez un membre, cochez les chantiers auxquels il doit avoir accès dans
              son espace collaborateur. Si vous ne cochez rien, il voit <span className="text-white/90 font-medium">tous</span> les chantiers.
              Vous pouvez aussi affiner par chantier dans <span className="text-white/90 font-medium">Mes chantiers</span> (équipe sur le chantier).
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Modal pour afficher le lien d'invitation */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl max-w-[min(42rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle className="text-white">Membre créé avec succès</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              Partagez ce lien avec le membre d&apos;équipe. Il entrera uniquement son code 4 chiffres :
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={inviteLink || ''}
                readOnly
                className="bg-black/20 border-white/10 text-white font-mono text-sm min-w-0"
              />
              <Button
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    toast({ title: "Lien copié", description: "Le lien de connexion a été copié." });
                  }
                }}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-white/90">Code 4 chiffres (modifiable)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="bg-black/20 border-white/10 text-white font-mono tracking-[0.25em] text-center"
                  maxLength={4}
                />
                <Button
                  type="button"
                  onClick={async () => {
                    if (!createdMemberId) return;
                    if (!/^\d{4}$/.test(editableCode)) {
                      toast({
                        title: "Code invalide",
                        description: "Le code doit contenir exactement 4 chiffres.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const r = await updateMemberCodeViaApi(createdMemberId, editableCode);
                    if (!r.ok) {
                      toast({
                        title: r.code === "DUPLICATE_CODE" ? "Code déjà utilisé" : "Mise à jour impossible",
                        description: r.error,
                        variant: "destructive",
                      });
                      return;
                    }
                    setCreatedCode(editableCode);
                    if (createdMemberId) updateMemberCodesCache(createdMemberId, editableCode);
                    toast({ title: "Code mis à jour", description: "Le nouveau code a été enregistré." });
                  }}
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white"
                >
                  Mettre à jour
                </Button>
              </div>
              <p className="text-xs text-white/60">
                Code initial: <span className="font-mono">{createdCode || "----"}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
