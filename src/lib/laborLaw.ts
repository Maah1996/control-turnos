// Tope legal de horas semanales (Chile) — reducción gradual de la jornada.
// Mismos valores/fechas que quedaron anotados en BITACORA.md (Anexo A, `labor_rules`).
import { toISO } from './dates';

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
