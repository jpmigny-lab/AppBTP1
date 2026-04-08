import { useEffect, useMemo, useState } from "react"
import { PageWrapper } from "@/components/PageWrapper"
import { StepForm } from "@/components/estimation/StepForm"
import { EstimationResultView } from "@/components/estimation/EstimationResult"
import { EstimationResultSchema, type EstimationFormValues, type EstimationResult } from "@/types/estimationIA"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { createEstimation, convertEstimationToChantier, getEstimationById } from "@/lib/supabase"

const LOADING_MESSAGES = [
  "Analyse du type de chantier...",
  "Calcul des coûts main d'œuvre...",
  "Estimation des matériaux aux prix du marché...",
  "Vérification des contraintes techniques...",
  "Génération de l'estimation finale...",
]

export default function EstimationIAPage() {
  const [, setLocation] = useLocation()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [msgIndex, setMsgIndex] = useState(0)
  const [lastForm, setLastForm] = useState<EstimationFormValues | null>(null)
  const [result, setResult] = useState<EstimationResult | null>(null)
  const [estimationId, setEstimationId] = useState<string | null>(null)
  const budgetClient = lastForm?.budget_client ? Number(lastForm.budget_client) : undefined

  const loadingMessage = useMemo(() => LOADING_MESSAGES[msgIndex] ?? LOADING_MESSAGES[0], [msgIndex])

  const runEstimate = async (values: EstimationFormValues) => {
    setLastForm(values)
    setResult(null)
    setEstimationId(null)
    setLoading(true)
    setProgress(10)
    setMsgIndex(0)

    // Progress animation (no timers as “fix”; this is UI state)
    let tick = 0
    const interval = window.setInterval(() => {
      tick += 1
      setProgress((p) => Math.min(95, p + 8))
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
      if (tick > 20) window.clearInterval(interval)
    }, 700)

    try {
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H8',location:'EstimationIAPage.tsx:runEstimate',message:'Calling /api/estimation',data:{hasBudget:!!values.budget_client,metiersCount:values.corps_metier?.length||0,contraintesCount:values.contraintes?.length||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const resp = await fetch("/api/estimation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          tva: Number(values.tva), // send as number for prompt
        }),
      })
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'post-fix',hypothesisId:'H10',location:'EstimationIAPage.tsx:after-fetch',message:'Response received from /api/estimation',data:{ok:resp.ok,status:resp.status,statusText:resp.statusText},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const json = await resp.json().catch(() => null)
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'post-fix',hypothesisId:'H10',location:'EstimationIAPage.tsx:after-json',message:'Parsed estimation response body',data:{hasJson:Boolean(json),error:json?.error ?? null,message:json?.message ?? null,keys:json&&typeof json==='object'?Object.keys(json):[]},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!resp.ok) throw new Error(json?.message || "Erreur estimation IA")

      const parsed = EstimationResultSchema.safeParse(json)
      if (!parsed.success) {
        throw new Error("Réponse IA invalide (schéma)")
      }

      setResult(parsed.data)
      setProgress(100)

      // save to supabase
      const saved = await createEstimation({
        form_data: values,
        result_json: parsed.data,
        status: "brouillon",
      })

      setEstimationId(saved?.id ?? null)

      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H9',location:'EstimationIAPage.tsx:saved',message:'Estimation saved',data:{saved:!!saved,hasId:!!saved?.id},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } finally {
      window.clearInterval(interval)
      setLoading(false)
    }
  }

  // Open existing estimation from history: /dashboard/estimation-ia?open=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open")
    if (!id) return
    ;(async () => {
      const row = await getEstimationById(id)
      if (row?.form_data) setLastForm(row.form_data)
      if (row?.result_json) setResult(row.result_json)
      if (row?.id) setEstimationId(row.id)
    })()
  }, [])

  const handleRecalc = () => {
    setResult(null)
    setEstimationId(null)
  }

  const handleConvert = async () => {
    if (!estimationId) return
    await convertEstimationToChantier(estimationId)
    setLocation("/dashboard/projects")
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Estimation IA</h1>
            <p className="text-sm text-white/70">Chiffrage intelligent et sauvegarde automatique.</p>
          </div>
          <Button
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10"
            onClick={() => setLocation("/dashboard/estimation/historique")}
          >
            Historique
          </Button>
        </div>

        {loading && (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-white font-light">Estimation en cours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-white/80">{loadingMessage}</div>
              <Progress value={progress} />
            </CardContent>
          </Card>
        )}

        {!result ? (
          <StepForm
            onSubmit={runEstimate}
            disabled={loading}
            defaultValues={lastForm ?? undefined}
          />
        ) : (
          <EstimationResultView
            result={result}
            budgetClient={budgetClient}
            onRecalculer={handleRecalc}
            onConvertir={handleConvert}
          />
        )}
      </div>
    </PageWrapper>
  )
}

