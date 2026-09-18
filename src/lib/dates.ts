// Utilidades de fecha. Todo en hora local (America/Santiago en el equipo del usuario).
// Nota BITACORA: al integrar cálculos de horas hay que considerar DST y turnos nocturnos.

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Lunes de la semana que contiene a `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay(); // 0=Dom
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(r, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Rango de días [desde, hasta] inclusivo. */
export function eachDay(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let cur = new Date(from);
  while (cur <= to) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

export function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISO(a) === toISO(b);
}

export function dayName(d: Date): string {
  return DIAS[d.getDay()];
}

export function dayShort(d: Date): string {
  return DIAS_CORTO[d.getDay()];
}

export function fmtLong(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fmtMonthYear(d: Date): string {
  const m = MESES[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

/** Minutos entre "HH:mm" y "HH:mm", tolera cruce de medianoche. */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

/** Suma minutos a una hora "HH:mm", dando la vuelta después de medianoche. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  let total = (h * 60 + m + minutes) % (24 * 60);
  if (total < 0) total += 24 * 60;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, '0')} h`;
}
