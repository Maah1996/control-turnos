import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { ScheduledShift, SolicitudCambio, ViewMode, Worker } from './types';
import {
  addDays, eachDay, endOfMonth, fmtLong, fmtMonthYear,
  fromISO, isSameDay, startOfMonth, startOfWeek, toISO,
} from './lib/dates';
import { useFirestoreCollection, useFirestoreDoc } from './lib/firestoreSync';
import { CalendarGrid } from './components/CalendarGrid';
import { Modal } from './components/Modal';
import { WorkerForm } from './components/WorkerForm';
import { ShiftForm } from './components/ShiftForm';
import { AreaManager } from './components/AreaManager';
import { WorkerManager } from './components/WorkerManager';
import { ConfirmDialog } from './components/ConfirmDialog';
import { RequestInbox } from './components/RequestInbox';
import { MonthlyReport } from './components/MonthlyReport';
import { SectionFilter } from './components/SectionFilter';
import { EMPRESA, SHIFT_TYPES, WORKERS, buildMockShifts } from './data/mock';

type WorkerModalState = { mode: 'new' } | { mode: 'edit'; worker: Worker } | null;
type ShiftModalState = { workerId: string; iso: string; shift?: ScheduledShift } | null;

interface ConfigDoc {
  areas: string[];
  motivos: string[];
}

const DEFAULT_MOTIVOS = ['Vacaciones', 'Permiso', 'Licencia médica', 'Falta al trabajo', 'Día libre'];

function newShiftId() {
  return `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function AdminApp({ onSalir }: { onSalir: () => void }) {
  const [view, setView] = useState<ViewMode>('semana');
  const [anchor, setAnchor] = useState<Date>(new Date());
  // Vacío = "Completo" (todas las secciones); si no, solo las áreas elegidas.
  const [scope, setScope] = useState<string[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);

  // "Hoy" en estado, no en una constante fija: si la app queda abierta pasada
  // la medianoche, el día resaltado en el calendario se actualiza solo.
  const [hoy, setHoy] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setHoy((prev) => (isSameDay(prev, new Date()) ? prev : new Date()));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Persistencia compartida en Firestore — admin y trabajadores ven los mismos
  // datos en tiempo real, en vez del localStorage por dispositivo de antes.
  const workersSync = useFirestoreCollection<Worker>('workers', WORKERS);
  const shiftsSync = useFirestoreCollection<ScheduledShift>('shifts', buildMockShifts(new Date()));
  const configSync = useFirestoreDoc<ConfigDoc>('config/app', {
    areas: Array.from(new Set(WORKERS.map((w) => w.area))).sort(),
    motivos: DEFAULT_MOTIVOS,
  });
  const solicitudesSync = useFirestoreCollection<SolicitudCambio>('solicitudes', []);

  const workers = workersSync.items;
  const shifts = shiftsSync.items;
  const areas = configSync.data.areas;
  const motivos = configSync.data.motivos;
  const solicitudes = solicitudesSync.items;
  const pendientesCount = solicitudes.filter((s) => s.estado === 'pendiente').length;

  const [workerModal, setWorkerModal] = useState<WorkerModalState>(null);
  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [areaManagerOpen, setAreaManagerOpen] = useState(false);
  const [workerManagerOpen, setWorkerManagerOpen] = useState(false);
  const [confirmDeleteWorkerId, setConfirmDeleteWorkerId] = useState<string | null>(null);
  // Distinto del anterior: esto NO borra al trabajador, solo lo marca "inactivo" para que
  // deje de aparecer en el calendario. Sigue completo en "Trabajadores" y se puede reactivar.
  const [confirmRemoveWorkerId, setConfirmRemoveWorkerId] = useState<string | null>(null);
  // Permite reemplazar, fila por fila, a qué trabajador de la base se está mirando —
  // sin tocar los turnos reales de nadie. Se reinicia si cambia el filtro de Alcance,
  // porque ahí cambia de raíz qué trabajadores corresponden a cada fila.
  const [rowOverrides, setRowOverrides] = useState<Record<number, string>>({});
  // Filas agregadas a mano con "+ Agregar fila" — cada elemento es el id del trabajador
  // elegido en esa fila extra. Se reinicia junto con rowOverrides al cambiar el Alcance.
  const [extraRows, setExtraRows] = useState<string[]>([]);

  // Si algún trabajador quedó con una sección que ya no está en la lista administrada
  // (datos antiguos, o cambios hechos fuera de esta pantalla), se reincorpora sola.
  useEffect(() => {
    if (!workersSync.ready || !configSync.ready) return;
    const used = workers.map((w) => w.area).filter(Boolean);
    const merged = Array.from(new Set([...areas, ...used])).sort();
    const same = merged.length === areas.length && merged.every((a, i) => a === areas[i]);
    if (!same) configSync.save({ ...configSync.data, areas: merged });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers, workersSync.ready, configSync.ready]);

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

  // Para el desplegable "Cambiar el trabajador de esta fila": debe listar a TODOS, incluidos
  // los inactivos — es justamente la forma de volver a traer a alguien que se quitó del
  // calendario, sin tener que ir a "Trabajadores" a reactivarlo primero.
  const allWorkersSorted = useMemo(
    () => [...workers].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')),
    [workers],
  );

  const visibleWorkers = useMemo(() => {
    if (scope.length === 0) return activeWorkers;
    return activeWorkers.filter((w) => scope.includes(w.area));
  }, [activeWorkers, scope]);

  // El filtro de Alcance define, por defecto, quién va en cada fila; un cambio manual
  // por fila (rowOverrides) lo reemplaza sin mover los turnos de nadie. "extraRows" son
  // filas agregadas a mano con "+ Agregar fila" (van después de las del filtro).
  const displayedWorkers = useMemo(() => {
    const base = visibleWorkers.map((w, i) => {
      const overrideId = rowOverrides[i];
      if (!overrideId) return w;
      return workers.find((x) => x.id === overrideId) ?? w;
    });
    const extra = extraRows
      .map((id) => workers.find((x) => x.id === id))
      .filter((w): w is Worker => Boolean(w));
    return [...base, ...extra];
  }, [visibleWorkers, rowOverrides, extraRows, workers]);

  useEffect(() => { setRowOverrides({}); setExtraRows([]); }, [scope]);

  // Dotación de los trabajadores que se ven en el calendario (respeta el filtro de sección);
  // cada persona cuenta una sola vez aunque aparezca en más de una fila.
  const headcount = useMemo(() => {
    const unique = new Map(displayedWorkers.map((w) => [w.id, w]));
    let m = 0;
    let f = 0;
    for (const w of unique.values()) {
      if (w.gender === 'M') m += 1;
      else if (w.gender === 'F') f += 1;
    }
    return { m, f, total: unique.size, sinDato: unique.size - m - f };
  }, [displayedWorkers]);

  const addExtraRow = () => {
    if (allWorkersSorted.length === 0) return;
    setExtraRows((prev) => [...prev, allWorkersSorted[0].id]);
  };

  const handleRowWorkerChange = (rowIndex: number, newWorkerId: string) => {
    if (rowIndex >= visibleWorkers.length) {
      setExtraRows((prev) => {
        const next = [...prev];
        next[rowIndex - visibleWorkers.length] = newWorkerId;
        return next;
      });
      return;
    }
    setRowOverrides((prev) => ({ ...prev, [rowIndex]: newWorkerId }));
  };

  const handleRowDelete = (workerId: string, rowIndex: number) => {
    if (rowIndex >= visibleWorkers.length) {
      // Fila agregada a mano: se quita solo el "espacio" extra, no se borra al trabajador real.
      setExtraRows((prev) => prev.filter((_, i) => i !== rowIndex - visibleWorkers.length));
      return;
    }
    // El ícono de la fila del calendario NUNCA borra a nadie de la base — solo lo saca de
    // esta vista. El borrado real y permanente vive únicamente en "Trabajadores".
    setConfirmRemoveWorkerId(workerId);
  };

  const confirmRemoveFromView = () => {
    if (!confirmRemoveWorkerId) return;
    const w = workers.find((x) => x.id === confirmRemoveWorkerId);
    if (w) workersSync.save({ ...w, status: 'inactivo' });
    setConfirmRemoveWorkerId(null);
  };

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
    workersSync.save(worker);
    setWorkerModal(null);
  };

  const deleteWorker = (id: string) => setConfirmDeleteWorkerId(id);

  const confirmDeleteWorker = () => {
    if (!confirmDeleteWorkerId) return;
    const id = confirmDeleteWorkerId;
    workersSync.remove(id);
    shifts.filter((s) => s.workerId === id).forEach((s) => shiftsSync.remove(s.id));
    setWorkerModal(null);
    setConfirmDeleteWorkerId(null);
  };

  const saveShift = (data: Pick<ScheduledShift, 'shiftTypeId' | 'start' | 'end' | 'breakMinutes' | 'notes'>) => {
    if (!shiftModal) return;
    const { workerId, iso, shift } = shiftModal;
    if (shift) {
      // `data.notes` viene ausente (no undefined) cuando el campo Notas quedó vacío —
      // hay que sacarlo también de `shift` o el valor anterior quedaría pegado.
      const shiftWithoutNotes: ScheduledShift = { ...shift };
      delete shiftWithoutNotes.notes;
      shiftsSync.save({ ...shiftWithoutNotes, ...data });
    } else {
      shiftsSync.save({ id: newShiftId(), workerId, date: iso, status: 'publicado', ...data });
    }
    setShiftModal(null);
  };

  const deleteShift = () => {
    if (!shiftModal?.shift) return;
    shiftsSync.remove(shiftModal.shift.id);
    setShiftModal(null);
  };

  // Llenado por rango (Vacaciones/Licencia/etc.): reemplaza lo que hubiera ese día por
  // cada fecha calculada (día hábil por día hábil) con la ausencia elegida.
  const saveShiftRange = (data: { shiftTypeId: string; notes?: string }, dates: string[]) => {
    if (!shiftModal) return;
    const { workerId } = shiftModal;
    for (const date of dates) {
      shifts
        .filter((s) => s.workerId === workerId && s.date === date && s.status !== 'anulado')
        .forEach((s) => shiftsSync.remove(s.id));
      shiftsSync.save({
        id: newShiftId(), workerId, date, status: 'publicado',
        shiftTypeId: data.shiftTypeId, start: '00:00', end: '00:00', breakMinutes: 0,
        ...(data.notes ? { notes: data.notes } : {}),
      });
    }
    setShiftModal(null);
  };

  const addMotivo = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (motivos.some((m) => m.toLowerCase() === clean.toLowerCase())) return;
    configSync.save({ ...configSync.data, motivos: [...motivos, clean] });
  };

  const addArea = (name: string): string | void => {
    const clean = name.trim();
    if (!clean) return 'Escribe un nombre para la sección.';
    if (areas.some((a) => a.toLowerCase() === clean.toLowerCase())) return 'Ya existe una sección con ese nombre.';
    configSync.save({ ...configSync.data, areas: [...areas, clean].sort() });
  };

  // Si el nuevo nombre coincide con una sección ya existente, ambas quedan fusionadas
  // (los trabajadores de "oldName" pasan a compartir la sección de igual nombre).
  const renameArea = (oldName: string, newName: string): string | void => {
    const clean = newName.trim();
    if (!clean) return 'El nombre no puede quedar vacío.';
    if (clean === oldName) return;
    workers.filter((w) => w.area === oldName).forEach((w) => workersSync.save({ ...w, area: clean }));
    configSync.save({ ...configSync.data, areas: Array.from(new Set(areas.filter((a) => a !== oldName).concat(clean))).sort() });
  };

  const deleteArea = (name: string) => {
    if ((workerCountByArea[name] ?? 0) > 0) return;
    configSync.save({ ...configSync.data, areas: areas.filter((a) => a !== name) });
  };

  const resolverSolicitud = (id: string, estado: 'aprobada' | 'rechazada', respuestaAdmin?: string) => {
    const s = solicitudes.find((x) => x.id === id);
    if (!s) return;
    solicitudesSync.save({
      ...s,
      estado,
      // Firestore rechaza `undefined` en un campo: solo se incluye si el admin escribió algo.
      ...(respuestaAdmin?.trim() ? { respuestaAdmin: respuestaAdmin.trim() } : {}),
      resueltoEn: new Date().toISOString(),
    });
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

          <div className="nav">
            <button onClick={() => step(-1)} aria-label="Anterior">‹</button>
            <button onClick={() => setAnchor(new Date())}>Hoy</button>
            <button onClick={() => step(1)} aria-label="Siguiente">›</button>
          </div>

          <button className="ghost" onClick={() => setAreaManagerOpen(true)}>Secciones</button>
          <button className="primary" onClick={() => setWorkerManagerOpen(true)}>Trabajadores</button>
          <button className="ghost inbox-btn" onClick={() => setInboxOpen(true)}>
            Solicitudes
            {pendientesCount > 0 && <span className="inbox-badge">{pendientesCount}</span>}
          </button>
          <button className="ghost" onClick={() => setMonthlyReportOpen(true)}>Resumen mensual</button>
          <button className="ghost" onClick={() => window.print()}>Imprimir</button>
          <button className="danger-ghost" onClick={onSalir}>Salir</button>
        </div>
      </header>

      <section className="sheet">
        <div className="sheet-head">
          <div>
            <h2>
              Calendario de Turnos
              {scope.length > 0 && <span className="h2-scope"> · Sección: {scope.join(', ')}</span>}
            </h2>
            <p className="period">{periodLabel}</p>
          </div>
          <div
            className="headcount"
            title="Dotación de los trabajadores del calendario: M = masculino, F = femenino"
          >
            <span>M= {pad2(headcount.m)} - F= {pad2(headcount.f)}, TOT= {pad2(headcount.total)}</span>
            {headcount.sinDato > 0 && (
              <span
                className="headcount-missing no-print"
                title="Trabajadores sin sexo asignado: se define en Trabajadores → editar"
              >
                sin dato: {headcount.sinDato}
              </span>
            )}
          </div>
          <div className="sheet-head-right">
            <label className="field no-print">
              <span>Sección a trabajar / imprimir</span>
              <SectionFilter areas={areas} selected={scope} onChange={setScope} />
            </label>
            <div className="legend no-print">
              {SHIFT_TYPES.map((t) => (
                <span key={t.id} className="legend-item">
                  <span className="dot" style={{ background: t.color }} />
                  {t.name} <small>({t.defaultStart}–{t.defaultEnd})</small>
                </span>
              ))}
            </div>
          </div>
        </div>

        <CalendarGrid
          days={days}
          workers={displayedWorkers}
          allWorkers={allWorkersSorted}
          shifts={shifts}
          shiftTypes={SHIFT_TYPES}
          motivos={motivos}
          today={hoy}
          onCellClick={(workerId, iso) => setShiftModal({ workerId, iso })}
          onShiftClick={(shift) => setShiftModal({ workerId: shift.workerId, iso: shift.date, shift })}
          onWorkerClick={(workerId) => {
            const w = workers.find((x) => x.id === workerId);
            if (w) setWorkerModal({ mode: 'edit', worker: w });
          }}
          onDeleteWorker={handleRowDelete}
          onRowWorkerChange={handleRowWorkerChange}
          onAddRow={addExtraRow}
          canAddRow={allWorkersSorted.length > 0}
        />

        <footer className="sheet-foot">
          <span>Emitido: {toISO(hoy)}</span>
          <span>Sincronizado con Firebase — admin y trabajadores ven los mismos datos</span>
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
            dateIso={shiftModal.iso}
            shiftTypes={SHIFT_TYPES}
            motivos={motivos}
            onAddMotivo={addMotivo}
            initial={shiftModal.shift}
            onSave={saveShift}
            onSaveRange={saveShiftRange}
            onDelete={shiftModal.shift ? deleteShift : undefined}
            onClose={() => setShiftModal(null)}
          />
        </Modal>
      )}

      {inboxOpen && (
        <Modal title="Solicitudes de los trabajadores" onClose={() => setInboxOpen(false)}>
          <RequestInbox
            solicitudes={solicitudes}
            onResolver={resolverSolicitud}
          />
        </Modal>
      )}

      {monthlyReportOpen && (
        <Modal title="Resumen mensual de horas" onClose={() => setMonthlyReportOpen(false)}>
          <MonthlyReport workers={workers} shifts={shifts} />
        </Modal>
      )}

      {confirmDeleteWorkerId && (
        <ConfirmDialog
          title="Eliminar trabajador"
          message={`¿Eliminar PERMANENTEMENTE a ${workers.find((w) => w.id === confirmDeleteWorkerId)?.fullName ?? 'este trabajador'}? También se borrarán sus turnos. Esto no se puede deshacer.`}
          onConfirm={confirmDeleteWorker}
          onCancel={() => setConfirmDeleteWorkerId(null)}
        />
      )}

      {confirmRemoveWorkerId && (
        <ConfirmDialog
          title="Quitar del calendario"
          message={`¿Quitar a ${workers.find((w) => w.id === confirmRemoveWorkerId)?.fullName ?? 'este trabajador'} de esta vista? Sigue guardado en "Trabajadores" (marcado como inactivo) y puedes reactivarlo cuando quieras.`}
          confirmLabel="Quitar de la vista"
          danger={false}
          onConfirm={confirmRemoveFromView}
          onCancel={() => setConfirmRemoveWorkerId(null)}
        />
      )}
    </div>
  );
}
