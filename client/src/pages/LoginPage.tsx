import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { Settings } from "lucide-react"
import { verifyAdminCode } from "@/lib/supabase"
import { fetchOwnerSlug } from "@/lib/teamApi"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { readTeamSession } from "@/lib/teamSession"
import { motion } from "framer-motion"

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const [code, setCode] = useState("")
  const [isAdminCodeDialogOpen, setIsAdminCodeDialogOpen] = useState(false)
  const [newAdminCode, setNewAdminCode] = useState("")
  const [isSavingAdminCode, setIsSavingAdminCode] = useState(false)
  const [teamLoginUrl, setTeamLoginUrl] = useState<string | null>(null)
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (!authLoading && !user) {
      if (readTeamSession()?.sessionToken) {
        setLocation("/team-dashboard")
        return
      }
      setLocation("/auth")
    }
  }, [user, authLoading, setLocation])

  useEffect(() => {
    if (!user) return
    void fetchOwnerSlug().then((r) => {
      if (r.ok && typeof window !== "undefined") {
        setTeamLoginUrl(`${window.location.origin}/team-login/${r.ownerSlug}`)
      }
    })
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isValid = await verifyAdminCode(code.trim())
    if (isValid) {
      localStorage.setItem("userType", "admin")
      setLocation("/loading")
    } else {
      alert("Code admin invalide")
    }
  }

  const handleUpdateAdminCode = async () => {
    const trimmed = newAdminCode.trim()
    if (!trimmed) {
      alert("Veuillez entrer un code")
      return
    }
    if (trimmed.length < 3) {
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
      if (result) {
        alert("Code admin mis à jour avec succès")
        setCode(trimmed)
        setIsAdminCodeDialogOpen(false)
        setNewAdminCode("")
      } else {
        alert("Erreur lors de la mise à jour du code")
      }
    } catch (error) {
      console.error("Error updating admin code:", error)
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
                        onChange={(e) => setNewAdminCode(e.target.value)}
                        placeholder="Entrez le nouveau code"
                        className="bg-black/20 border-white/20 text-white placeholder:text-white/50 font-mono"
                        maxLength={20}
                      />
                      <p className="text-xs text-white/60">
                        Ce code sera utilisé pour se connecter en tant qu&apos;administrateur
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
            </div>
            <p className="text-white/80 text-sm text-center">
              Entrez votre code administrateur pour accéder au tableau de bord.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-xs text-white/70 leading-relaxed">
            <p className="font-medium text-white/85 mb-1">Membres d&apos;équipe</p>
            <p>
              La connexion collaborateur se fait uniquement via le lien dédié (code 4 chiffres), pas depuis cette page.
            </p>
            {teamLoginUrl && (
              <p className="mt-2 font-mono text-[11px] text-violet-200/90 break-all">{teamLoginUrl}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Entrez votre code"
                className="w-full bg-black/40 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 focus:border-violet-400 focus:ring-violet-400/20 h-12 text-center text-lg tracking-widest font-mono"
                maxLength={20}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-violet-500 hover:bg-violet-600 text-white transition-colors h-12 text-base font-medium rounded-2xl"
            >
              Se connecter
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
