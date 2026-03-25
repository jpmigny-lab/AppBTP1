import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, User, Mail, Phone, Trash2, Building, Key, Edit2, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, type TeamMember } from '@/lib/supabase';
import { DEMO_TEAM_MEMBERS, isDemoTeamMemberId } from '@/data/demoTeam';
import { EmployeePermissionsSection } from '@/components/team/EmployeePermissionsSection';
import {
  createFullAccessPermissions,
  getMemberPermissions,
  removeMemberPermissions,
  setMemberPermissions,
  type StoredMemberPermissions,
} from '@/lib/teamMemberPermissions';

export default function TeamPage() {
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
      setMembers(data.length > 0 ? data : DEMO_TEAM_MEMBERS);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers(DEMO_TEAM_MEMBERS);
    } finally {
      setLoading(false);
    }
  };

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.role || !newMember.email || !newMember.login_code) {
      alert("Veuillez remplir tous les champs, y compris le code de connexion");
      return;
    }

    const result = await createTeamMember({
      name: newMember.name,
      role: newMember.role,
      email: newMember.email,
      phone: newMember.phone || null,
      status: 'actif',
      login_code: newMember.login_code,
    });

    if (result) {
      setMemberPermissions(result.id, newPermissions);
      const { createTeamInvitation } = await import('@/lib/supabase');
      const { inviteLink } = await createTeamInvitation(result.id, result.email);

      if (inviteLink) {
        setInviteLink(inviteLink);
        setShowInviteModal(true);
      }

      await loadMembers();
      setNewMember({ name: '', role: '', email: '', phone: '', login_code: '' });
      setNewPermissions(createFullAccessPermissions());
      setIsDialogOpen(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditPermissions(getMemberPermissions(member.id));
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    if (isDemoTeamMemberId(editingMember.id)) {
      setMemberPermissions(editingMember.id, editPermissions);
      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...editingMember } : m)),
      );
      setEditingMember(null);
      setIsEditDialogOpen(false);
      return;
    }

    const result = await updateTeamMember(editingMember.id, {
      name: editingMember.name,
      role: editingMember.role,
      email: editingMember.email,
      phone: editingMember.phone,
      status: editingMember.status,
      login_code: editingMember.login_code,
    });

    if (result) {
      setMemberPermissions(editingMember.id, editPermissions);
      await loadMembers();
      setEditingMember(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    if (isDemoTeamMemberId(id)) {
      removeMemberPermissions(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      return;
    }

    const success = await deleteTeamMember(id);
    if (success) {
      removeMemberPermissions(id);
      await loadMembers();
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Gestion de l'Équipe
            </h1>
            <p className="text-sm text-white/70">Gérez les membres de votre équipe et leurs codes de connexion</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setNewMember({ name: '', role: '', email: '', phone: '', login_code: '' });
                setNewPermissions(createFullAccessPermissions());
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
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

                <div className="space-y-2">
                  <Label htmlFor="login_code" className="text-white/90">
                    Code de connexion *
                  </Label>
                  <Input
                    id="login_code"
                    value={newMember.login_code}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, login_code: e.target.value }))}
                    className="bg-black/30 border-white/15 text-white font-mono placeholder:text-white/40"
                    placeholder="Code à communiquer au collaborateur"
                    maxLength={10}
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
            {!loading &&
              members.length > 0 &&
              members.every((m) => isDemoTeamMemberId(m.id)) && (
              <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2">
                Exemple d’équipe pour la démo. Avec un compte connecté et des membres dans Supabase, la liste affichera vos vrais collaborateurs.
              </p>
            )}
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
                    className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <User className="h-6 w-6 text-white/70" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-sm text-white/70">{member.role}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1 text-xs text-white/60">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <Key className="h-3 w-3" />
                            <span className="font-mono">{member.login_code}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={member.status === 'actif' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                        {member.status === 'actif' ? 'Actif' : 'Inactif'}
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
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl max-w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Modifier le membre</DialogTitle>
            </DialogHeader>
            {editingMember && (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-login_code" className="text-white/90">
                      Code de connexion
                    </Label>
                    <Input
                      id="edit-login_code"
                      value={editingMember.login_code}
                      onChange={(e) =>
                        setEditingMember((prev) => (prev ? { ...prev, login_code: e.target.value } : null))
                      }
                      className="bg-black/30 border-white/15 text-white font-mono"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status" className="text-white/90">
                      Statut
                    </Label>
                    <Select
                      value={editingMember.status}
                      onValueChange={(value) =>
                        setEditingMember((prev) =>
                          prev ? { ...prev, status: value as 'actif' | 'inactif' } : null,
                        )
                      }
                    >
                      <SelectTrigger id="edit-status" className="w-full bg-black/30 border-white/15 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="inactif">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              Dans <span className="text-white/90 font-medium">Mes Chantiers</span>, ouvrez ou créez un chantier
              et cochez les personnes dans « Équipe sur le chantier ». Les collaborateurs ne voient dans leur
              espace que les chantiers qui leur sont affectés (liste vide = visible par toute l&apos;équipe).
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Modal pour afficher le lien d'invitation */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Lien d'invitation créé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              Partagez ce lien avec le membre d'équipe pour qu'il puisse se connecter :
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteLink || ''}
                readOnly
                className="bg-black/20 border-white/10 text-white font-mono text-sm"
              />
              <Button
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Lien copié dans le presse-papier !');
                  }
                }}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Le membre devra entrer son code de connexion sur la page d'invitation.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
