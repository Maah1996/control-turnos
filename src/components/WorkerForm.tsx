import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ContractType, Worker, WorkerStatus } from '../types';

interface Props {
  initial?: Worker;
  areas: string[];
  onSave: (worker: Worker) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const CONTRACTS: { value: ContractType; label: string }[] = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'plazo_fijo', label: 'Plazo fijo' },
  { value: 'por_obra', label: 'Por obra' },
  { value: 'honorarios', label: 'Honorarios' },
  { value: 'part_time', label: 'Part-time' },
];

const STATUSES: { value: WorkerStatus; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'vacaciones', label: 'Vacaciones' },
];

const PALETTE = ['#2563eb', '#059669', '#9b51e0', '#f2994a', '#eb5757', '#0891b2', '#d946ef', '#65a30d'];

function newId() {
  return `w-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function WorkerForm({ initial, areas, onSave, onDelete, onClose }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [rut, setRut] = useState(initial?.rut ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [area, setArea] = useState(initial?.area ?? areas[0] ?? '');
  const [contractType, setContractType] = useState<ContractType>(initial?.contractType ?? 'indefinido');
  const [weeklyHours, setWeeklyHours] = useState(initial?.weeklyHours ?? 42);
  const [status, setStatus] = useState<WorkerStatus>(initial?.status ?? 'activo');
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);
  const [code, setCode] = useState(initial?.code ?? '');
  const [error, setError] = useState('');

  const randomCode = () => String(Math.floor(1000 + Math.random() * 9000));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !area.trim() || !position.trim()) {
      setError('Nombre, cargo y sección son obligatorios.');
      return;
    }
    onSave({
      id: initial?.id ?? newId(),
      fullName: fullName.trim(),
      rut: rut.trim(),
      position: position.trim(),
      area: area.trim(),
      contractType,
      weeklyHours: Number(weeklyHours) || 0,
      hireDate: initial?.hireDate ?? new Date().toISOString().slice(0, 10),
      status,
      color,
      // Firestore rechaza `undefined` en un campo: solo se incluye si hay código.
      ...(code.trim() ? { code: code.trim() } : {}),
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      {error && <p className="form-error">{error}</p>}

      <label className="form-field">
        <span>Nombre completo *</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: Ana Soto Pérez" autoFocus />
      </label>

      <div className="form-row">
        <label className="form-field">
          <span>Cargo *</span>
          <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej: Operario" />
        </label>
        <label className="form-field">
          <span>Sección / Área *</span>
          {areas.length > 0 ? (
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          ) : (
            <input value="Crea una sección primero" disabled />
          )}
        </label>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>RUT</span>
          <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" />
        </label>
        <label className="form-field">
          <span>Horas semanales</span>
          <input
            type="number" min={1} max={60} value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>Tipo de contrato</span>
          <select value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)}>
            {CONTRACTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as WorkerStatus)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>Código de acceso al portal</span>
          <input
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Ej: 4821" inputMode="numeric"
          />
        </label>
        <div className="form-field">
          <span>&nbsp;</span>
          <button type="button" className="ghost sm" onClick={() => setCode(randomCode())}>
            Generar código
          </button>
        </div>
      </div>

      {code && (
        <p className="form-context">
          Este trabajador entra a su portal con el código <strong>{code}</strong> — díctaselo o anótalo, no necesita correo ni contraseña.
        </p>
      )}

      <div className="form-field">
        <span>Color en la planilla</span>
        <div className="swatch-picker">
          {PALETTE.map((c) => (
            <button
              type="button" key={c}
              className={'swatch-option' + (color === c ? ' selected' : '')}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="form-actions">
        {initial && onDelete && (
          <button type="button" className="danger-ghost" onClick={onDelete}>Eliminar trabajador</button>
        )}
        <div className="form-actions-right">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary">Guardar</button>
        </div>
      </div>
    </form>
  );
}
