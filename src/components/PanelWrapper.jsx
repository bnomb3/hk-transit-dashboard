import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function PanelWrapper({ id, editMode, onDelete, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className="col"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
      }}
    >
      {editMode && (
        <>
          <button
            className="btn btn-sm btn-danger"
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, lineHeight: 1, padding: '2px 6px' }}
            onClick={() => onDelete(id)}
          >
            ×
          </button>
          <div
            style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, cursor: 'grab', fontSize: '1.2rem', color: '#888', lineHeight: 1 }}
            {...attributes}
            {...listeners}
          >
            ⠿
          </div>
        </>
      )}
      {children}
    </div>
  );
}
