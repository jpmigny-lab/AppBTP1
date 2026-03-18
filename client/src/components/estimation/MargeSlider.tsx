import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

export function MargeSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-white/90">Marge souhaitée</Label>
        <div className="text-sm text-white/80">{value}%</div>
      </div>
      <Slider
        value={[value]}
        min={10}
        max={50}
        step={1}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
      />
      <div className="text-xs text-white/60">
        Ajuste la marge sans refaire d’appel IA.
      </div>
    </div>
  )
}

