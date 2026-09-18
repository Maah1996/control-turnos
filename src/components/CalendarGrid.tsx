import type { ScheduledShift, ShiftType, Worker } from '../types';
import {
  dayShort, fmtHours, isSameDay, isWeekend, minutesBetween, startOfWeek, toISO,
} from '../lib/dates';
import { weeklyLegalLimitHours } from '../lib/laborLaw';
import { MOTIVO_PREFIX } from './ShiftForm';

interface Props {
  days: Date[];
  workers: Worker[];
  allWorkers: Worker[];
  shifts: ScheduledShift[];
  shiftTypes: ShiftType[];
  motivos: string[];
  today: Date;
  onCellClick?: (workerId: string, iso: string) => void;
  onShiftClick?: (shift: ScheduledShift) => void;
  onWorkerClick?: (workerId: string) => void;
  onDeleteWorker?: (workerId: string, rowIndex: number) => void;
  onRowWorkerChange?: (rowIndex: number, newWorkerId: string) => void;
  onAddRow?: () => void;
  canAddRow?: boolean;
}

const MOTIVO_COLOR = '#64748b';

export function CalendarGrid({
  days, workers, allWorkers, shifts, shiftTypes, motivos, today,
  onCellClick, onShiftClick, onWorkerClick, onDeleteWorker, onRowWorkerChange, onAddRow, canAddRow,
}: Props) {
  const motivoTypes: ShiftType[] = motivos.map((m) => ({
    id: MOTIVO_PREFIX + m, name: m, code: m.slice(0, 3).toUpperCase(),
    defaultStart: '00:00', defaultEnd: '00:00', crossesMidnight: false,
    defaultBreakMinutes: 0, color: MOTIVO_COLOR,
  }));
  const typeById = new Map([...shiftTypes, ...motivoTypes].map((t) => [t.id, t]));

  const shiftsFor = (workerId: string, iso: string) =>
    shifts.filter((s) => s.workerId === workerId && s.date === iso && s.status !== 'anulado');

  const workerWeekMinutes = (workerId: string) =>
    shifts
      .filter((s) => s.workerId === workerId && s.status !== 'anulado'
        && days.some((d) => toISO(d) === s.date))
      .reduce((acc, s) => acc + minutesBetween(s.start, s.end) - s.breakMinutes, 0);

  // Horas extra: tope legal semanal (42h desde abr-2026, ver lib/laborLaw.ts), calculado
  // de lunes a sábado — el domingo es descanso y no cuenta para la jornada ordinaria.
  // Se agrupa por semana calendario (lunes de esa semana) para que también funcione en
  // las vistas Quincena/Mes, que muestran más de una semana a la vez.
  const weeklyLimitMinutes = weeklyLegalLimitHours(today) * 60;

  const workerExtraMinutes = (workerId: string) => {
    const minutesByWeek = new Map<string, number>();
    for (const d of days) {
      if (d.getDay() === 0) continue; // domingo
      const iso = toISO(d);
      const weekKey = toISO(startOfWeek(d));
      const dayMinutes = shiftsFor(workerId, iso)
        .reduce((acc, s) => acc + minutesBetween(s.start, s.end) - s.breakMinutes, 0);
      minutesByWeek.set(weekKey, (minutesByWeek.get(weekKey) ?? 0) + dayMinutes);
    }
    let extra = 0;
    for (const mins of minutesByWeek.values()) {
      if (mins > weeklyLimitMinutes) extra += mins - weeklyLimitMinutes;
    }
    return extra;
  };

  return (
    <div className="grid-scroll">
      <table className="grid" style={{ ['--cols' as string]: days.length }}>
        <thead>
          <tr>
            <th className="corner" scope="col">Trabajador</th>
            {days.map((d) => (
              <th
                key={toISO(d)}
                scope="col"
                className={
                  'daycol'
                  + (isWeekend(d) ? ' weekend' : '')
                  + (isSameDay(d, today) ? ' is-today' : '')
                }
              >
                <span className="dow">{dayShort(d)}</span>
                <span className="dnum">{d.getDate()}</span>
              </th>
            ))}
            <th className="totalcol" scope="col">Horas</th>
          </tr>
        </thead>
        <tbody>
          {workers.length === 0 && (
            <tr>
              <td className="empty-state" colSpan={days.length + 2}>
                No hay trabajadores para este alcance. Prueba con "Todos los trabajadores" o crea uno nuevo con "+ Trabajador".
              </td>
            </tr>
          )}
          {workers.map((w, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              <th className="worker" scope="row">
                <span className="swatch" style={{ background: w.color }} />
                <div className="worker-main">
                  <button
                    type="button"
                    className="wname"
                    onClick={() => onWorkerClick?.(w.id)}
                    title="Editar trabajador"
                  >
                    <strong>{w.fullName}</strong>
                    <small>{w.position} · {w.area}</small>
                  </button>
                  <label className="worker-swap-label" htmlFor={`worker-swap-${rowIndex}`}>
                    <span className="visually-hidden">Cambiar el trabajador de esta fila</span>
                    <select
                      id={`worker-swap-${rowIndex}`}
                      className="worker-swap"
                      value={w.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); onRowWorkerChange?.(rowIndex, e.target.value); }}
                    >
                      {allWorkers.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.fullName}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="worker-delete"
                  onClick={(e) => { e.stopPropagation(); onDeleteWorker?.(w.id, rowIndex); }}
                  title="Eliminar trabajador"
                  aria-label={`Eliminar a ${w.fullName}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-.8 12.1A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.9L5 7h14Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </th>
              {days.map((d) => {
                const iso = toISO(d);
                const cellShifts = shiftsFor(w.id, iso);
                return (
                  <td
                    key={iso}
                    className={
                      'cell'
                      + (isWeekend(d) ? ' weekend' : '')
                      + (isSameDay(d, today) ? ' is-today' : '')
                      + (cellShifts.length === 0 ? ' empty' : '')
                    }
                    onClick={() => onCellClick?.(w.id, iso)}
                  >
                    {cellShifts.map((s) => {
                      const t = typeById.get(s.shiftTypeId);
                      const isMotivo = s.shiftTypeId.startsWith(MOTIVO_PREFIX);
                      const mins = minutesBetween(s.start, s.end) - s.breakMinutes;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="chip"
                          style={{ ['--chip' as string]: t?.color ?? '#888' }}
                          title={isMotivo
                            ? `${t?.name ?? ''} — clic para editar`
                            : `${t?.name ?? ''} ${s.start}–${s.end} · colación ${s.breakMinutes} min — clic para editar`}
                          onClick={(e) => { e.stopPropagation(); onShiftClick?.(s); }}
                        >
                          {isMotivo ? (
                            <span className="chip-motivo">{t?.name}</span>
                          ) : (
                            <>
                              <span className="chip-code">{t?.code}</span>
                              <span className="chip-time">{s.start}–{s.end}</span>
                              <span className="chip-net">{fmtHours(mins)}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </td>
                );
              })}
              <td className="total">
                <span className="total-hours">{fmtHours(workerWeekMinutes(w.id))}</span>
                {workerExtraMinutes(w.id) > 0 && (
                  <span className="total-overtime" title="Horas extra sobre el tope legal semanal">
                    +{fmtHours(workerExtraMinutes(w.id))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {onAddRow && (
          <tfoot>
            <tr>
              <td className="add-row-cell" colSpan={days.length + 2}>
                <button
                  type="button"
                  className="add-row-btn"
                  onClick={onAddRow}
                  disabled={!canAddRow}
                  title={canAddRow ? undefined : 'Crea un trabajador primero'}
                >
                  + Agregar fila
                </button>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
