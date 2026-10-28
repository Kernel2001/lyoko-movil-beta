import { openDb, StorageError, STORE_NAMES, txDone, type StoreName } from '../storage/db';
import { notify, runStorage } from '../storage/repo';
import { reqToPromise } from '../storage/db';
import { isDateKey } from '../../utils/dates';

export const BACKUP_APP = 'project-lyoko-movil-beta';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<StoreName, { id: string }[]>;
}

export async function buildBackup(): Promise<BackupFile> {
  return runStorage('leer', async () => {
    const db = await openDb();
    const tx = db.transaction(STORE_NAMES, 'readonly'); // una sola transacción = copia coherente
    const data = {} as BackupFile['data'];
    for (const name of STORE_NAMES) data[name] = await reqToPromise(tx.objectStore(name).getAll());
    return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
  });
}

export function backupToJson(b: BackupFile): string {
  return JSON.stringify(b, null, 2);
}

// ---- Validación -------------------------------------------------------------------------

type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const bool = (v: unknown) => typeof v === 'boolean';

/** Campos mínimos imprescindibles por colección (el resto se tolera para admitir versiones futuras). */
const CHECKS: Record<StoreName, (r: Rec) => string | null> = {
  preferences: (r) => (r.id === 'prefs' && str(r.name) ? null : 'preferencias no válidas'),
  principles: (r) => (str(r.name) && str(r.description) ? null : 'principio sin nombre'),
  reflections: (r) => (isDateKey(r.date) && isObj(r.answers) ? null : 'reflexión sin fecha válida'),
  goals: (r) => (str(r.title) && Array.isArray(r.steps) && str(r.status) ? null : 'objetivo no válido'),
  tasks: (r) => (str(r.title) && isDateKey(r.date) && bool(r.done) ? null : 'tarea no válida'),
  habits: (r) => (str(r.name) && Array.isArray(r.days) && r.days.every((d) => num(d)) ? null : 'hábito no válido'),
  habitCompletions: (r) => (str(r.habitId) && isDateKey(r.date) ? null : 'cumplimiento de hábito no válido'),
  attempts: (r) => (str(r.exerciseId) && num(r.total) && num(r.correct) && isDateKey(r.date) ? null : 'intento no válido'),
  sessions: (r) => (isDateKey(r.date) && num(r.durationSec) && str(r.area) ? null : 'sesión no válida'),
  levels: (r) => (num(r.level) && (r.level as number) >= 1 && (r.level as number) <= 5 ? null : 'nivel no válido'),
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  counts: Partial<Record<StoreName, number>>;
}

export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const counts: ValidationResult['counts'] = {};
  if (!isObj(raw)) return { ok: false, errors: ['El archivo no contiene una copia de seguridad válida.'], counts };
  if (raw.app !== BACKUP_APP) errors.push('El archivo no pertenece a Project Lyoko Móvil Beta.');
  if (!num(raw.version) || (raw.version as number) > BACKUP_VERSION) {
    errors.push('La versión de la copia es más reciente que esta aplicación; actualiza antes de importarla.');
  }
  if (!isObj(raw.data)) {
    errors.push('Falta la sección de datos.');
    return { ok: false, errors, counts };
  }
  for (const name of STORE_NAMES) {
    const list = raw.data[name];
    if (list === undefined) continue; // una copia puede omitir colecciones vacías
    if (!Array.isArray(list)) { errors.push(`La colección "${name}" no es una lista.`); continue; }
    const seen = new Set<string>();
    list.forEach((item, i) => {
      if (!isObj(item) || !str(item.id) || !item.id) { errors.push(`${name}[${i}]: falta el identificador.`); return; }
      if (seen.has(item.id)) { errors.push(`${name}[${i}]: identificador repetido.`); return; }
      seen.add(item.id);
      const problem = CHECKS[name](item);
      if (problem) errors.push(`${name}[${i}]: ${problem}.`);
    });
    counts[name] = list.length;
  }
  return { ok: errors.length === 0, errors: errors.slice(0, 8), counts };
}

export function parseBackup(text: string): { backup?: BackupFile; result: ValidationResult } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch {
    return { result: { ok: false, errors: ['El archivo no es un JSON válido.'], counts: {} } };
  }
  const result = validateBackup(raw);
  return { backup: result.ok ? (raw as BackupFile) : undefined, result };
}

// ---- Importación ------------------------------------------------------------------------

export type ImportMode = 'combinar' | 'reemplazar';

/**
 * 'combinar': añade sólo los registros cuyo id no existe; NUNCA sobrescribe lo que ya hay.
 * 'reemplazar': sustituye todo. Ambos modos corren en UNA transacción: si algo falla, no se
 * modifica nada. La validación se hace antes (parseBackup); se repite aquí por seguridad.
 */
export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<{ added: number }> {
  const check = validateBackup(backup);
  if (!check.ok) throw new StorageError('La copia de seguridad no es válida; no se ha modificado nada.');
  return runStorage('importar', async () => {
    const db = await openDb();
    const names = STORE_NAMES.filter((n) => Array.isArray(backup.data[n]));
    const tx = db.transaction(names, 'readwrite');
    const done = txDone(tx);
    let added = 0;
    for (const name of names) {
      const store = tx.objectStore(name);
      const items = backup.data[name];
      if (mode === 'reemplazar') {
        store.clear();
        items.forEach((i) => { store.put(i); added++; });
      } else {
        const keysReq = store.getAllKeys();
        keysReq.onsuccess = () => {
          const existing = new Set(keysReq.result as string[]);
          items.filter((i) => !existing.has(i.id)).forEach((i) => { store.put(i); added++; });
        };
      }
    }
    await done;
    names.forEach(notify);
    return { added };
  });
}

/** Borra todos los datos en una sola transacción. */
export async function deleteAllData(): Promise<void> {
  await runStorage('eliminar', async () => {
    const db = await openDb();
    const tx = db.transaction(STORE_NAMES, 'readwrite');
    STORE_NAMES.forEach((n) => tx.objectStore(n).clear());
    await txDone(tx);
    STORE_NAMES.forEach(notify);
  });
}
