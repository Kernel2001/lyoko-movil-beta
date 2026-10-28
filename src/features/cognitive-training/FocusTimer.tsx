import { useEffect, useRef, useState } from 'react';
import type { FocusSelfEvaluation } from '../../types';
import { Field, Icon, ProgressBar, useUI } from '../../components/ui';
import { recordFocusSession } from '../../services/training';

const OPTIONS = [5, 10, 15, 25];
const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Temporizador basado en marcas de tiempo (no en contar ticks): si la app pasa a segundo plano o el
 * navegador ralentiza los intervalos, el tiempo restante sigue siendo exacto al volver.
 */
export function FocusTimer({ onExit }: { onExit: () => void }) {
  const { guard, confirm } = useUI();
  const [minutes, setMinutes] = useState(10);
  const [phase, setPhase] = useState<'setup' | 'running' | 'paused' | 'review'>('setup');
  const [, force] = useState(0);
  const startedAt = useRef(new Date());
  const endsAt = useRef(0); // instante de fin mientras corre
  const remaining = useRef(0); // ms restantes mientras está en pausa
  const activeMs = useRef(0);
  const [maintained, setMaintained] = useState<FocusSelfEvaluation['maintained']>('si');
  const [distractions, setDistractions] = useState('');

  const total = minutes * 60000;
  const left = phase === 'running' ? endsAt.current - Date.now() : remaining.current;

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      if (Date.now() >= endsAt.current) { activeMs.current = total; setPhase('review'); }
      else force((n) => n + 1);
    }, 250);
    // Al volver a primer plano comprobamos al instante (los intervalos pueden haberse congelado).
    const vis = () => { if (!document.hidden && Date.now() >= endsAt.current) { activeMs.current = total; setPhase('review'); } };
    document.addEventListener('visibilitychange', vis);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [phase, total]);

  const start = () => { startedAt.current = new Date(); remaining.current = total; endsAt.current = Date.now() + total; setPhase('running'); };
  const pause = () => { remaining.current = Math.max(0, endsAt.current - Date.now()); setPhase('paused'); };
  const resume = () => { endsAt.current = Date.now() + remaining.current; setPhase('running'); };
  const end = () => { activeMs.current = total - (phase === 'running' ? Math.max(0, endsAt.current - Date.now()) : remaining.current); setPhase('review'); };

  async function save() {
    const ok = await guard(() => recordFocusSession({
      startedAt: startedAt.current, endedAt: new Date(), activeSec: activeMs.current / 1000, focus: { maintained, distractions },
    }), 'Sesión de enfoque guardada');
    if (ok) onExit();
  }

  if (phase === 'review') return (
    <>
      <div className="card">
        <h2>¿Cómo fue tu enfoque?</h2>
        <p className="muted">Tiempo activo: {Math.round(activeMs.current / 60000 * 10) / 10} min. Esto es una autoevaluación tuya, no una puntuación.</p>
        <Field label="¿Mantuviste el enfoque?">
          <div className="segmented">
            {([['si', 'Sí'], ['parcialmente', 'En parte'], ['no', 'No']] as const).map(([v, l]) => (
              <button key={v} className={maintained === v ? 'on' : ''} aria-pressed={maintained === v} onClick={() => setMaintained(v)}>{l}</button>
            ))}
          </div>
        </Field>
        <Field label="¿Qué distracciones encontraste? (opcional)"><textarea value={distractions} onChange={(e) => setDistractions(e.target.value)} placeholder="Notificaciones, pensamientos, ruido…" /></Field>
        <button className="btn primary hero" onClick={save}>Guardar</button>
        <button className="btn ghost" onClick={async () => { if (await confirm('No se guardará esta sesión.', 'Descartar')) onExit(); }}>Descartar</button>
      </div>
    </>
  );

  return (
    <>
      <div className="session-top"><strong>Sesión de enfoque</strong>
        <button className="btn small ghost" onClick={async () => { if (phase === 'setup' || await confirm('Si sales ahora no se guardará la sesión.', 'Salir')) onExit(); }}><Icon name="x" size={18} /> Salir</button>
      </div>
      <div className="card">
        {phase === 'setup' ? (
          <>
            <p>Elige una duración, trabaja en UNA sola cosa y evita cambiar de tarea. Al terminar valorarás cómo fue.</p>
            <div className="days">{OPTIONS.map((m) => <button key={m} className={minutes === m ? 'on' : ''} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}′</button>)}</div>
            <button className="btn primary hero" onClick={start}><Icon name="play" size={20} /> Empezar {minutes} min</button>
          </>
        ) : (
          <>
            <div className="timer" role="timer" aria-label="Tiempo restante">{fmt(left)}</div>
            <ProgressBar value={1 - left / total} label="Progreso del enfoque" />
            <div className="row gap">
              {phase === 'running'
                ? <button className="btn grow" onClick={pause}><Icon name="pause" size={20} /> Pausar</button>
                : <button className="btn primary grow" onClick={resume}><Icon name="play" size={20} /> Reanudar</button>}
              <button className="btn grow" onClick={end}>Finalizar</button>
            </div>
            <small className="muted">{phase === 'paused' ? 'En pausa.' : 'Puedes cambiar de app: el tiempo sigue contando con precisión.'}</small>
          </>
        )}
      </div>
    </>
  );
}
