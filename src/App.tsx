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
import { AreaManager } from './components/AreaManager';
import { WorkerManager } from './components/WorkerManager';
import { ConfirmDialog } from './components/ConfirmDialog';
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
  const [areas, setAreas] = useState<string[]>(
    () => loadJSON(STORAGE_KEYS.areas, Array.from(new Set(WORKERS.map((w) => w.area))).sort()),
  );

  const [workerModal, setWorkerModal] = useState<WorkerModalState>(null);
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [areaManagerOpen, setAreaManagerOpen] = useState(false);
  const [workerManagerOpen, setWorkerManagerOpen] = useState(false);
  const [confirmDeleteWorkerId, setConfirmDeleteWorkerId] = useState<string | null>(null);
  // Permite reemplazar, fila por fila, a qué trabajador de la base se está mirando —
  // sin tocar los turnos reales de nadie. Se reinicia si cambia el filtro de Alcance,
  // porque ahí cambia de raíz qué trabajadores corresponden a cada fila.
  const [rowOverrides, setRowOverrides] = useState<Record<number, string>>({});

  useEffect(() => saveJSON(STORAGE_KEYS.workers, workers), [workers]);
  useEffect(() => saveJSON(STORAGE_KEYS.shifts, shifts), [shifts]);
  useEffect(() => saveJSON(STORAGE_KEYS.areas, areas), [areas]);

  // Si algún trabajador quedó con una sección que ya no está en la lista administrada
  // (datos antiguos, o cambios hechos fuera de esta pantalla), se reincorpora sola.
  useEffect(() => {
    const used = workers.map((w) => w.area).filter(Boolean);
    setAreas((prev) => {
      const merged = Array.from(new Set([...prev, ...used])).sort();
      const same = merged.length === prev.length && merged.every((a, i) => a === prev[i]);
      return same ? prev : merged;
    });
  }, [workers]);

  const days = useMemo(() => {
    if (view === 'mes') {
      return eachDay(startOfMonth(anchor), endOfMonth(anchor));
    }
    const from = startOfWeek(anchor);
    const len = view === 'quincena' ? 14 : 7;
    return eachDay(from, addDays(from, len - 1));
  }, [view, anchor]);

  const workerCountByArea = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of areas) counts[a] = 0;
    for (const w of workers) counts[w.area] = (counts[w.area] ?? 0) + 1;
    return counts;
  }, [areas, workers]);

  const activeWorkers = useMemo(
    () => [...workers].filter((w) => w.status === 'activo').sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')),
    [workers],
  );

  const visibleWorkers = useMemo(() => {
    if (scope === 'todos') return activeWorkers;
    return activeWorkers.filter((w) => w.area === scope);
  }, [activeWorkers, scope]);

  // El filtro de Alcance define, por defecto, quién va en cada fila; un cambio manual
  // por fila (rowOverrides) lo reemplaza sin mover los turnos de nadie.
  const displayedWorkers = useMemo(
    () => visibleWorkers.map((w, i) => {
      const overrideId = rowOverrides[i];
      if (!overrideId) return w;
      return workers.find((x) => x.id === overrideId) ?? w;
    }),
    [visibleWorkers, rowOverrides, workers],
  );

  useEffect(() => setRowOverrides({}), [scope]);

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

  const deleteWorker = (id: string) => setConfirmDeleteWorkerId(id);

  const confirmDeleteWorker = () => {
    if (!confirmDeleteWorkerId) return;
    const id = confirmDeleteWorkerId;
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setShifts((prev) => prev.filter((s) => s.workerId !== id));
    setWorkerModal(null);
    setConfirmDeleteWorkerId(null);
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

  const addArea = (name: string): string | void => {
    const clean = name.trim();
    if (!clean) return 'Escribe un nombre para la sección.';
    if (areas.some((a) => a.toLowerCase() === clean.toLowerCase())) return 'Ya existe una sección con ese nombre.';
    setAreas((prev) => [...prev, clean].sort());
  };

  // Si el nuevo nombre coincide con una sección ya existente, ambas quedan fusionadas
  // (los trabajadores de "oldName" pasan a compartir la sección de igual nombre).
  const renameArea = (oldName: string, newName: string): string | void => {
    const clean = newName.trim();
    if (!clean) return 'El nombre no puede quedar vacío.';
    if (clean === oldName) return;
    setWorkers((prev) => prev.map((w) => (w.area === oldName ? { ...w, area: clean } : w)));
    setAreas((prev) => Array.from(new Set(prev.filter((a) => a !== oldName).concat(clean))).sort());
  };

  const deleteArea = (name: string) => {
    if ((workerCountByArea[name] ?? 0) > 0) return;
    setAreas((prev) => prev.filter((a) => a !== name));
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

          <button className="ghost" onClick={() => setAreaManagerOpen(true)}>Secciones</button>
          <button className="ghost" onClick={() => setWorkerManagerOpen(true)}>Trabajadores</button>
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
          workers={displayedWorkers}
          allWorkers={activeWorkers}
          shifts={shifts}
          shiftTypes={SHIFT_TYPES}
          today={HOY}
          onCellClick={(workerId, iso) => setShiftModal({ workerId, iso })}
          onShiftClick={(shift) => setShiftModal({ workerId: shift.workerId, iso: shift.date, shift })}
          onWorkerClick={(workerId) => {
            const w = workers.find((x) => x.id === workerId);
            if (w) setWorkerModal({ mode: 'edit', worker: w });
          }}
          onDeleteWorker={deleteWorker}
          onRowWorkerChange={(rowIndex, newWorkerId) => setRowOverrides((prev) => ({ ...prev, [rowIndex]: newWorkerId }))}
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
            onDelete={workerModal.mode === 'edit'
              ? () => { const id = workerModal.worker.id; setWorkerModal(null); deleteWorker(id); }
              : undefined}
            onClose={() => setWorkerModal(null)}
          />
        </Modal>
      )}

      {workerManagerOpen && (
        <Modal title="Trabajadores" onClose={() => setWorkerManagerOpen(false)}>
          <WorkerManager
            workers={workers}
            onNew={() => { setWorkerManagerOpen(false); setWorkerModal({ mode: 'new' }); }}
            onEdit={(worker) => { setWorkerManagerOpen(false); setWorkerModal({ mode: 'edit', worker }); }}
            onDelete={(id) => { setWorkerManagerOpen(false); deleteWorker(id); }}
            onClose={() => setWorkerManagerOpen(false)}
          />
        </Modal>
      )}

      {areaManagerOpen && (
        <Modal title="Secciones" onClose={() => setAreaManagerOpen(false)}>
          <AreaManager
            areas={areas}
            workerCounts={workerCountByArea}
            onAdd={addArea}
            onRename={renameArea}
            onDelete={deleteArea}
            onClose={() => setAreaManagerOpen(false)}
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

      {confirmDeleteWorkerId && (
        <ConfirmDialog
          title="Eliminar trabajador"
          message={`¿Eliminar a ${workers.find((w) => w.id === confirmDeleteWorkerId)?.fullName ?? 'este trabajador'}? También se quitarán sus turnos asignados.`}
          onConfirm={confirmDeleteWorker}
          onCancel={() => setConfirmDeleteWorkerId(null)}
        />
      )}
    </div>
  );
}
