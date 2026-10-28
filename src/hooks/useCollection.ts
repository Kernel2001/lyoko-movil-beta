import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribe, type StoreMap, type StoreName } from '../services/storage';
import { repos } from '../services/storage';

/** Carga una colección y la mantiene al día cuando cualquier parte de la app la modifica. */
export function useCollection<K extends StoreName>(name: K) {
  type T = StoreMap[K];
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const all = (await (repos[name] as unknown as { getAll(): Promise<T[]> }).getAll());
      if (alive.current) { setItems(all); setError(null); }
    } catch (e) {
      if (alive.current) setError(e as Error);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    alive.current = true;
    load();
    const off = subscribe(name, load);
    return () => { alive.current = false; off(); };
  }, [name, load]);

  return { items, loading, error, reload: load };
}
