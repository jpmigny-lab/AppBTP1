import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, FileDown, RefreshCw, Wrench } from "lucide-react"
import { MargeSlider } from "./MargeSlider"
import type { EstimationResult } from "@/types/estimationIA"

function euros(n: number) {
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)
}

const CAT_LABEL: Record<string, string> = {
  main_oeuvre: "Main d'œuvre",
  materiaux: "Matériaux",
  sous_traitance: "Sous-traitance",
  frais_chantier: "Frais de chantier",
}

const CAT_BADGE: Record<string, string> = {
  main_oeuvre: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  materiaux: "bg-green-500/20 text-green-200 border-green-500/30",
  sous_traitance: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  frais_chantier: "bg-purple-500/20 text-purple-200 border-purple-500/30",
}

export function EstimationResultView({
  result,
  budgetClient,
  onRecalculer,
  onConvertir,
}: {
  result: EstimationResult
  budgetClient?: number
  onRecalculer: () => void
  onConvertir: () => Promise<void>
}) {
  const [margePct, setMargePct] = useState<number>(result.marge_pourcentage ?? 25)

  const computed = useMemo(() => {
    const sousTotal = result.sous_total_ht
    const aleas = result.aleas_montant
    // recompute marge montant based on current pct
    const base = sousTotal + aleas
    const margeMontant = base * (margePct / 100)
    const totalHT = base + margeMontant
    const tvaMontant = result.total_ht > 0 ? (totalHT * (result.tva_montant / result.total_ht)) : result.tva_montant
    const totalTTC = totalHT + tvaMontant
    return { sousTotal, aleas, margeMontant, totalHT, tvaMontant, totalTTC }
  }, [result, margePct])

  const postesByCat = useMemo(() => {
    const map = new Map<string, EstimationResult["postes"]>()
    for (const p of result.postes) {
      const arr = map.get(p.categorie) ?? []
      arr.push(p)
      map.set(p.categorie, arr)
    }
    return map
  }, [result.postes])

  const budgetExceeded = budgetClient && computed.totalTTC > budgetClient

  return (
    <div className="space-y-6">
      {budgetExceeded && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="min-w-0">
            <div className="font-medium">Attention : budget dépassé</div>
            <div className="text-sm opacity-90">
              Le total TTC ({euros(computed.totalTTC)}) dépasse le budget indicatif ({euros(budgetClient)}).
            </div>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Total HT</CardTitle></CardHeader>
          <CardContent className="text-2xl font-light">{euros(computed.totalHT)}</CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Total TTC</CardTitle></CardHeader>
          <CardContent className="text-2xl font-light">{euros(computed.totalTTC)}</CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Prix au m² HT</CardTitle></CardHeader>
          <CardContent className="text-2xl font-light">{euros(result.prix_au_m2_ht)}</CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Marge</CardTitle></CardHeader>
          <CardContent className="text-2xl font-light">
            {margePct}% · {euros(computed.margeMontant)}
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Durée estimée</CardTitle></CardHeader>
          <CardContent className="text-2xl font-light">{result.duree_estimee_jours} jours</CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Équipe recommandée</CardTitle></CardHeader>
          <CardContent className="text-2xl font-light">{result.nb_ouvriers_recommande} ouvriers</CardContent>
        </Card>
      </div>

      {/* Marge slider */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle className="text-white font-light">Simulateur de marge</CardTitle>
        </CardHeader>
        <CardContent>
          <MargeSlider value={margePct} onChange={setMargePct} />
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle className="text-white font-light">Détail des postes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white/70">Catégorie</TableHead>
                  <TableHead className="text-white/70">Désignation</TableHead>
                  <TableHead className="text-white/70 text-right">Qté</TableHead>
                  <TableHead className="text-white/70">Unité</TableHead>
                  <TableHead className="text-white/70 text-right">P.U. HT</TableHead>
                  <TableHead className="text-white/70 text-right">Total HT</TableHead>
                  <TableHead className="text-white/70">Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(postesByCat.entries()).map(([cat, postes]) => {
                  const sub = postes.reduce((s, p) => s + (p.total_ht || 0), 0)
                  return (
                    <>
                      {postes.map((p, idx) => (
                        <TableRow key={`${cat}-${idx}`}>
                          <TableCell>
                            <Badge variant="outline" className={CAT_BADGE[cat] ?? "border-white/10 text-white/80"}>
                              {CAT_LABEL[cat] ?? cat}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{p.nom}</TableCell>
                          <TableCell className="text-right text-white/90">{p.quantite}</TableCell>
                          <TableCell className="text-white/90">{p.unite}</TableCell>
                          <TableCell className="text-right text-white/90">{euros(p.prix_unitaire_ht)}</TableCell>
                          <TableCell className="text-right text-white">{euros(p.total_ht)}</TableCell>
                          <TableCell className="text-white/70">{p.detail}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right text-white/70">Sous-total {CAT_LABEL[cat] ?? cat}</TableCell>
                        <TableCell className="text-right text-white font-medium">{euros(sub)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )
                })}

                <TableRow>
                  <TableCell colSpan={5} className="text-right text-white/70">Sous-total HT</TableCell>
                  <TableCell className="text-right text-white font-medium">{euros(computed.sousTotal)}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-white/70">Aléas</TableCell>
                  <TableCell className="text-right text-white font-medium">{euros(computed.aleas)}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-white/70">Marge</TableCell>
                  <TableCell className="text-right text-white font-medium">{euros(computed.margeMontant)}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-white/70">Total HT</TableCell>
                  <TableCell className="text-right text-white font-semibold">{euros(computed.totalHT)}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-white/70">TVA</TableCell>
                  <TableCell className="text-right text-white font-medium">{euros(computed.tvaMontant)}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-white/70">Total TTC</TableCell>
                  <TableCell className="text-right text-white font-semibold">{euros(computed.totalTTC)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Risques & recos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader><CardTitle className="text-white font-light">Risques</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {result.risques.map((r, i) => (
              <div key={i} className="text-sm text-white/90 flex gap-2">
                <span className="text-red-300">•</span>
                <span>{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader><CardTitle className="text-white font-light">Postes potentiellement oubliés</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {result.postes_oublies_potentiels.map((r, i) => (
              <div key={i} className="text-sm text-white/90 flex gap-2">
                <span className="text-amber-300">•</span>
                <span>{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader><CardTitle className="text-white font-light">Recommandations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {result.recommandations.map((r, i) => (
              <div key={i} className="text-sm text-white/90 flex gap-2">
                <span className="text-green-300">•</span>
                <span>{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader><CardTitle className="text-white font-light">Benchmark</CardTitle></CardHeader>
        <CardContent className="text-sm text-white/80">{result.benchmark}</CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10"
          onClick={() => window.print()}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Exporter en PDF
        </Button>
        <Button
          type="button"
          className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
          onClick={onConvertir}
        >
          <Wrench className="h-4 w-4 mr-2" />
          Convertir en Chantier
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10"
          onClick={onRecalculer}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalculer
        </Button>
      </div>
    </div>
  )
}

