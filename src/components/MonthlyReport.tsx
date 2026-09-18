import { useMemo, useState } from 'react';
import type { ScheduledShift, Worker } from '../types';
import {
  dayName, eachDay, endOfMonth, fmtHours, fmtLong, fmtMonthYear, fromISO, minutesBetween, startOfMonth, toISO,
} from '../lib/dates';
import { splitWeeklyLegalAndExtra, workerWeeklyLimitMinutes } from '../lib/laborLaw';

interface Props {
  workers: Worker[];
  shifts: ScheduledShift[];
}

interface WorkerMonthSummary {
  worker: Worker;
  legalMinutes: number;
  extraMinutes: number;
  totalMinutes: number;
  extraDays: { iso: string; extraMinutes: number }[];
}

export function MonthlyReport({ workers, shifts }: Props) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const days = useMemo(() => eachDay(startOfMonth(anchor), endOfMonth(anchor)), [anchor]);
  const daySet = useMemo(() => new Set(days.map(toISO)), [days]);

  // Mismo criterio que la columna "Horas" del calendario: horas legales/extra repartidas
  // según el tope semanal propio de cada trabajador (Worker.weeklyHours), agrupado por
  // semana calendario dentro del mes — ver lib/laborLaw.ts.
  const summaries = useMemo<WorkerMonthSummary[]>(() => {
    const result: WorkerMonthSummary[] = [];
    for (const w of workers) {
      const shiftsInMonth = shifts.filter((s) => s.workerId === w.id && s.status !== 'anulado' && daySet.has(s.date));
      if (shiftsInMonth.length === 0) continue;
      const limitMinutes = workerWeeklyLimitMinutes(w, anchor);
      const { legalMinutes, extraMinutes, extraByDay } = splitWeeklyLegalAndExtra(shiftsInMonth, limitMinutes);
      const totalMinutes = shiftsInMonth.reduce((acc, s) => acc + minutesBetween(s.start, s.end) - s.breakMinutes, 0);
      result.push({
        worker: w, legalMinutes, extraMinutes, totalMinutes,
        extraDays: extraByDay,
      });
    }
    return result.sort((a, b) => a.worker.fullName.localeCompare(b.worker.fullName, 'es'));
  }, [workers, shifts, daySet, anchor]);

  const selected = summaries.find((r) => r.worker.id === selectedWorkerId) ?? null;

  const stepMonth = (dir: number) => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    setSelectedWorkerId(null);
  };

  if (selected) {
    const sortedDays = [...selected.extraDays].sort((a, b) => a.iso.localeCompare(b.iso));
    return (
      <div className="report">
        <button type="button" className="ghost sm" onClick={() => setSelectedWorkerId(null)}>← Volver al resumen</button>
        <div className="report-detail-head">
          <strong>{selected.worker.fullName}</strong>
          <span>Horas extra — {fmtMonthYear(anchor)}</span>
        </div>
        {sortedDays.length === 0 ? (
          <p className="empty-state">Sin horas extra este mes.</p>
        ) : (
          <ul className="report-day-list">
            {sortedDays.map((d) => (
              <li key={d.iso} className="report-day-row">
                <span className="report-day-name">{dayName(fromISO(d.iso))}</span>
                <span className="report-day-date">{fmtLong(fromISO(d.iso))}</span>
                <span className="report-day-extra">+{fmtHours(d.extraMinutes)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="report-total-row">
          <span>Total horas extra del mes</span>
          <strong>{fmtHours(selected.extraMinutes)}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="report">
      <div className="report-nav">
        <button type="button" className="ghost sm" onClick={() => stepMonth(-1)} aria-label="Mes anterior">‹</button>
        <strong>{fmtMonthYear(anchor)}</strong>
        <button type="button" className="ghost sm" onClick={() => stepMonth(1)} aria-label="Mes siguiente">›</button>
      </div>

      {summaries.length === 0 ? (
        <p className="empty-state">Sin turnos registrados este mes.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Legales</th>
              <th>Extra</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((r) => (
              <tr key={r.worker.id}>
                <td>{r.worker.fullName}</td>
                <td>{fmtHours(r.legalMinutes)}</td>
                <td>
                  {r.extraMinutes > 0 ? (
                    <button
                      type="button"
                      className="report-extra-link"
                      onClick={() => setSelectedWorkerId(r.worker.id)}
                      title="Ver el detalle día por día"
                    >
                      +{fmtHours(r.extraMinutes)}
                    </button>
                  ) : (
                    <span className="report-extra-zero">0 h</span>
                  )}
                </td>
                <td>{fmtHours(r.totalMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
