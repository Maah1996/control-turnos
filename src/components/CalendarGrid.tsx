import type { ScheduledShift, ShiftType, Worker } from '../types';
import {
  dayShort, fmtHours, isSameDay, isWeekend, minutesBetween, toISO,
} from '../lib/dates';
import { DAILY_REFERENCE_MINUTES, splitWeeklyLegalAndExtra, workerWeeklyLimitMinutes } from '../lib/laborLaw';
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

  // "Horas" legales/extra de cada trabajador: se reparten según SU tope semanal propio
  // (Worker.weeklyHours — 42h para jornada completa, menos si es part-time), no un número
  // fijo igual para todos. Se agrupa por semana calendario para que también funcione en
  // las vistas Quincena/Mes, que muestran más de una semana a la vez.
  const workerLegalAndExtra = (worker: Worker) => {
    const shiftsInView = shifts.filter((s) => s.workerId === worker.id && s.status !== 'anulado'
      && days.some((d) => toISO(d) === s.date));
    const limitMinutes = workerWeeklyLimitMinutes(worker, today);
    return splitWeeklyLegalAndExtra(shiftsInView, limitMinutes);
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
          {workers.map((w, rowIndex) => {
            const { legalMinutes, extraMinutes } = workerLegalAndExtra(w);
            return (
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
                      // El tope diario se mide sobre las horas NETAS (ya descontada la colación):
                      // el Art. 34 del Código del Trabajo dice que la colación no es imputable a
                      // la jornada, así que un bloque 10:00–18:30 con 30 min de colación son 8h
                      // trabajadas normales, no 8h30 — no corresponde marcarlo como extra.
                      const dayExtraMinutes = isMotivo ? 0 : Math.max(0, mins - DAILY_REFERENCE_MINUTES);
                      const dayLegalMinutes = mins - dayExtraMinutes;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={'chip' + (dayExtraMinutes > 0 ? ' chip-overtime' : '')}
                          style={{ ['--chip' as string]: t?.color ?? '#888' }}
                          title={isMotivo
                            ? `${t?.name ?? ''} — clic para editar`
                            : `${t?.name ?? ''} ${s.start}–${s.end} · colación ${s.breakMinutes} min${dayExtraMinutes > 0 ? ` · ${fmtHours(dayExtraMinutes)} sobre la jornada diaria de 8h` : ''} — clic para editar`}
                          onClick={(e) => { e.stopPropagation(); onShiftClick?.(s); }}
                        >
                          {isMotivo ? (
                            <span className="chip-motivo">{t?.name}</span>
                          ) : (
                            <>
                              <span className="chip-code">{t?.code}</span>
                              <span className="chip-time">{s.start}–{s.end}</span>
                              <span className="chip-hours-row">
                                <span className="chip-net">{fmtHours(dayLegalMinutes)}</span>
                                {dayExtraMinutes > 0 && (
                                  <span className="chip-extra">+{fmtHours(dayExtraMinutes)}</span>
                                )}
                              </span>
                              {dayExtraMinutes > 0 && (
                                <span className="chip-total">{fmtHours(mins)} totales</span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </td>
                );
              })}
              <td className="total">
                <span className="total-hours-row">
                  <span className="total-hours" title="Horas dentro de la jornada semanal contratada">
                    {fmtHours(legalMinutes)}
                  </span>
                  {extraMinutes > 0 && (
                    <span className="total-overtime" title="Horas extra sobre la jornada semanal contratada">
                      +{fmtHours(extraMinutes)}
                    </span>
                  )}
                </span>
                {extraMinutes > 0 && (
                  <span className="total-sum">{fmtHours(legalMinutes + extraMinutes)} en la semana</span>
                )}
              </td>
            </tr>
            );
          })}
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
