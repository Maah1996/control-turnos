import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { ScheduledShift, ViewMode, Worker } from './types';
import {
  addDays, eachDay, endOfMonth, fmtLong, fmtMonthYear,
  fromISO, startOfMonth, startOfWeek, toISO,
} from './lib/dates';
import { loadJSON, saveJSON, STORAGE_KEYS } from './lib/storage';
import { CalendarGrid } from './components/CalendarGrid';
import { Modal } from './components/Modal';
import { WorkerForm } from './components/WorkerForm';
import { ShiftForm } from './components/ShiftForm';
import { EMPRESA, SHIFT_TYPES, WORKERS, buildMockShifts } from './data/mock';

const HOY = new Date();

type WorkerModalState = { mode: 'new' } | { mode: 'edit'; worker: Worker } | null;
type ShiftModalState = { workerId: string; iso: string; shift?: ScheduledShift } | null;

function newShiftId() {
  return `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function App() {
  const [view, setView] = useState<ViewMode>('semana');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [scope, setScope] = useState<string>('todos');

  const [workers, setWorkers] = useState<Worker[]>(() => loadJSON(STORAGE_KEYS.workers, WORKERS));
  const [shifts, setShifts] = useState<ScheduledShift[]>(
    () => loadJSON(STORAGE_KEYS.shifts, buildMockShifts(new Date())),
  );

  const [workerModal, setWorkerModal] = useState<WorkerModalState>(null);
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);

  useEffect(() => saveJSON(STORAGE_KEYS.workers, workers), [workers]);
  useEffect(() => saveJSON(STORAGE_KEYS.shifts, shifts), [shifts]);

  const days = useMemo(() => {
    if (view === 'mes') {
      return eachDay(startOfMonth(anchor), endOfMonth(anchor));
    }
    const from = startOfWeek(anchor);
    const len = view === 'quincena' ? 14 : 7;
    return eachDay(from, addDays(from, len - 1));
  }, [view, anchor]);

  const areas = useMemo(
    () => Array.from(new Set(workers.map((w) => w.area))).sort(),
    [workers],
  );

  const visibleWorkers = useMemo(() => {
    const active = workers.filter((w) => w.status === 'activo');
    if (scope === 'todos') return active;
    return active.filter((w) => w.area === scope);
  }, [workers, scope]);

  const step = (dir: number) => {
    if (view === 'mes') {
      setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    } else {
      setAnchor((d) => addDays(d, dir * (view === 'quincena' ? 14 : 7)));
    }
  };

  const periodLabel = view === 'mes'
    ? fmtMonthYear(anchor)
    : `${fmtLong(days[0])} — ${fmtLong(days[days.length - 1])}`;

  const saveWorker = (worker: Worker) => {
    setWorkers((prev) => (
      prev.some((w) => w.id === worker.id)
        ? prev.map((w) => (w.id === worker.id ? worker : w))
        : [...prev, worker]
    ));
    setWorkerModal(null);
  };

  const deleteWorker = (id: string) => {
    if (!window.confirm('¿Eliminar este trabajador? También se quitarán sus turnos asignados.')) return;
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setShifts((prev) => prev.filter((s) => s.workerId !== id));
    setWorkerModal(null);
  };

  const saveShift = (data: Pick<ScheduledShift, 'shiftTypeId' | 'start' | 'end' | 'breakMinutes' | 'notes'>) => {
    if (!shiftModal) return;
    const { workerId, iso, shift } = shiftModal;
    if (shift) {
      setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, ...data } : s)));
    } else {
      setShifts((prev) => [...prev, {
        id: newShiftId(), workerId, date: iso, status: 'publicado', ...data,
      }]);
    }
    setShiftModal(null);
  };

  const deleteShift = () => {
    if (!shiftModal?.shift) return;
    setShifts((prev) => prev.filter((s) => s.id !== shiftModal.shift!.id));
    setShiftModal(null);
  };

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4.5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12 13v3l2 1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1>Control de Turnos</h1>
            <p>{EMPRESA.nombre} · {EMPRESA.sucursal}</p>
          </div>
        </div>

        <div className="controls">
          <div className="segmented" role="tablist" aria-label="Vista">
            {(['semana', 'quincena', 'mes'] as ViewMode[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                className={view === v ? 'active' : ''}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <label className="field">
            <span>Alcance</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="todos">Todos los trabajadores</option>
              {areas.map((a) => (
                <option key={a} value={a}>Área: {a}</option>
              ))}
            </select>
          </label>

          <div className="nav">
            <button onClick={() => step(-1)} aria-label="Anterior">‹</button>
            <button onClick={() => setAnchor(new Date())}>Hoy</button>
            <button onClick={() => step(1)} aria-label="Siguiente">›</button>
          </div>

          <button className="primary" onClick={() => setWorkerModal({ mode: 'new' })}>+ Trabajador</button>
          <button className="ghost" onClick={() => window.print()}>Imprimir</button>
        </div>
      </header>

      <section className="sheet">
        <div className="sheet-head">
          <div>
            <h2>Calendario de Turnos</h2>
            <p className="period">{periodLabel}</p>
          </div>
          <div className="legend no-print">
            {SHIFT_TYPES.map((t) => (
              <span key={t.id} className="legend-item">
                <span className="dot" style={{ background: t.color }} />
                {t.name} <small>({t.defaultStart}–{t.defaultEnd})</small>
              </span>
            ))}
          </div>
        </div>

        <CalendarGrid
          days={days}
          workers={visibleWorkers}
          shifts={shifts}
          shiftTypes={SHIFT_TYPES}
          today={HOY}
          onCellClick={(workerId, iso) => setShiftModal({ workerId, iso })}
          onShiftClick={(shift) => setShiftModal({ workerId: shift.workerId, iso: shift.date, shift })}
          onWorkerClick={(workerId) => {
            const w = workers.find((x) => x.id === workerId);
            if (w) setWorkerModal({ mode: 'edit', worker: w });
          }}
        />

        <footer className="sheet-foot">
          <span>Emitido: {toISO(HOY)}</span>
          <span>Guardado en este navegador — sin backend todavía</span>
        </footer>
      </section>

      {workerModal && (
        <Modal
          title={workerModal.mode === 'edit' ? 'Editar trabajador' : 'Nuevo trabajador'}
          onClose={() => setWorkerModal(null)}
        >
          <WorkerForm
            initial={workerModal.mode === 'edit' ? workerModal.worker : undefined}
            areas={areas}
            onSave={saveWorker}
            onDelete={workerModal.mode === 'edit' ? () => deleteWorker(workerModal.worker.id) : undefined}
            onClose={() => setWorkerModal(null)}
          />
        </Modal>
      )}

      {shiftModal && (
        <Modal
          title={shiftModal.shift ? 'Editar turno' : 'Nuevo turno'}
          onClose={() => setShiftModal(null)}
        >
          <ShiftForm
            workerName={workers.find((w) => w.id === shiftModal.workerId)?.fullName ?? ''}
            dateLabel={fmtLong(fromISO(shiftModal.iso))}
            shiftTypes={SHIFT_TYPES}
            initial={shiftModal.shift}
            onSave={saveShift}
            onDelete={shiftModal.shift ? deleteShift : undefined}
            onClose={() => setShiftModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
