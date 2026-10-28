import type {
  ExerciseAttempt, ExerciseLevel, Goal, Habit, HabitCompletion, PersonalPrinciple,
  PersonalReflection, Task, TrainingSession, UserPreferences,
} from '../../types';

export const DB_NAME = 'project-lyoko';
export const DB_VERSION = 1;

export interface StoreMap {
  preferences: UserPreferences;
  principles: PersonalPrinciple;
  reflections: PersonalReflection;
  goals: Goal;
  tasks: Task;
  habits: Habit;
  habitCompletions: HabitCompletion;
  attempts: ExerciseAttempt;
  sessions: TrainingSession;
  levels: ExerciseLevel;
}
export type StoreName = keyof StoreMap;

export const STORE_NAMES: StoreName[] = [
  'preferences', 'principles', 'reflections', 'goals', 'tasks',
  'habits', 'habitCompletions', 'attempts', 'sessions', 'levels',
];

/** Error de almacenamiento con mensaje legible; la causa original se conserva en `cause`. */
export class StorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('Este navegador no permite guardar datos locales (IndexedDB no disponible).'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Si otra pestaña actualiza la base de datos, soltamos la conexión en vez de bloquearla.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(new StorageError('No se pudo abrir el almacenamiento local.', req.error));
    req.onblocked = () => reject(new StorageError('El almacenamiento local está bloqueado por otra pestaña.'));
  });
  // Si falla, permitimos reintentar en la siguiente llamada.
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

/** Cierra la conexión sin borrar datos (simula cerrar y reabrir la app). */
export async function closeDbConnection(): Promise<void> {
  if (!dbPromise) return;
  try { (await dbPromise).close(); } catch { /* ya cerrada */ }
  dbPromise = null;
}

/** Sólo para pruebas: cierra la conexión y borra la base de datos. */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    try { (await dbPromise).close(); } catch { /* ya cerrada */ }
    dbPromise = null;
  }
  await new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => resolve();
  });
}

export function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
  });
}
