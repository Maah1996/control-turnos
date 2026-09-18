import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ScheduledShift, ShiftType } from '../types';
import { addMinutesToTime, minutesBetween } from '../lib/dates';

interface Props {
  workerName: string;
  dateLabel: string;
  shiftTypes: ShiftType[];
  motivos: string[];
  onAddMotivo: (name: string) => void;
  initial?: ScheduledShift;
  onSave: (shift: Pick<ScheduledShift, 'shiftTypeId' | 'start' | 'end' | 'breakMinutes' | 'notes'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

// Un "tipo de turno" de ausencia se guarda con este prefijo en el mismo shiftTypeId
// (en vez de crear un modelo de datos aparte) — CalendarGrid lo reconoce igual.
export const MOTIVO_PREFIX = 'motivo:';

export function ShiftForm({
  workerName, dateLabel, shiftTypes, motivos, onAddMotivo, initial, onSave, onDelete, onClose,
}: Props) {
  const [shiftTypeId, setShiftTypeId] = useState(initial?.shiftTypeId ?? shiftTypes[0]?.id ?? '');
  const [start, setStart] = useState(initial?.start ?? shiftTypes[0]?.defaultStart ?? '08:00');
  const [end, setEnd] = useState(initial?.end ?? shiftTypes[0]?.defaultEnd ?? '16:30');
  const [breakMinutes, setBreakMinutes] = useState(initial?.breakMinutes ?? shiftTypes[0]?.defaultBreakMinutes ?? 30);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [addingMotivo, setAddingMotivo] = useState(false);
  const [newMotivo, setNewMotivo] = useState('');

  const isMotivo = shiftTypeId.startsWith(MOTIVO_PREFIX);

  const applyMotivo = (name: string) => {
    setShiftTypeId(MOTIVO_PREFIX + name);
    setStart('00:00');
    setEnd('00:00');
    setBreakMinutes(0);
    setNotes(name);
  };

  const applyType = (value: string) => {
    if (value === '__add_motivo__') { setAddingMotivo(true); return; }
    if (value.startsWith(MOTIVO_PREFIX)) {
      applyMotivo(value.slice(MOTIVO_PREFIX.length));
      return;
    }
    setShiftTypeId(value);
    const t = shiftTypes.find((s) => s.id === value);
    if (t) {
      setStart(t.defaultStart);
      setEnd(t.defaultEnd);
      setBreakMinutes(t.defaultBreakMinutes);
    }
  };

  // Al cambiar la hora de inicio, la hora de término se recalcula sola manteniendo la
  // duración del tipo de turno elegido (ej. Mañana = 8h30 brutas) — el campo de término
  // sigue siendo editable a mano después, por si ese día necesita un horario distinto.
  const handleStartChange = (value: string) => {
    setStart(value);
    const t = shiftTypes.find((s) => s.id === shiftTypeId);
    if (t) {
      const durationMinutes = minutesBetween(t.defaultStart, t.defaultEnd);
      setEnd(addMinutesToTime(value, durationMinutes));
    }
  };

  const confirmNewMotivo = () => {
    const clean = newMotivo.trim();
    if (!clean) { setAddingMotivo(false); return; }
    onAddMotivo(clean);
    applyMotivo(clean);
    setNewMotivo('');
    setAddingMotivo(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      shiftTypeId, start, end, breakMinutes: Number(breakMinutes) || 0,
      // Firestore rechaza `undefined` en un campo: se omite en vez de enviarse como undefined
      // (era la causa de que "Guardar" no guardara nada cuando Notas quedaba vacío).
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <p className="form-context">
        <strong>{workerName}</strong> · {dateLabel}
      </p>

      <label className="form-field">
        <span>Tipo de turno</span>
        <select value={shiftTypeId} onChange={(e) => applyType(e.target.value)}>
          <optgroup label="Turno de trabajo">
            {shiftTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.defaultStart}–{t.defaultEnd})</option>
            ))}
          </optgroup>
          <optgroup label="Ausencia">
            {motivos.map((m) => (
              <option key={m} value={MOTIVO_PREFIX + m}>{m}</option>
            ))}
            <option value="__add_motivo__">+ Agregar motivo nuevo…</option>
          </optgroup>
        </select>
      </label>

      {addingMotivo && (
        <div className="area-add-row">
          <input
            value={newMotivo}
            onChange={(e) => setNewMotivo(e.target.value)}
            placeholder="Ej: Capacitación"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewMotivo(); } }}
          />
          <button type="button" className="primary" onClick={confirmNewMotivo}>Agregar</button>
        </div>
      )}

      {!isMotivo && (
        <div className="form-row">
          <label className="form-field">
            <span>Hora inicio</span>
            <input type="time" value={start} onChange={(e) => handleStartChange(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Hora término</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Colación (min)</span>
            <input
              type="number" min={0} max={120} step={5}
              value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <label className="form-field">
        <span>Notas (opcional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: reemplazo, turno partido…" />
      </label>

      <div className="form-actions">
        {initial && onDelete && (
          <button type="button" className="danger-ghost" onClick={onDelete}>Quitar turno</button>
        )}
        <div className="form-actions-right">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary">Guardar</button>
        </div>
      </div>
    </form>
  );
}
