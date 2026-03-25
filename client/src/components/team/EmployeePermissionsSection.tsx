import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  applyLayoutPreset,
  createFullAccessPermissions,
  createReadOnlyPermissions,
  type LayoutPreset,
  type StoredMemberPermissions,
  PERMISSION_ROWS,
  permissionsMatchFull,
  permissionsMatchReadOnly,
  type PermissionKey,
} from '@/lib/teamMemberPermissions';
import { useMemo } from 'react';

type ProfileSelect = 'full' | 'readonly' | 'custom';

function detectProfile(p: StoredMemberPermissions): ProfileSelect {
  if (permissionsMatchFull(p)) return 'full';
  if (permissionsMatchReadOnly(p)) return 'readonly';
  return 'custom';
}

export function EmployeePermissionsSection({
  value,
  onChange,
  idPrefix = 'perm',
}: {
  value: StoredMemberPermissions;
  onChange: (next: StoredMemberPermissions) => void;
  idPrefix?: string;
}) {
  const profile = useMemo(() => detectProfile(value), [value]);

  const setView = (key: PermissionKey, checked: boolean) => {
    const view = { ...value.view, [key]: checked };
    const edit = { ...value.edit };
    if (!checked) edit[key] = false;
    onChange({ ...value, view, edit });
  };

  const setEdit = (key: PermissionKey, checked: boolean) => {
    if (!value.view[key] && checked) return;
    onChange({
      ...value,
      edit: { ...value.edit, [key]: checked },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Catégorie de droits</p>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-white/90 text-sm">Profil prédéfini</Label>
            <Select
              value={profile === 'custom' ? undefined : profile}
              onValueChange={(v) => {
                if (v === 'full') onChange(createFullAccessPermissions());
                else if (v === 'readonly') onChange(createReadOnlyPermissions());
              }}
            >
              <SelectTrigger className="w-full bg-black/30 border-white/15 text-white">
                <SelectValue
                  placeholder={
                    profile === 'custom'
                      ? 'Personnalisé (grille ci-dessous)'
                      : 'Choisir un profil'
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="full">Accès complet</SelectItem>
                <SelectItem value="readonly">Lecture seule</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/55 leading-relaxed">
              {profile === 'full' &&
                'Voir et agir sur tous les modules (équivalent administrateur applicatif).'}
              {profile === 'readonly' &&
                'Consulter les données sans création ni modification, sauf réglage manuel des cases.'}
              {profile === 'custom' &&
                'Les cases ci-dessous reflètent un profil personnalisé. Choisissez un profil prédéfini pour réinitialiser.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white/90 text-sm">Ou charger une vue des Réglages (visibilité uniquement)</Label>
            <Select
              value={value.layoutPreset}
              onValueChange={(v) => onChange(applyLayoutPreset(v as LayoutPreset, value))}
            >
              <SelectTrigger className="w-full bg-black/30 border-white/15 text-white">
                <SelectValue placeholder="— Aucune —" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="none">— Aucune —</SelectItem>
                <SelectItem value="from_sidebar">Vue actuelle (barre latérale · Paramètres)</SelectItem>
                <SelectItem value="commercial">Vue type « Commercial »</SelectItem>
                <SelectItem value="chantier">Vue type « Chantier »</SelectItem>
                <SelectItem value="office">Vue type « Bureau »</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/50">
              « Vue actuelle » aligne la colonne Voir sur la barre latérale définie dans Paramètres. Les modules
              masqués y sont aussi retirés de « Créer / modifier ».
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          <div className="min-w-0">
            <div
              className={cn(
                'px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide',
                'bg-white/5 text-white/80 border-b border-white/10',
              )}
            >
              Voir
            </div>
            {PERMISSION_ROWS.map((row) => (
              <div
                key={`v-${row.key}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 last:border-b-0"
              >
                <span className="text-sm text-white/85 leading-snug pr-2">{row.viewLabel}</span>
                <Checkbox
                  id={`${idPrefix}-v-${row.key}`}
                  checked={value.view[row.key]}
                  onCheckedChange={(c) => setView(row.key, c === true)}
                  className="border-white/40 data-[state=checked]:bg-violet-500 data-[state=checked]:text-white data-[state=checked]:border-violet-500 shrink-0"
                />
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                'px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide',
                'bg-white/5 text-white/80 border-b border-white/10',
              )}
            >
              Créer / modifier
            </div>
            {PERMISSION_ROWS.map((row) => (
              <div
                key={`e-${row.key}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 last:border-b-0"
              >
                <span className="text-sm text-white/85 leading-snug pr-2">{row.editLabel}</span>
                <Checkbox
                  id={`${idPrefix}-e-${row.key}`}
                  checked={value.edit[row.key]}
                  disabled={!value.view[row.key]}
                  onCheckedChange={(c) => setEdit(row.key, c === true)}
                  className="border-white/40 data-[state=checked]:bg-violet-500 data-[state=checked]:text-white data-[state=checked]:border-violet-500 shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
