import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDevisStore } from '@/store/devisStore';
import type { SectionDevis } from '@/types/devis';
import { Trash2, GripVertical } from 'lucide-react';

interface Props {
  section: SectionDevis;
}

export function SortableSectionRow({ section }: Props) {
  const updateSection = useDevisStore((s) => s.updateSection);
  const removeSection = useDevisStore((s) => s.removeSection);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg bg-muted border"
    >
      <div
        className="cursor-grab active:cursor-grabbing touch-none p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        value={section.titre}
        onChange={(e) => updateSection(section.id, e.target.value)}
        placeholder="Ex. DÉMOLITION"
        className="flex-1 font-semibold text-sm h-8 bg-background"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive shrink-0"
        onClick={() => removeSection(section.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
