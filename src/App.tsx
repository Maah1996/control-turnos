import { useMemo, useState } from 'react';
import './App.css';
import type { ViewMode } from './types';
import {
  addDays, eachDay, endOfMonth, fmtLong, fmtMonthYear,
  startOfMonth, startOfWeek, toISO,
} from './lib/dates';
import { CalendarGrid } from './components/CalendarGrid';
import { EMPRESA, SHIFT_TYPES, WORKERS, buildMockShifts } from './data/mock';

const HOY = new Date();

export default function App() {
  const [view, setView] = useState<ViewMode>('semana');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [scope, setScope] = useState<string>('todos');

  const shifts = useMemo(() => buildMockShifts(anchor), [anchor]);

  const days = useMemo(() => {
    if (view === 'mes') {
      return eachDay(startOfMonth(anchor), endOfMonth(anchor));
    }
    const from = startOfWeek(anchor);
    const len = view === 'quincena' ? 14 : 7;
    return eachDay(from, addDays(from, len - 1));
  }, [view, anchor]);

  const workers = useMemo(() => {
    const active = WORKERS.filter((w) => w.status === 'activo');
    if (scope === 'todos') return active;
    return active.filter((w) => w.area === scope);
  }, [scope]);

  const areas = useMemo(
    () => Array.from(new Set(WORKERS.map((w) => w.area))).sort(),
    [],
  );

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

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo">◷</span>
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
          workers={workers}
          shifts={shifts}
          shiftTypes={SHIFT_TYPES}
          today={HOY}
          onCellClick={(workerId, iso) => {
            const w = WORKERS.find((x) => x.id === workerId);
            // Placeholder — la edición individual llega en la sesión 2 (ver BITACORA).
            alert(`Editar turno\n${w?.fullName}\n${iso}\n\n(pendiente: panel de edición)`);
          }}
        />

        <footer className="sheet-foot">
          <span>Emitido: {toISO(HOY)}</span>
          <span>Datos de ejemplo — sin backend todavía</span>
        </footer>
      </section>
    </div>
  );
}
