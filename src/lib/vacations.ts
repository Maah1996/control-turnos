// Feriado legal (vacaciones) — Código del Trabajo:
//  - Art. 67: 15 días hábiles al año con remuneración íntegra.
//  - Art. 68: quien suma 10 años de trabajo (para uno o más empleadores; de los años con
//    empleadores anteriores solo cuentan hasta 10) tiene 1 día adicional por cada 3 años nuevos.
//  - Art. 69: el sábado es siempre inhábil para el feriado, igual que domingo.
// Los días "tomados" salen del calendario (turnos "Vacaciones"), así que lo cargado por el
// administrador y lo aprobado desde una solicitud cuentan igual, y quitar un día lo devuelve.
import type { ScheduledShift, SolicitudCambio, Worker } from '../types';
import { addDays, fromISO, isWeekend, toISO } from './dates';

export const FERIADO_BASE = 15;
const MAX_ANIOS_PREVIOS = 10;
const VACACIONES_SHIFT_TYPE = 'motivo:Vacaciones';

export interface FeriadoInfo {
  base: number;
  progresivos: number;
  /** Días hábiles de feriado que corresponden por año (base + progresivos). */
  anual: number;
  aniosServicio: number;
  periodoDesde: Date;
  periodoHasta: Date; // último día del período (inclusive)
  tomados: number;
  reservados: number; // en solicitudes pendientes de aprobar
  disponibles: number;
}

type FeriadoWorker = Pick<Worker, 'id' | 'hireDate' | 'priorYears' | 'vacationTaken'>;

function aniversario(hire: Date, years: number): Date {
  return new Date(hire.getFullYear() + years, hire.getMonth(), hire.getDate());
}

/**
 * Feriado del período de servicio (aniversario a aniversario) que contiene a `ref`.
 * `excluirSolicitudId` deja fuera una solicitud pendiente (la que se está evaluando).
 */
export function calcularFeriado(
  worker: FeriadoWorker,
  shifts: ScheduledShift[],
  solicitudes: SolicitudCambio[],
  ref: Date = new Date(),
  excluirSolicitudId?: string,
): FeriadoInfo {
  const parsed = worker.hireDate ? fromISO(worker.hireDate) : ref;
  const hire = Number.isNaN(parsed.getTime()) ? ref : parsed;

  let completos = ref.getFullYear() - hire.getFullYear();
  if (ref < aniversario(hire, completos)) completos -= 1;
  completos = Math.max(0, completos);

  const previos = Math.min(MAX_ANIOS_PREVIOS, Math.max(0, worker.priorYears ?? 0));
  const progresivos = Math.max(0, Math.floor((previos + completos - 10) / 3));
  const anual = FERIADO_BASE + progresivos;

  const periodoDesde = aniversario(hire, completos);
  const periodoSiguiente = aniversario(hire, completos + 1);
  const desdeIso = toISO(periodoDesde);
  const siguienteIso = toISO(periodoSiguiente);
  const enPeriodo = (iso: string) => iso >= desdeIso && iso < siguienteIso;

  const diasCalendario = new Set(
    shifts
      .filter((s) => s.workerId === worker.id && s.status !== 'anulado'
        && s.shiftTypeId === VACACIONES_SHIFT_TYPE && enPeriodo(s.date) && !isWeekend(fromISO(s.date)))
      .map((s) => s.date),
  );
  // Lo ya tomado antes de usar el sistema solo aplica al período en curso.
  const hoyIso = toISO(new Date());
  const manual = enPeriodo(hoyIso) ? Math.max(0, worker.vacationTaken ?? 0) : 0;
  const tomados = diasCalendario.size + manual;

  const reservados = solicitudes
    .filter((s) => s.workerId === worker.id && s.tipo === 'vacaciones' && s.estado === 'pendiente'
      && s.id !== excluirSolicitudId && enPeriodo(s.iso))
    .reduce((acc, s) => acc + (s.dias ?? 0), 0);

  return {
    base: FERIADO_BASE,
    progresivos,
    anual,
    aniosServicio: completos,
    periodoDesde,
    periodoHasta: addDays(periodoSiguiente, -1),
    tomados,
    reservados,
    disponibles: anual - tomados - reservados,
  };
}
