import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EstimationFormSchema, type EstimationFormValues } from "@/types/estimationIA"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

const TYPE_TRAVAUX = ["Neuf", "Rénovation", "Extension", "Second œuvre", "Aménagement intérieur"] as const
const CORPS_METIER = [
  "Maçonnerie",
  "Électricité",
  "Plomberie",
  "Menuiserie",
  "Carrelage",
  "Peinture",
  "Isolation",
  "Charpente",
  "Couverture",
  "Autre",
] as const
const FINITION = ["Standard", "Moyen de gamme", "Haut de gamme"] as const
const ACCESS = ["Facile (plain-pied)", "Moyenne (étage sans ascenseur)", "Difficile (zone urbaine dense, sous-sol)"] as const
const ETAT = ["Neuf / vide", "Rénovation légère", "Rénovation lourde (démolition incluse)"] as const
const CONTRAINTES = ["Amiante détecté", "Permis de construire requis", "Zone protégée/ABF", "ERP (établissement public)", "Aucune"] as const
const DELAI = ["Urgent (< 1 mois)", "Normal (1–3 mois)", "Flexible (> 3 mois)"] as const

function Stepper({ step }: { step: number }) {
  const items = [1, 2, 3, 4]
  return (
    <div className="flex items-center gap-2">
      {items.map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={[
              "h-8 w-8 rounded-full flex items-center justify-center text-sm border",
              n === step ? "bg-white/20 border-white/20 text-white" : n < step ? "bg-violet-500/30 border-violet-500/40 text-white" : "bg-black/10 border-white/10 text-white/60",
            ].join(" ")}
          >
            {n}
          </div>
          {n !== 4 && <div className="h-px w-8 bg-white/10" />}
        </div>
      ))}
      <div className="ml-2 text-sm text-white/70">Étape {step}/4</div>
    </div>
  )
}

export function StepForm({
  defaultValues,
  onSubmit,
  disabled,
}: {
  defaultValues?: Partial<EstimationFormValues>
  onSubmit: (values: EstimationFormValues) => void
  disabled?: boolean
}) {
  const [step, setStep] = useState(1)

  const form = useForm<EstimationFormValues>({
    resolver: zodResolver(EstimationFormSchema),
    mode: "onChange",
    defaultValues: {
      type_travaux: "Rénovation",
      corps_metier: [],
      surface: 50,
      localisation: "",
      finition: "Standard",
      accessibilite: "Facile (plain-pied)",
      etat_existant: "Rénovation légère",
      contraintes: ["Aucune"],
      delai: "Normal (1–3 mois)",
      marge: 25,
      aleas: 7,
      tva: "10",
      budget_client: undefined,
      description: "",
      date_demarrage: new Date().toISOString().slice(0, 10),
      nb_ouvriers: undefined,
      ...defaultValues,
    },
  })

  const values = form.watch()
  const stepValid = useMemo(() => {
    const v = values
    if (step === 1) return !!v.type_travaux && (v.corps_metier?.length ?? 0) > 0 && !!v.surface && !!v.localisation && !!v.finition
    if (step === 2) return !!v.accessibilite && !!v.etat_existant && (v.contraintes?.length ?? 0) > 0 && !!v.delai
    if (step === 3) return v.marge >= 10 && v.marge <= 50 && v.aleas >= 0 && v.aleas <= 15 && !!v.tva
    if (step === 4) return !!v.description && !!v.date_demarrage
    return false
  }, [values, step])

  const toggleArrayValue = (field: keyof EstimationFormValues, item: string) => {
    const current = (form.getValues(field) as any[]) ?? []
    const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
    form.setValue(field as any, next as any, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <form
      onSubmit={form.handleSubmit((vals) => onSubmit(vals))}
      className="space-y-4"
    >
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="space-y-3">
          <CardTitle className="text-white font-light">Estimation IA de chantier</CardTitle>
          <Stepper step={step} />
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/90">Type de travaux</Label>
                <Select value={values.type_travaux} onValueChange={(v) => form.setValue("type_travaux", v as any, { shouldValidate: true })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white">
                    {TYPE_TRAVAUX.map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">Surface totale (m²)</Label>
                <Input
                  type="number"
                  value={values.surface}
                  onChange={(e) => form.setValue("surface", Number(e.target.value || 0) as any, { shouldValidate: true })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-white/90">Corps de métier</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {CORPS_METIER.map((m) => {
                    const checked = (values.corps_metier ?? []).includes(m)
                    return (
                      <label key={m} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => toggleArrayValue("corps_metier", m)} />
                        <span className="text-sm text-white/90">{m}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">Localisation</Label>
                <Input
                  value={values.localisation}
                  onChange={(e) => form.setValue("localisation", e.target.value, { shouldValidate: true })}
                  placeholder="Ville ou code postal"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">Niveau de finition</Label>
                <RadioGroup
                  value={values.finition}
                  onValueChange={(v) => form.setValue("finition", v as any, { shouldValidate: true })}
                  className="grid grid-cols-1 gap-2"
                >
                  {FINITION.map((f) => (
                    <label key={f} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 cursor-pointer">
                      <RadioGroupItem value={f} />
                      <span className="text-sm text-white/90">{f}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/90">Accessibilité</Label>
                <Select value={values.accessibilite} onValueChange={(v) => form.setValue("accessibilite", v as any, { shouldValidate: true })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white">
                    {ACCESS.map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">État existant</Label>
                <Select value={values.etat_existant} onValueChange={(v) => form.setValue("etat_existant", v as any, { shouldValidate: true })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white">
                    {ETAT.map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-white/90">Contraintes particulières</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONTRAINTES.map((c) => {
                    const checked = (values.contraintes ?? []).includes(c)
                    return (
                      <label key={c} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => {
                          // si "Aucune" est cochée, on remplace tout; sinon on enlève "Aucune"
                          if (c === "Aucune") form.setValue("contraintes", ["Aucune"], { shouldValidate: true })
                          else {
                            const base = (values.contraintes ?? []).filter((x) => x !== "Aucune")
                            const next = base.includes(c) ? base.filter((x) => x !== c) : [...base, c]
                            form.setValue("contraintes", next.length ? next : ["Aucune"], { shouldValidate: true })
                          }
                        }} />
                        <span className="text-sm text-white/90">{c}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">Délai souhaité</Label>
                <Select value={values.delai} onValueChange={(v) => form.setValue("delai", v as any, { shouldValidate: true })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white">
                    {DELAI.map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white/90">Marge souhaitée</Label>
                  <div className="text-sm text-white/80">{values.marge}%</div>
                </div>
                <Slider value={[values.marge]} min={10} max={50} step={1} onValueChange={(v) => form.setValue("marge", v[0] ?? values.marge, { shouldValidate: true })} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white/90">Provision aléas</Label>
                  <div className="text-sm text-white/80">{values.aleas}%</div>
                </div>
                <Slider value={[values.aleas]} min={0} max={15} step={1} onValueChange={(v) => form.setValue("aleas", v[0] ?? values.aleas, { shouldValidate: true })} />
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">TVA applicable</Label>
                <RadioGroup value={values.tva} onValueChange={(v) => form.setValue("tva", v as any, { shouldValidate: true })} className="grid gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 cursor-pointer">
                    <RadioGroupItem value="5.5" />
                    <span className="text-sm text-white/90">5,5% (rénovation résidentielle)</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 cursor-pointer">
                    <RadioGroupItem value="10" />
                    <span className="text-sm text-white/90">10% (logement)</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 cursor-pointer">
                    <RadioGroupItem value="20" />
                    <span className="text-sm text-white/90">20% (standard / commercial)</span>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-white/90">Budget client indicatif (optionnel)</Label>
                <Input
                  type="number"
                  value={(values.budget_client as any) ?? ""}
                  onChange={(e) => form.setValue("budget_client", (e.target.value === "" ? "" : Number(e.target.value)) as any, { shouldValidate: true })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="€"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-white/90">Description libre du chantier</Label>
                <Textarea
                  value={values.description}
                  onChange={(e) => form.setValue("description", e.target.value, { shouldValidate: true })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[140px]"
                  placeholder="Contexte, contraintes, attentes client, état existant…"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/90">Date de démarrage souhaitée</Label>
                <Input
                  type="date"
                  value={values.date_demarrage}
                  onChange={(e) => form.setValue("date_demarrage", e.target.value, { shouldValidate: true })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/90">Nombre d'ouvriers disponibles (optionnel)</Label>
                <Input
                  type="number"
                  value={(values.nb_ouvriers as any) ?? ""}
                  onChange={(e) => form.setValue("nb_ouvriers", (e.target.value === "" ? "" : Number(e.target.value)) as any, { shouldValidate: true })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || disabled}
            >
              Précédent
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                className="bg-white/20 hover:bg-white/30 text-white border border-white/20 disabled:opacity-50"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={!stepValid || disabled}
              >
                Suivant
              </Button>
            ) : (
              <Button
                type="submit"
                className="bg-violet-500 hover:bg-violet-600 text-white border-0 disabled:opacity-50"
                disabled={!stepValid || disabled}
              >
                Lancer l’estimation IA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

