// Tipos de dominio — Control de Turnos y Asistencia (Chile)
// Ver BITACORA.md · Anexo A para el contrato completo de campos.

export type ContractType =
  | 'indefinido'
  | 'plazo_fijo'
  | 'por_obra'
  | 'honorarios'
  | 'part_time';

export type WorkerStatus = 'activo' | 'inactivo' | 'licencia' | 'vacaciones';

export interface Worker {
  id: string;
  fullName: string;
  rut: string;
  position: string; // cargo
  area: string;
  contractType: ContractType;
  weeklyHours: number;
  hireDate: string; // ISO yyyy-mm-dd
  status: WorkerStatus;
  color: string; // color en la planilla
  code?: string; // código de acceso al portal del trabajador (4-6 dígitos)
  gender?: 'M' | 'F'; // para el resumen de dotación (M / F / total) del encabezado
}

export interface ShiftType {
  id: string;
  name: string; // AM, PM, Noche, ...
  code: string; // sigla corta para la celda
  defaultStart: string; // "HH:mm"
  defaultEnd: string; // "HH:mm"
  crossesMidnight: boolean;
  defaultBreakMinutes: number;
  color: string;
}

export type ShiftStatus = 'borrador' | 'publicado' | 'modificado' | 'anulado';

export interface ScheduledShift {
  id: string;
  workerId: string;
  shiftTypeId: string;
  date: string; // ISO yyyy-mm-dd (día de inicio del turno)
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  breakMinutes: number;
  status: ShiftStatus;
  notes?: string;
}

export type ViewMode = 'semana' | 'quincena' | 'mes';

// Solicitud de cambio hecha por un trabajador desde su portal.
export type SolicitudTipo =
  | 'cambio_horario' | 'dia_libre' | 'reemplazo'
  | 'vacaciones' | 'reunion' | 'licencia' | 'otro';
export type SolicitudEstado = 'pendiente' | 'aprobada' | 'rechazada';

export interface SolicitudCambio {
  id: string;
  workerId: string;
  workerName: string; // copiado al crear, para que la bandeja no dependa de un join
  iso: string; // día al que afecta
  tipo: SolicitudTipo;
  motivo: string;
  reemplazoWorkerId?: string; // solo si tipo === 'reemplazo'
  reemplazoWorkerName?: string;
  estado: SolicitudEstado;
  respuestaAdmin?: string;
  creadoEn: string; // ISO datetime
  resueltoEn?: string; // ISO datetime
  // Vacaciones / licencia: `iso` es el inicio, `dias` son días hábiles y `hastaIso` el último día.
  dias?: number;
  hastaIso?: string;
  hora?: string; // reunión con el gerente: "HH:mm"
  // Licencia: el PDF se guarda en trozos en la colección `adjuntos` (ver lib/attachments.ts).
  adjunto?: { nombre: string; tamano: number; trozos: number };
}
