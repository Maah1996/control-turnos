// Colores por motivo de ausencia — compartido entre el calendario del administrador
// (CalendarGrid) y el portal del trabajador (WorkerPortal), para que se vean iguales
// en las dos pantallas. Un motivo nuevo que el usuario agregue usa DEFAULT_MOTIVO_COLOR.
export const MOTIVO_COLORS: Record<string, string> = {
  'Vacaciones': '#fb923c', // naranja relajante
  'Permiso': '#a855f7',
  'Licencia médica': '#fb7185',
  'Falta al trabajo': '#dc2626',
  'Día libre': '#4ade80', // verde claro (con suficiente contraste como texto)
};

export const DEFAULT_MOTIVO_COLOR = '#64748b';

export function motivoColor(name: string): string {
  return MOTIVO_COLORS[name] ?? DEFAULT_MOTIVO_COLOR;
}
