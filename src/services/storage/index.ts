import { createRepo } from './repo';

export const repos = {
  preferences: createRepo('preferences'),
  principles: createRepo('principles'),
  reflections: createRepo('reflections'),
  goals: createRepo('goals'),
  tasks: createRepo('tasks'),
  habits: createRepo('habits'),
  habitCompletions: createRepo('habitCompletions'),
  attempts: createRepo('attempts'),
  sessions: createRepo('sessions'),
  levels: createRepo('levels'),
};

export { StorageError, STORE_NAMES } from './db';
export type { StoreName, StoreMap } from './db';
export { subscribe, notify } from './repo';

/**
 * Pide al navegador que no borre los datos bajo presión de espacio. No muestra ningún permiso
 * al usuario; el navegador decide (en iOS instalar la PWA ayuda). Devuelve si quedó protegido.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* no soportado */ }
  return false;
}
