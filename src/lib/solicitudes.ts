import type { SolicitudCambio, SolicitudTipo } from '../types';
import { fmtLong, fromISO } from './dates';

export const TIPO_LABEL: Record<SolicitudTipo, string> = {
  cambio_horario: 'Cambio de horario',
  dia_libre: 'Día libre',
  reemplazo: 'Reemplazo con compañero',
  vacaciones: 'Vacaciones',
  reunion: 'Reunión con el gerente',
  licencia: 'Licencia',
  otro: 'Otro',
};

/** Fecha(s) de la solicitud en texto — null si no tiene una fecha relevante (tipo "otro"). */
export function fechasTexto(s: SolicitudCambio): string | null {
  if (s.tipo === 'otro') return null;
  const desde = fmtLong(fromISO(s.iso));
  if ((s.tipo === 'vacaciones' || s.tipo === 'licencia') && s.hastaIso) {
    const n = s.dias ?? 0;
    return `Del ${desde} al ${fmtLong(fromISO(s.hastaIso))} · ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`;
  }
  if (s.tipo === 'reunion') return s.hora ? `${desde} · ${s.hora} h` : desde;
  return desde;
}
