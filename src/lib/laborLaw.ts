// Tope legal de horas semanales (Chile) — reducción gradual de la jornada.
// Mismos valores/fechas que quedaron anotados en BITACORA.md (Anexo A, `labor_rules`).
import { fromISO, minutesBetween, startOfWeek, toISO } from './dates';
import type { Worker } from '../types';

interface LaborRule {
  effectiveFrom: string; // ISO yyyy-mm-dd
  weeklyLimitHours: number;
}

const LABOR_RULES: LaborRule[] = [
  { effectiveFrom: '2024-04-26', weeklyLimitHours: 44 },
  { effectiveFrom: '2026-04-26', weeklyLimitHours: 42 },
  { effectiveFrom: '2028-04-26', weeklyLimitHours: 40 },
];

/** Tope legal de horas semanales vigente en la fecha dada. */
export function weeklyLegalLimitHours(date: Date): number {
  const iso = toISO(date);
  let limit = LABOR_RULES[0].weeklyLimitHours;
  for (const rule of LABOR_RULES) {
    if (rule.effectiveFrom <= iso) limit = rule.weeklyLimitHours;
  }
  return limit;
}

// Referencia de jornada diaria "normal" para marcar un turno como largo — horas netas
// (colación ya descontada, ver Art. 34 Código del Trabajo: la colación no es imputable a
// la jornada). Distinta del tope legal semanal de arriba, que se evalúa en la semana completa.
export const DAILY_REFERENCE_MINUTES = 8 * 60;

/**
 * Horas semanales "legales" de un trabajador: las que tiene contratadas (`weeklyHours`,
 * ej. 42 para jornada completa, menos si es part-time), topadas por el máximo legal
 * vigente (por si el dato quedó mal cargado por encima del tope). Todos los trabajadores
 * de jornada completa comparten el mismo número (42h hoy); quien tenga menos es part-time.
 */
export function workerWeeklyLimitMinutes(worker: Pick<Worker, 'weeklyHours'>, date: Date): number {
  return Math.min(worker.weeklyHours, weeklyLegalLimitHours(date)) * 60;
}

export interface WeeklyExtraResult {
  legalMinutes: number;
  extraMinutes: number;
  /** Solo los días con algo de excedente, en orden cronológico — para el detalle día por día. */
  extraByDay: { iso: string; extraMinutes: number }[];
}

/**
 * Reparte las horas netas trabajadas en "legales" (dentro del tope semanal del trabajador)
 * y "extra" (lo que lo sobrepasa), agrupando por semana calendario (lunes a domingo).
 * Dentro de cada semana, los días se recorren en orden cronológico y el excedente se le
 * atribuye a los últimos días trabajados de esa semana — el mismo criterio con que se
 * cuentan las horas extraordinarias: las primeras horas de la semana son jornada
 * ordinaria, las que sobran al final son extra.
 */
export function splitWeeklyLegalAndExtra(
  shifts: { date: string; start: string; end: string; breakMinutes: number }[],
  weeklyLimitMinutes: number,
): WeeklyExtraResult {
  const minutesByDay = new Map<string, number>();
  for (const s of shifts) {
    const net = minutesBetween(s.start, s.end) - s.breakMinutes;
    minutesByDay.set(s.date, (minutesByDay.get(s.date) ?? 0) + net);
  }

  const daysByWeek = new Map<string, string[]>();
  for (const iso of minutesByDay.keys()) {
    const weekKey = toISO(startOfWeek(fromISO(iso)));
    const list = daysByWeek.get(weekKey);
    if (list) list.push(iso); else daysByWeek.set(weekKey, [iso]);
  }

  let legalMinutes = 0;
  let extraMinutes = 0;
  const extraByDay: { iso: string; extraMinutes: number }[] = [];

  for (const isoDays of daysByWeek.values()) {
    isoDays.sort();
    let cumulative = 0;
    for (const iso of isoDays) {
      const dayMinutes = minutesByDay.get(iso) ?? 0;
      const before = cumulative;
      cumulative += dayMinutes;
      const dayExtra = Math.max(0, cumulative - weeklyLimitMinutes) - Math.max(0, before - weeklyLimitMinutes);
      legalMinutes += dayMinutes - dayExtra;
      extraMinutes += dayExtra;
      if (dayExtra > 0) extraByDay.push({ iso, extraMinutes: dayExtra });
    }
  }

  return { legalMinutes, extraMinutes, extraByDay };
}
