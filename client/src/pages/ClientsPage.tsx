import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Plus, Building, Mail, Phone, Image as ImageIcon, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useChantiers, Client } from '@/context/ChantiersContext';

export default function ClientsPage() {
  const { clients, chantiers, addClient, updateClient } = useChantiers();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });

  // Filtrer les chantiers du client sélectionné
  const clientChantiers = selectedClient
    ? chantiers.filter(c => c.clientId === selectedClient.id)
    : [];

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setNewClient({ name: client.name, email: client.email, phone: client.phone });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setNewClient({ name: '', email: '', phone: '' });
  };

  const handleSaveClient = () => {
    if (!newClient.name || !newClient.email || !newClient.phone) return;

    if (editingClient) {
      updateClient(editingClient.id, newClient);
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient({ ...selectedClient, ...newClient });
      }
    } else {
      const client: Client = {
        id: Date.now().toString(),
        ...newClient
      };
      addClient(client);
    }
    closeDialog();
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl ml-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Clients
            </h1>
            <p className="text-sm text-white/70">
              {selectedClient ? `Chantiers de ${selectedClient.name}` : 'Gérez vos clients et leurs chantiers'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) closeDialog();
            else if (!editingClient) setNewClient({ name: '', email: '', phone: '' });
          }}>
            {!selectedClient && (
              <Button
                onClick={() => { setEditingClient(null); setNewClient({ name: '', email: '', phone: '' }); setIsDialogOpen(true); }}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un Client
              </Button>
            )}
            <DialogContent
              overlayClassName="!bg-black/40"
              className="!bg-transparent border-0 shadow-none max-w-md p-0 gap-0 [&>button]:!text-white [&>button]:hover:!bg-white/20 [&>button]:rounded-lg [&>button]:right-4 [&>button]:top-4"
            >
              <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-2xl p-6 pt-12 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">{editingClient ? 'Modifier le client' : 'Nouveau Client'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Nom</Label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Nom du client"
                      className="bg-white/25 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-white/40"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Email</Label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="email@example.com"
                      className="bg-white/25 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-white/40"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Téléphone</Label>
                    <Input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="bg-white/25 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-white/40"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={closeDialog}
                      className="text-white border-white/30 bg-white/10 hover:bg-white/20"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSaveClient}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-0"
                    >
                      {editingClient ? 'Enregistrer' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {selectedClient && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedClient(null)}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Retour à la liste
              </Button>
              <Button
                variant="outline"
                onClick={() => openEditDialog(selectedClient)}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 ml-20">
        {!selectedClient ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-white/70" />
                      </div>
                      <CardTitle className="text-lg truncate">{client.name}</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(client); }}
                      className="text-white border-white/20 hover:bg-white/10 shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Building className="h-4 w-4" />
                      {chantiers.filter(c => c.clientId === client.id).length} chantier(s)
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div>
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <User className="h-6 w-6 text-white/70" />
                  </div>
                  <div>
                    <div className="text-xl">{selectedClient.name}</div>
                    <div className="text-sm font-normal text-white/70">{selectedClient.email}</div>
                    <div className="text-sm font-normal text-white/70">{selectedClient.phone}</div>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            <h2 className="text-xl font-semibold text-white mb-4">Chantiers de {selectedClient.name}</h2>

            {clientChantiers.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardContent className="py-12 text-center">
                  <Building className="h-12 w-12 mx-auto mb-4 text-white/50" />
                  <p className="text-white/70">Aucun chantier pour ce client</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientChantiers.map((chantier) => (
                  <Card
                    key={chantier.id}
                    className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow"
                  >
                    {chantier.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={chantier.images[0]}
                          alt={chantier.nom}
                          className="w-full h-full object-cover"
                        />
                        {chantier.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {chantier.images.length}
                          </div>
                        )}
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{chantier.nom}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-white/70">
                        Date: {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-sm text-white/70">
                        Durée: {chantier.duree}
                      </div>
                      <div className="mt-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                          chantier.statut === 'en cours' ? 'bg-green-500/20 text-green-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {chantier.statut}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </PageWrapper>
  );
}

