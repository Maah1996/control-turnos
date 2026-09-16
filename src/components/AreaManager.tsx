import { useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
  areas: string[];
  workerCounts: Record<string, number>;
  onAdd: (name: string) => string | void; // devuelve un mensaje de error, o nada si fue bien
  onRename: (oldName: string, newName: string) => string | void;
  onDelete: (name: string) => void;
  onClose: () => void;
}

export function AreaManager({ areas, workerCounts, onAdd, onRename, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const submitNew = (e: FormEvent) => {
    e.preventDefault();
    const err = onAdd(newName);
    if (err) { setError(err); return; }
    setNewName('');
    setError('');
  };

  const startEdit = (area: string) => {
    setEditing(area);
    setEditValue(area);
    setError('');
  };

  const confirmEdit = (oldName: string) => {
    const err = onRename(oldName, editValue);
    if (err) { setError(err); return; }
    setEditing(null);
    setError('');
  };

  return (
    <div className="form">
      {error && <p className="form-error">{error}</p>}

      <form className="area-add-row" onSubmit={submitNew}>
        <label className="visually-hidden" htmlFor="area-new-name">Nombre de la nueva sección</label>
        <input
          id="area-new-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la nueva sección (ej: Cocina)"
          autoFocus
        />
        <button type="submit" className="primary">+ Agregar</button>
      </form>

      {areas.length === 0 && (
        <p className="form-context">Todavía no hay secciones creadas.</p>
      )}

      <ul className="area-list">
        {areas.map((a) => (
          <li key={a} className="area-row">
            {editing === a ? (
              <>
                <label className="visually-hidden" htmlFor={`area-edit-${a}`}>Renombrar sección {a}</label>
                <input
                  id={`area-edit-${a}`}
                  className="area-edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(a); if (e.key === 'Escape') setEditing(null); }}
                />
                <div className="area-actions">
                  <button type="button" className="ghost sm" onClick={() => setEditing(null)}>Cancelar</button>
                  <button type="button" className="primary sm" onClick={() => confirmEdit(a)}>Guardar</button>
                </div>
              </>
            ) : (
              <>
                <span className="area-name">
                  {a}
                  <small className="area-count">
                    {workerCounts[a] ?? 0} trabajador{(workerCounts[a] ?? 0) === 1 ? '' : 'es'}
                  </small>
                </span>
                <div className="area-actions">
                  <button type="button" className="ghost sm" onClick={() => startEdit(a)}>Renombrar</button>
                  <button
                    type="button"
                    className="danger-ghost sm"
                    disabled={(workerCounts[a] ?? 0) > 0}
                    title={(workerCounts[a] ?? 0) > 0 ? 'Reasigna a sus trabajadores antes de eliminarla' : undefined}
                    onClick={() => onDelete(a)}
                  >
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="form-actions">
        <div className="form-actions-right">
          <button type="button" className="ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
