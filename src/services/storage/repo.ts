import { openDb, reqToPromise, StorageError, txDone, type StoreMap, type StoreName } from './db';

// Mini bus de eventos: la UI se suscribe a una colección y se recarga cuando cambia.
const listeners = new Map<StoreName, Set<() => void>>();

export function subscribe(store: StoreName, cb: () => void): () => void {
  if (!listeners.has(store)) listeners.set(store, new Set());
  listeners.get(store)!.add(cb);
  return () => listeners.get(store)?.delete(cb);
}

export function notify(store: StoreName) {
  listeners.get(store)?.forEach((cb) => cb());
}

async function run<R>(label: string, fn: () => Promise<R>): Promise<R> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof StorageError) throw e;
    const quota = e instanceof DOMException && e.name === 'QuotaExceededError';
    throw new StorageError(
      quota ? 'No queda espacio de almacenamiento en el dispositivo.' : `No se pudo ${label} los datos locales.`,
      e,
    );
  }
}

/**
 * Repositorio genérico sobre un object store. Toda la app accede a los datos por aquí:
 * migrar a una base de datos remota sólo exigiría otra implementación de esta interfaz.
 */
export interface Repo<T extends { id: string }> {
  name: StoreName;
  getAll(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  put(item: T): Promise<T>;
  putMany(items: T[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export function createRepo<K extends StoreName>(name: K): Repo<StoreMap[K]> {
  type T = StoreMap[K];
  return {
    name,
    getAll: () =>
      run('leer', async () => {
        const db = await openDb();
        return reqToPromise(db.transaction(name, 'readonly').objectStore(name).getAll() as IDBRequest<T[]>);
      }),
    get: (id) =>
      run('leer', async () => {
        const db = await openDb();
        return reqToPromise(db.transaction(name, 'readonly').objectStore(name).get(id) as IDBRequest<T | undefined>);
      }),
    put: (item) =>
      run('guardar', async () => {
        const db = await openDb();
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).put(item);
        await txDone(tx);
        notify(name);
        return item;
      }),
    putMany: (items) =>
      run('guardar', async () => {
        const db = await openDb();
        const tx = db.transaction(name, 'readwrite');
        const store = tx.objectStore(name);
        items.forEach((i) => store.put(i));
        await txDone(tx);
        notify(name);
      }),
    remove: (id) =>
      run('eliminar', async () => {
        const db = await openDb();
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).delete(id);
        await txDone(tx);
        notify(name);
      }),
    clear: () =>
      run('eliminar', async () => {
        const db = await openDb();
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).clear();
        await txDone(tx);
        notify(name);
      }),
  };
}

export { run as runStorage };
