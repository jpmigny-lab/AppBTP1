import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { Users, Key, Settings } from "lucide-react"
import { fetchTeamMembers, verifyTeamMemberCode, verifyAdminCode, type TeamMember } from "@/lib/supabase"
import { DEMO_TEAM_MEMBERS } from "@/data/demoTeam"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const [code, setCode] = useState("")
  const [loginMode, setLoginMode] = useState<'admin' | 'team'>('admin')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [isAdminCodeDialogOpen, setIsAdminCodeDialogOpen] = useState(false)
  const [newAdminCode, setNewAdminCode] = useState("")
  const [isSavingAdminCode, setIsSavingAdminCode] = useState(false)
  const [, setLocation] = useLocation()

  useEffect(() => {
    // Rediriger vers /auth si l'utilisateur n'est pas connecté
    if (!authLoading && !user) {
      setLocation("/auth")
    }
  }, [user, authLoading])

  useEffect(() => {
    if (loginMode === 'team' && user) {
      loadTeamMembers()
    }
  }, [loginMode, user])

  const loadTeamMembers = async () => {
    setLoadingMembers(true)
    try {
      const members = await fetchTeamMembers()
      setTeamMembers(members.length > 0 ? members : DEMO_TEAM_MEMBERS)
    } catch (error) {
      console.error('Error loading team members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run3',hypothesisId:'H7',location:'LoginPage.tsx:handleSubmit:start',message:'Login submit start',data:{mode:loginMode,codeLength:code.trim().length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    
    if (loginMode === 'team') {
      // Vérifier le code avec Supabase
      const member = await verifyTeamMemberCode(code.trim())
      if (member) {
        // Stocker les infos du membre dans le localStorage
        localStorage.setItem('teamMember', JSON.stringify(member))
        localStorage.setItem('userType', 'team')
        setLocation("/team-dashboard")
      } else {
        alert("Code invalide ou membre inactif")
      }
    } else {
      // Mode admin - vérifier le code avec Supabase
      const isValid = await verifyAdminCode(code.trim())
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run3',hypothesisId:'H8',location:'LoginPage.tsx:handleSubmit:adminResult',message:'Admin code verification result',data:{isValid,codeLength:code.trim().length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (isValid) {
        localStorage.setItem('userType', 'admin')
        setLocation("/loading")
      } else {
        alert("Code admin invalide")
      }
    }
  }

  const handleUpdateAdminCode = async () => {
    const trimmed = newAdminCode.trim()
    // #region agent log
    fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run1',hypothesisId:'H1',location:'LoginPage.tsx:handleUpdateAdminCode:start',message:'Admin code submit start',data:{rawLength:newAdminCode.length,trimmedLength:trimmed.length,isDialogOpen:isAdminCodeDialogOpen},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!trimmed) {
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run1',hypothesisId:'H1',location:'LoginPage.tsx:handleUpdateAdminCode:empty',message:'Rejected because empty code',data:{rawValuePreview:newAdminCode.slice(0,2),trimmedLength:trimmed.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      alert("Veuillez entrer un code")
      return
    }
    if (trimmed.length < 3) {
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run1',hypothesisId:'H2',location:'LoginPage.tsx:handleUpdateAdminCode:minLength',message:'Rejected because min length',data:{trimmedLength:trimmed.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      alert("Le code doit contenir au moins 3 caractères")
      return
    }
    if (trimmed.length > 20) {
      alert("Le code ne doit pas dépasser 20 caractères")
      return
    }

    try {
      setIsSavingAdminCode(true)
      const { updateAdminCode } = await import("@/lib/supabase")
      const result = await updateAdminCode(trimmed)
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run1',hypothesisId:'H3',location:'LoginPage.tsx:handleUpdateAdminCode:result',message:'Update admin code result',data:{success:Boolean(result),trimmedLength:trimmed.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (result) {
        alert("Code admin mis à jour avec succès")
        setCode(trimmed)
        setIsAdminCodeDialogOpen(false)
        setNewAdminCode("")
      } else {
        alert("Erreur lors de la mise à jour du code")
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run1',hypothesisId:'H3',location:'LoginPage.tsx:handleUpdateAdminCode:catch',message:'Exception while updating admin code',data:{errorMessage:error instanceof Error ? error.message : 'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('Error updating admin code:', error)
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erreur lors de la mise à jour du code"
      alert(message)
    } finally {
      setIsSavingAdminCode(false)
    }
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-white"
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 relative">
              <div className="flex-1"></div>
              <h1 className="text-3xl font-light tracking-tight text-white flex-1 text-center absolute left-0 right-0">
                Connexion
              </h1>
              {loginMode === 'admin' && (
                <Dialog open={isAdminCodeDialogOpen} onOpenChange={setIsAdminCodeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10 p-2 h-8 w-8 ml-auto rounded-lg"
                      title="Gérer le code admin"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">Gérer le Code Admin</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-code" className="text-white/70">Nouveau Code Admin</Label>
                        <Input
                          id="admin-code"
                          type="text"
                          value={newAdminCode}
                          onChange={(e) => {
                            const value = e.target.value
                            // #region agent log
                            fetch('http://127.0.0.1:7424/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'run1',hypothesisId:'H4',location:'LoginPage.tsx:adminCodeInput:onChange',message:'Admin code input changed',data:{length:value.length},timestamp:Date.now()})}).catch(()=>{});
                            // #endregion
                            setNewAdminCode(value)
                          }}
                          placeholder="Entrez le nouveau code"
                          className="bg-black/20 border-white/20 text-white placeholder:text-white/50 font-mono"
                          maxLength={20}
                        />
                        <p className="text-xs text-white/60">
                          Ce code sera utilisé pour se connecter en tant qu'administrateur
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAdminCodeDialogOpen(false)} className="border-white/20 text-white hover:bg-white/10">
                        Annuler
                      </Button>
                      <Button
                        onClick={handleUpdateAdminCode}
                        className="bg-violet-500 hover:bg-violet-600 text-white"
                        disabled={isSavingAdminCode}
                      >
                        {isSavingAdminCode ? "Enregistrement..." : `${newAdminCode ? "Modifier" : "Créer"} le Code`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-white/80 text-sm text-center">
              {loginMode === 'admin' 
                ? "Entrer votre code de connection à votre application"
                : "Sélectionnez un membre d'équipe ou entrez votre code"}
            </p>
          </div>

          {/* Toggle Admin/Team */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={loginMode === 'admin' ? 'default' : 'outline'}
              onClick={() => setLoginMode('admin')}
              className={`flex-1 ${loginMode === 'admin' 
                ? 'bg-violet-500 text-white' 
                : 'bg-transparent border-white/20 text-white hover:bg-white/10'}`}
            >
              Admin
            </Button>
            <Button
              type="button"
              variant={loginMode === 'team' ? 'default' : 'outline'}
              onClick={() => setLoginMode('team')}
              className={`flex-1 ${loginMode === 'team' 
                ? 'bg-violet-500 text-white' 
                : 'bg-transparent border-white/20 text-white hover:bg-white/10'}`}
            >
              <Users className="h-4 w-4 mr-2" />
              Équipe
            </Button>
          </div>

          {loginMode === 'team' ? (
            <div className="space-y-4">
              {/* Liste des membres */}
              {loadingMembers ? (
                <div className="text-center py-8 text-white/70">Chargement...</div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <Card
                      key={member.id}
                      className="bg-black/20 backdrop-blur-sm border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => setCode(member.login_code)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-sm text-white/70">{member.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-white/70" />
                            <span className="font-mono text-sm text-white">{member.login_code}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/70">
                  Aucun membre d'équipe disponible
                </div>
              )}

              {/* Input pour code manuel */}
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ou entrez votre code"
                    className="w-full bg-black/20 border-white/20 text-white placeholder:text-white/50 focus:border-violet-400 focus:ring-violet-400/20 h-12 text-center text-lg tracking-widest font-mono"
                    maxLength={10}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-violet-500 hover:bg-violet-600 text-white transition-colors h-12 text-base font-medium rounded-2xl"
                >
                  Se connecter
                </Button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Entrez votre code"
                  className="w-full bg-black/40 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 focus:border-violet-400 focus:ring-violet-400/20 h-12 text-center text-lg tracking-widest font-mono"
                  maxLength={10}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-500 hover:bg-violet-600 text-white transition-colors h-12 text-base font-medium rounded-2xl"
              >
                Se connecter
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
