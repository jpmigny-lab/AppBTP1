import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { SidebarNavItem } from '@/lib/sidebarNav';
import { GripVertical } from 'lucide-react';

export function SortableSidebarNavRow({
  item,
  locked,
  checked,
  onCheckedChange,
}: {
  item: SidebarNavItem;
  locked: boolean;
  checked: boolean;
  onCheckedChange: (visible: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.path,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-2 py-2',
        isDragging && 'opacity-60 shadow-lg z-10 border-violet-500/30',
      )}
    >
      <button
        type="button"
        className="touch-none rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white/80 cursor-grab active:cursor-grabbing shrink-0"
        aria-label={`Déplacer ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <label
        className={cn(
          'flex flex-1 min-w-0 items-center gap-3 cursor-pointer py-0.5',
          locked && 'opacity-90 cursor-default',
        )}
      >
        <Checkbox
          checked={checked}
          disabled={locked}
          onCheckedChange={(v) => {
            if (locked) return;
            onCheckedChange(v === true);
          }}
          className="border-white/40 data-[state=checked]:bg-violet-500 data-[state=checked]:text-white data-[state=checked]:border-violet-500"
        />
        <item.icon className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
        <span className="text-sm font-medium text-white truncate">{item.label}</span>
        {locked ? <span className="ml-auto text-xs text-white/50 shrink-0">toujours</span> : null}
      </label>
    </div>
  );
}
