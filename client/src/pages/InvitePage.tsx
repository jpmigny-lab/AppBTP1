import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"

/**
 * Anciennes URLs /invite/:token — remplacées par /team-login/:ownerSlug + code 4 chiffres.
 */
export default function InvitePage() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)
  const [, setLocation] = useLocation()

  useEffect(() => {
    setMounted(true)
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const colors = ["#72b9bb", "#b5d9d9", "#ffd1bd", "#ffebe0", "#8cc5b8", "#dbf4a4"]

  if (!mounted) return null

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-background flex items-center justify-center">
      <div className="fixed inset-0 w-screen h-screen">
        <MeshGradient
          width={dimensions.width}
          height={dimensions.height}
          colors={colors}
          distortion={0.8}
          swirl={0.6}
          grainMixer={0}
          grainOverlay={0}
          speed={0.42}
          offsetX={0.08}
        />
        <div className="absolute inset-0 pointer-events-none bg-white/20 dark:bg-black/25" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 w-full">
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          <CardHeader className="text-center mb-2">
            <Info className="h-10 w-10 text-amber-300 mx-auto mb-3" />
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Lien d&apos;invitation obsolète
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-white/80 text-sm leading-relaxed">
              La connexion des membres d&apos;équipe se fait désormais avec le lien personnel du patron, du type{" "}
              <span className="font-mono text-violet-200">/team-login/votre-patron</span>, et un code à 4 chiffres.
              Demandez ce lien à votre responsable.
            </p>
            <Button
              type="button"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => setLocation("/")}
            >
              Retour à l&apos;accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
