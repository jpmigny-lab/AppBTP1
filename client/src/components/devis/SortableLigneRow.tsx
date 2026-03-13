import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LignePrestation } from './LignePrestation';
import type { LignePrestation as LigneType } from '@/types/devis';

interface Props {
  ligne: LigneType;
}

export function SortableLigneRow({ ligne }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ligne.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <LignePrestation ligne={ligne} dragHandleProps={listeners} />
    </div>
  );
}
