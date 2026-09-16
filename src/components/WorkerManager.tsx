import type { Worker, WorkerStatus } from '../types';

interface Props {
  workers: Worker[];
  onNew: () => void;
  onEdit: (worker: Worker) => void;
  onDelete: (workerId: string) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<WorkerStatus, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  licencia: 'Licencia',
  vacaciones: 'Vacaciones',
};

export function WorkerManager({ workers, onNew, onEdit, onDelete, onClose }: Props) {
  const sorted = [...workers].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));

  return (
    <div className="form">
      <div className="manager-header">
        <p className="form-context">
          {workers.length} trabajador{workers.length === 1 ? '' : 'es'} en total.
        </p>
        <button type="button" className="primary" onClick={onNew}>+ Nuevo trabajador</button>
      </div>

      {sorted.length === 0 && (
        <p className="form-context">Todavía no hay trabajadores. Usa "+ Nuevo trabajador" para crear el primero.</p>
      )}

      <ul className="area-list">
        {sorted.map((w) => (
          <li key={w.id} className="area-row">
            <div className="area-name-group">
              <span className="worker-row-swatch" style={{ background: w.color }} aria-hidden="true" />
              <span className="area-name">
                {w.fullName}
                <small className="area-count">
                  {w.position} · {w.area}
                  {w.status !== 'activo' && <> · {STATUS_LABEL[w.status]}</>}
                </small>
              </span>
            </div>
            <div className="area-actions">
              <button type="button" className="ghost sm" onClick={() => onEdit(w)}>Editar</button>
              <button type="button" className="danger-ghost sm" onClick={() => onDelete(w.id)}>Eliminar</button>
            </div>
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
