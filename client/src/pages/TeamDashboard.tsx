import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TeamSidebar from '@/components/TeamSidebar';
import { GlobalBackground } from '@/components/GlobalBackground';
import { Building, Calendar, Clock, ShieldAlert } from 'lucide-react';
import { useChantiers } from '@/context/ChantiersContext';
import { useTeamPortalAccess } from '@/hooks/useTeamPortalAccess';
import { canViewTeamArea, pathForTeamArea, teamAreaFromPath, type TeamPortalArea } from '@/lib/teamPortalAccess';
import { isChantierVisibleToTeamMember } from '@/lib/chantierAssignments';

export default function TeamDashboard() {
  const [location, setLocation] = useLocation();
  const { chantiers } = useChantiers();
  const { member, permissions, firstPath, canView, canEdit } = useTeamPortalAccess();

  const area = teamAreaFromPath(location);

  useEffect(() => {
    const storedMember = localStorage.getItem('teamMember');
    const userType = localStorage.getItem('userType');
    if (!storedMember || userType !== 'team') {
      setLocation('/');
    }
  }, [setLocation]);

  useEffect(() => {
    if (!member || firstPath === null) return;
    if (!canViewTeamArea(permissions, teamAreaFromPath(location))) {
      setLocation(firstPath);
    }
  }, [member, permissions, location, firstPath, setLocation]);

  const chantiersPourMoi = useMemo(
    () => chantiers.filter((c) => isChantierVisibleToTeamMember(c, member?.id)),
    [chantiers, member?.id],
  );

  const myChantiers = chantiersPourMoi.filter((c) => c.statut !== 'terminé');
  const chantiersEnCours = chantiersPourMoi.filter((c) => c.statut === 'en cours');
  const chantiersPlanifies = chantiersPourMoi.filter((c) => c.statut === 'planifié');

  const tabClass = (a: TeamPortalArea) =>
    area === a
      ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30'
      : 'text-white hover:bg-white/10';

  const showReadOnlyBanner = canView(area) && !canEdit(area);

  if (member && firstPath === null) {
    return (
      <>
        <GlobalBackground />
        <div className="flex min-h-screen relative overflow-hidden">
          <TeamSidebar />
          <div className="flex-1 flex flex-col relative z-10 ml-64 rounded-l-3xl overflow-hidden">
            <main className="flex-1 p-6 flex items-center justify-center ml-0 md:ml-20">
              <Card className="max-w-md bg-black/30 border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                    Aucun accès à l&apos;espace collaborateur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/75">
                  <p>
                    Ton profil n&apos;a pas les droits « Voir les chantiers » ni « Voir le planning ». Un
                    administrateur peut les activer dans{' '}
                    <span className="text-white font-medium">Équipe</span> → droits du membre.
                  </p>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalBackground />
      <div className="flex min-h-screen relative overflow-hidden">
        <TeamSidebar />

        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col relative z-10 ml-64 rounded-l-3xl overflow-hidden"
          >
            <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Dashboard membre d&apos;équipe</h1>
                  <p className="text-sm text-white/70">
                    {member?.name ? `Bienvenue, ${member.name}` : 'Chargement...'}
                  </p>
                </div>
              </div>
            </header>

            <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 rounded-tl-3xl">
              <div className="flex gap-2 overflow-x-auto py-2">
                {canView('overview') && (
                  <Link href={pathForTeamArea('overview')}>
                    <Button variant="ghost" size="sm" className={tabClass('overview')}>
                      Vue d&apos;ensemble
                    </Button>
                  </Link>
                )}
                {canView('projects') && (
                  <Link href={pathForTeamArea('projects')}>
                    <Button variant="ghost" size="sm" className={tabClass('projects')}>
                      <Building className="h-4 w-4 mr-2" />
                      Mes Chantiers
                    </Button>
                  </Link>
                )}
                {canView('planning') && (
                  <Link href={pathForTeamArea('planning')}>
                    <Button variant="ghost" size="sm" className={tabClass('planning')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Planning
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto ml-0 md:ml-20">
              {showReadOnlyBanner && (
                <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
                  Accès en <strong className="font-semibold text-amber-50">lecture seule</strong> sur cette
                  section : tu peux consulter les informations mais pas les modifier depuis cet espace.
                </div>
              )}

              {area === 'overview' && canView('overview') && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {canView('projects') && (
                      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Mes Chantiers</CardTitle>
                          <Building className="h-4 w-4 text-white/70" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{myChantiers.length}</div>
                          <p className="text-xs text-white/70">Chantiers actifs</p>
                        </CardContent>
                      </Card>
                    )}

                    {canView('projects') && (
                      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">En cours</CardTitle>
                          <Clock className="h-4 w-4 text-white/70" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{chantiersEnCours.length}</div>
                          <p className="text-xs text-white/70">Chantiers en cours</p>
                        </CardContent>
                      </Card>
                    )}

                    {canView('planning') && (
                      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Planifiés</CardTitle>
                          <Calendar className="h-4 w-4 text-white/70" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{chantiersPlanifies.length}</div>
                          <p className="text-xs text-white/70">Chantiers planifiés</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {canView('projects') && (
                    <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                      <CardHeader>
                        <CardTitle>Mes chantiers récents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {myChantiers.length === 0 ? (
                          <p className="text-white/70 text-center py-4">Aucun chantier assigné</p>
                        ) : (
                          <div className="space-y-3">
                            {myChantiers.slice(0, 5).map((chantier) => (
                              <div
                                key={chantier.id}
                                className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium text-white">{chantier.nom}</p>
                                  <p className="text-sm text-white/70">Client: {chantier.clientName}</p>
                                  <p className="text-xs text-white/60">
                                    Début: {chantier.dateDebut} ({chantier.duree})
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    chantier.statut === 'planifié'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : chantier.statut === 'en cours'
                                        ? 'bg-yellow-500/20 text-yellow-300'
                                        : 'bg-green-500/20 text-green-300'
                                  }
                                >
                                  {chantier.statut}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {area === 'projects' && canView('projects') && (
                <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                  <CardHeader>
                    <CardTitle>Mes Chantiers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myChantiers.length === 0 ? (
                      <div className="text-center py-8">
                        <Building className="h-12 w-12 mx-auto mb-4 text-white/50" />
                        <p className="text-white/70">Aucun chantier assigné</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myChantiers.map((chantier) => (
                          <Card
                            key={chantier.id}
                            className="bg-black/20 backdrop-blur-lg border border-white/10 text-white"
                          >
                            <CardHeader>
                              <CardTitle className="text-lg">{chantier.nom}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-white/70">Client: {chantier.clientName}</p>
                              <p className="text-sm text-white/70">Début: {chantier.dateDebut}</p>
                              <p className="text-sm text-white/70">Durée: {chantier.duree}</p>
                              {chantier.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {chantier.images.slice(0, 2).map((img, index) => (
                                    <img
                                      key={index}
                                      src={img}
                                      alt={`Chantier ${index}`}
                                      className="w-full h-20 object-cover rounded-md"
                                    />
                                  ))}
                                </div>
                              )}
                              <Badge
                                className={
                                  chantier.statut === 'planifié'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : chantier.statut === 'en cours'
                                      ? 'bg-yellow-500/20 text-yellow-300'
                                      : 'bg-green-500/20 text-green-300'
                                }
                              >
                                {chantier.statut}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {area === 'planning' && canView('planning') && (
                <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                  <CardHeader>
                    <CardTitle>Mon planning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-center py-4">
                      Vue planning simplifiée pour les membres d&apos;équipe
                    </p>
                  </CardContent>
                </Card>
              )}
            </main>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
