import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ScheduledShift, ShiftType } from '../types';

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

  const selectMotivo = (value: string) => {
    if (value === '__add__') { setAddingMotivo(true); return; }
    if (value) setNotes(value);
  };

  const confirmNewMotivo = () => {
    const clean = newMotivo.trim();
    if (!clean) { setAddingMotivo(false); return; }
    onAddMotivo(clean);
    setNotes(clean);
    setNewMotivo('');
    setAddingMotivo(false);
  };

  const applyType = (id: string) => {
    setShiftTypeId(id);
    const t = shiftTypes.find((s) => s.id === id);
    if (t) {
      setStart(t.defaultStart);
      setEnd(t.defaultEnd);
      setBreakMinutes(t.defaultBreakMinutes);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ shiftTypeId, start, end, breakMinutes: Number(breakMinutes) || 0, notes: notes.trim() || undefined });
  };

  return (
    <form className="form" onSubmit={submit}>
      <p className="form-context">
        <strong>{workerName}</strong> · {dateLabel}
      </p>

      <label className="form-field">
        <span>Tipo de turno</span>
        <select value={shiftTypeId} onChange={(e) => applyType(e.target.value)}>
          {shiftTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.defaultStart}–{t.defaultEnd})</option>
          ))}
        </select>
      </label>

      <div className="form-row">
        <label className="form-field">
          <span>Hora inicio</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
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

      <label className="form-field">
        <span>Motivo (opcional)</span>
        <select value="" onChange={(e) => selectMotivo(e.target.value)}>
          <option value="">— Elegir un motivo rápido —</option>
          {motivos.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value="__add__">+ Agregar opción nueva…</option>
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

      <label className="form-field">
        <span>Notas (opcional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: reemplazo, turno partido, vacaciones…" />
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
