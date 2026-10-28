import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserPreferences } from '../types';
import { DEFAULT_PREFS, loadPreferences, savePreferences } from '../services/preferences';
import { repos, subscribe } from '../services/storage';
import { seedPrinciples } from '../data/seed';
import { Loading } from '../components/ui';
import { messageOf } from '../components/ui';

interface PrefsValue {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => Promise<void>;
}
const PrefsContext = createContext<PrefsValue>(null as never);
export const usePrefs = () => useContext(PrefsContext);

function applyTheme(theme: UserPreferences['theme']) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1220' : '#f4f7fb');
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      let p = await loadPreferences();
      if (!p.seeded) {
        // Primera vez: ejemplos editables de filosofía personal (sólo si no hay ya principios, p. ej. tras importar).
        if ((await repos.principles.getAll()).length === 0) await repos.principles.putMany(seedPrinciples());
        p = await savePreferences({ seeded: true });
      }
      setPrefs(p);
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, []);

  useEffect(() => { load(); return subscribe('preferences', load); }, [load]);
  useEffect(() => {
    applyTheme(prefs?.theme ?? DEFAULT_PREFS.theme);
    if (prefs?.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyTheme('system');
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [prefs?.theme]);

  const update = useCallback(async (patch: Partial<UserPreferences>) => {
    setPrefs(await savePreferences(patch));
  }, []);

  if (error) {
    return (
      <div className="boot-error" role="alert">
        <h1>No se puede abrir el almacenamiento</h1>
        <p>{error}</p>
        <p>Comprueba que no estés en una ventana privada y que el navegador permita guardar datos del sitio.</p>
        <button className="btn primary" onClick={load}>Reintentar</button>
      </div>
    );
  }
  if (!prefs) return <Loading text="Abriendo Project Lyoko…" />;
  return <PrefsContext.Provider value={{ prefs, update }}>{children}</PrefsContext.Provider>;
}
