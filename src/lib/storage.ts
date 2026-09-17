// Persistencia local (localStorage) mientras no existe backend (ver BITACORA · Anexo B).
// Los datos se "siembran" una vez desde data/mock.ts y desde ahí el usuario es dueño de sus cambios.

const KEY_WORKERS = 'turnos_workers_v1';
const KEY_SHIFTS = 'turnos_shifts_v1';
const KEY_AREAS = 'turnos_areas_v1';
const KEY_MOTIVOS = 'turnos_motivos_v1';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.) — se pierde el guardado silenciosamente.
  }
}

export const STORAGE_KEYS = {
  workers: KEY_WORKERS, shifts: KEY_SHIFTS, areas: KEY_AREAS, motivos: KEY_MOTIVOS,
};
