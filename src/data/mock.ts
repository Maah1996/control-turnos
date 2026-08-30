// Datos de ejemplo para maquetar el calendario mural.
// Se reemplazarán por Firestore en una sesión futura (ver BITACORA · Anexo B).

import type { ScheduledShift, ShiftType, Worker } from '../types';
import { addDays, startOfWeek, toISO } from '../lib/dates';

export const EMPRESA = {
  nombre: 'Empresa Demo S.A.',
  sucursal: 'Casa Matriz — Punta Arenas',
  area: 'Operaciones',
};

export const SHIFT_TYPES: ShiftType[] = [
  {
    id: 'st-am', name: 'Mañana', code: 'AM',
    defaultStart: '08:00', defaultEnd: '16:30', crossesMidnight: false,
    defaultBreakMinutes: 30, color: '#2f80ed',
  },
  {
    id: 'st-pm', name: 'Tarde', code: 'PM',
    defaultStart: '16:00', defaultEnd: '00:30', crossesMidnight: true,
    defaultBreakMinutes: 30, color: '#9b51e0',
  },
  {
    id: 'st-noche', name: 'Noche', code: 'NOC',
    defaultStart: '00:00', defaultEnd: '08:00', crossesMidnight: true,
    defaultBreakMinutes: 30, color: '#eb5757',
  },
];

export const WORKERS: Worker[] = [
  {
    id: 'w1', fullName: 'María Fernanda Ojeda', rut: '12.345.678-9',
    position: 'Supervisora', area: 'Operaciones', contractType: 'indefinido',
    weeklyHours: 42, hireDate: '2021-03-01', status: 'activo', color: '#2f80ed',
  },
  {
    id: 'w2', fullName: 'Juan Carlos Barría', rut: '15.987.654-3',
    position: 'Operario', area: 'Operaciones', contractType: 'indefinido',
    weeklyHours: 42, hireDate: '2022-07-15', status: 'activo', color: '#27ae60',
  },
  {
    id: 'w3', fullName: 'Camila Andrea Vera', rut: '18.222.333-4',
    position: 'Operaria', area: 'Operaciones', contractType: 'plazo_fijo',
    weeklyHours: 42, hireDate: '2024-01-08', status: 'activo', color: '#9b51e0',
  },
  {
    id: 'w4', fullName: 'Pedro Antonio Cárcamo', rut: '9.111.222-3',
    position: 'Operario', area: 'Bodega', contractType: 'indefinido',
    weeklyHours: 42, hireDate: '2019-11-20', status: 'activo', color: '#f2994a',
  },
  {
    id: 'w5', fullName: 'Rosa Elena Mansilla', rut: '20.444.555-6',
    position: 'Aseo', area: 'Servicios', contractType: 'part_time',
    weeklyHours: 30, hireDate: '2023-05-02', status: 'activo', color: '#eb5757',
  },
];

// Genera turnos de ejemplo para la semana de `ref` y la anterior/siguiente.
export function buildMockShifts(ref: Date): ScheduledShift[] {
  const monday = startOfWeek(ref);
  const shifts: ScheduledShift[] = [];
  let n = 0;

  const plan: Record<string, (string | null)[]> = {
    // L, M, X, J, V, S, D  ->  código de turno o null (libre)
    w1: ['AM', 'AM', 'AM', 'AM', 'AM', null, null],
    w2: ['PM', 'PM', 'PM', 'PM', 'PM', null, null],
    w3: ['AM', 'AM', null, 'PM', 'PM', 'AM', null],
    w4: [null, 'AM', 'AM', 'AM', 'AM', 'AM', null],
    w5: ['NOC', 'NOC', 'NOC', null, null, 'NOC', 'NOC'],
  };

  for (let semana = -1; semana <= 1; semana++) {
    for (const w of WORKERS) {
      const fila = plan[w.id] ?? [];
      fila.forEach((code, i) => {
        if (!code) return;
        const st = SHIFT_TYPES.find((s) => s.code === code)!;
        const date = toISO(addDays(monday, semana * 7 + i));
        shifts.push({
          id: `sh-${++n}`,
          workerId: w.id,
          shiftTypeId: st.id,
          date,
          start: st.defaultStart,
          end: st.defaultEnd,
          breakMinutes: st.defaultBreakMinutes,
          status: 'publicado',
        });
      });
    }
  }
  return shifts;
}
