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
