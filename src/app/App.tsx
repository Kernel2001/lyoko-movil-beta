import { useEffect, useState } from 'react';
import { Icon, UIProvider, useUI } from '../components/ui';
import { PrefsProvider, usePrefs } from './prefs';
import { ROUTES, type Route } from './nav';
import { applyUpdate, dismissPwaNotice, useOnline, usePwaState } from './pwa';
import { Dashboard } from '../features/dashboard/Dashboard';
import { Onboarding } from '../features/dashboard/Onboarding';
import { PersonalDevelopment } from '../features/personal-development/PersonalDevelopment';
import { Organization } from '../features/tasks/Organization';
import { Training } from '../features/cognitive-training/Training';
import { Progress } from '../features/progress/Progress';
import { Settings } from '../features/settings/Settings';
import { repos } from '../services/storage';
import { dueDailyReminder, dueTaskReminders, showNotification } from '../services/notifications/notifications';

const readRoute = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'inicio';
};

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: 'inicio', label: 'Inicio', icon: 'home' },
  { route: 'desarrollo', label: 'Desarrollo', icon: 'compass' },
  { route: 'organizacion', label: 'Organizar', icon: 'tasks' },
  { route: 'entrenar', label: 'Entrenar', icon: 'brain' },
  { route: 'progreso', label: 'Progreso', icon: 'chart' },
];

/** Comprueba cada 30 s los recordatorios mientras la app está abierta (ver limitaciones en Configuración). */
function useReminders() {
  const { prefs } = usePrefs();
  const { toast } = useUI();
  useEffect(() => {
    if (!prefs.remindersEnabled) return;
    const fired = new Set<string>(JSON.parse(localStorage.getItem('lyoko.fired') ?? '[]'));
    const tick = async () => {
      try {
        const due = dueTaskReminders(await repos.tasks.getAll());
        const daily = dueDailyReminder(prefs.dailyReminderTime);
        if (daily) due.push(daily);
        for (const r of due) {
          if (fired.has(r.key)) continue;
          fired.add(r.key);
          localStorage.setItem('lyoko.fired', JSON.stringify([...fired].slice(-200)));
          if (!(await showNotification(r))) toast(`${r.title}: ${r.body}`);
        }
      } catch { /* los recordatorios nunca deben romper la app */ }
    };
    void tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [prefs.remindersEnabled, prefs.dailyReminderTime, toast]);
}

function Shell() {
  const { prefs } = usePrefs();
  const route = useRoute();
  const online = useOnline();
  const pwa = usePwaState();
  const [immersive, setImmersive] = useState(false); // oculta la navegación durante una sesión de entrenamiento
  useReminders();

  if (!prefs.onboarded) return <Onboarding />;

  return (
    <div className={`app ${immersive ? 'immersive' : ''}`}>
      {!online && <div className="banner warn" role="status">Sin conexión: Project Lyoko sigue funcionando y tus datos se guardan en este dispositivo.</div>}
      {pwa.needRefresh && (
        <div className="banner" role="status">
          Hay una versión nueva.
          <button className="link" onClick={() => applyUpdate()}>Actualizar</button>
          <button className="link" onClick={dismissPwaNotice}>Luego</button>
        </div>
      )}
      {pwa.offlineReady && (
        <div className="banner ok" role="status">
          Lista para usarse sin conexión.
          <button className="link" onClick={dismissPwaNotice}>Entendido</button>
        </div>
      )}
      <main className="page" id="main">
        {route === 'inicio' && <Dashboard />}
        {route === 'desarrollo' && <PersonalDevelopment />}
        {route === 'organizacion' && <Organization />}
        {route === 'entrenar' && <Training onImmersive={setImmersive} />}
        {route === 'progreso' && <Progress />}
        {route === 'config' && <Settings />}
      </main>
      {!immersive && (
        <nav className="bottom-nav" aria-label="Navegación principal">
          {NAV.map((n) => (
            <a key={n.route} href={`#/${n.route}`} className={route === n.route ? 'on' : ''} aria-current={route === n.route ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}

export function App() {
  return (
    <UIProvider>
      <PrefsProvider>
        <Shell />
      </PrefsProvider>
    </UIProvider>
  );
}
