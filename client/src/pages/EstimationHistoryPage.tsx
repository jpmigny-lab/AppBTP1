import { useEffect, useState } from "react"
import { PageWrapper } from "@/components/PageWrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { listEstimations } from "@/lib/supabase"

function euros(n: number) {
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)
}

export default function EstimationHistoryPage() {
  const [, setLocation] = useLocation()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await listEstimations()
      if (!cancelled) {
        setItems(data)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Historique des estimations</h1>
            <p className="text-sm text-white/70">Retrouve, rouvre et convertis tes estimations.</p>
          </div>
          <Button
            className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
            onClick={() => setLocation("/dashboard/estimation-ia")}
          >
            Nouvelle estimation
          </Button>
        </div>

        {loading ? (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardContent className="py-10 text-center text-white/70">Chargement…</CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardContent className="py-10 text-center text-white/70">
              Aucune estimation enregistrée.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const form = it.form_data || {}
              const res = it.result_json || {}
              return (
                <Card key={it.id} className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white font-light">
                      {form.type_travaux ?? "—"} · {form.surface ?? "—"} m² · {form.localisation ?? "—"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-white/70">
                      {new Date(it.created_at).toLocaleDateString("fr-FR")} · Statut: {it.status}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-white/90 font-medium">{euros(Number(res.total_ttc ?? NaN))} TTC</div>
                      <Button
                        variant="outline"
                        className="text-white border-white/20 hover:bg-white/10"
                        onClick={() => setLocation(`/dashboard/estimation-ia?open=${it.id}`)}
                      >
                        Ouvrir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

