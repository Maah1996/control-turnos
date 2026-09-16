import type { ScheduledShift, ShiftType, Worker } from '../types';
import {
  dayShort, fmtHours, isSameDay, isWeekend, minutesBetween, toISO,
} from '../lib/dates';

interface Props {
  days: Date[];
  workers: Worker[];
  shifts: ScheduledShift[];
  shiftTypes: ShiftType[];
  today: Date;
  onCellClick?: (workerId: string, iso: string) => void;
  onShiftClick?: (shift: ScheduledShift) => void;
  onWorkerClick?: (workerId: string) => void;
}

export function CalendarGrid({
  days, workers, shifts, shiftTypes, today, onCellClick, onShiftClick, onWorkerClick,
}: Props) {
  const typeById = new Map(shiftTypes.map((t) => [t.id, t]));

  const shiftsFor = (workerId: string, iso: string) =>
    shifts.filter((s) => s.workerId === workerId && s.date === iso && s.status !== 'anulado');

  const workerWeekMinutes = (workerId: string) =>
    shifts
      .filter((s) => s.workerId === workerId && s.status !== 'anulado'
        && days.some((d) => toISO(d) === s.date))
      .reduce((acc, s) => acc + minutesBetween(s.start, s.end) - s.breakMinutes, 0);

  return (
    <div className="grid-scroll">
      <table className="grid" style={{ ['--cols' as string]: days.length }}>
        <thead>
          <tr>
            <th className="corner">Trabajador</th>
            {days.map((d) => (
              <th
                key={toISO(d)}
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
            <th className="totalcol">Horas</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id}>
              <th className="worker" scope="row">
                <span className="swatch" style={{ background: w.color }} />
                <button
                  type="button"
                  className="wname"
                  onClick={() => onWorkerClick?.(w.id)}
                  title="Editar trabajador"
                >
                  <strong>{w.fullName}</strong>
                  <small>{w.position} · {w.area}</small>
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
                      const mins = minutesBetween(s.start, s.end) - s.breakMinutes;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="chip"
                          style={{ ['--chip' as string]: t?.color ?? '#888' }}
                          title={`${t?.name ?? ''} ${s.start}–${s.end} · colación ${s.breakMinutes} min — clic para editar`}
                          onClick={(e) => { e.stopPropagation(); onShiftClick?.(s); }}
                        >
                          <span className="chip-code">{t?.code}</span>
                          <span className="chip-time">{s.start}–{s.end}</span>
                          <span className="chip-net">{fmtHours(mins)}</span>
                        </button>
                      );
                    })}
                  </td>
                );
              })}
              <td className="total">{fmtHours(workerWeekMinutes(w.id))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
