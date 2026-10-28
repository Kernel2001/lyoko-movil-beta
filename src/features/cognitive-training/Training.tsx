import { useEffect, useState } from 'react';
import type { CognitiveArea, Level, SessionArea } from '../../types';
import { Icon, ProgressBar, Segmented } from '../../components/ui';
import { usePrefs } from '../../app/prefs';
import { useCollection } from '../../hooks/useCollection';
import { AREAS, AREA_INFO, SCORE_DISCLAIMER, exercisesOf, EXERCISES } from '../../data/exercises/catalog';
import { LEVEL_LABELS, MAX_LEVEL, MIN_LEVEL, DOWN_SESSIONS, DOWN_THRESHOLD, UP_SESSIONS, UP_THRESHOLD } from '../../services/difficulty';
import { setManualLevel } from '../../services/training';
import { weeklyProgress } from '../../services/progress';
import { LEVEL_TOPICS } from '../../data/exercises/math';
import { useUI } from '../../components/ui';
import { Runner } from './Runner';
import { FocusTimer } from './FocusTimer';
import { History } from './History';

type View =
  | { kind: 'hub' }
  | { kind: 'area'; area: CognitiveArea }
  | { kind: 'session'; area: SessionArea }
  | { kind: 'focus' }
  | { kind: 'history' };

const MINUTES: (3 | 5 | 10)[] = [3, 5, 10];

function LevelPicker({ exerciseId, name }: { exerciseId: string; name: string }) {
  const levels = useCollection('levels');
  const { prefs } = usePrefs();
  const { guard } = useUI();
  const stored = levels.items.find((l) => l.id === exerciseId);
  const level = stored?.level ?? prefs.initialDifficulty;
  return (
    <div className="stack">
      <div className="row between gap"><b>{name}</b><span className="tag-level">{LEVEL_LABELS[level]}</span></div>
      <div className="days" role="group" aria-label={`Nivel de ${name}`}>
        {Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => (i + 1) as Level).map((l) => (
          <button key={l} className={l === level ? 'on' : ''} aria-pressed={l === level} onClick={() => guard(() => setManualLevel(exerciseId, l), `${name}: nivel ${l}`)}>{l}</button>
        ))}
      </div>
      <small className="muted">{stored?.lastChange ?? 'Nivel inicial elegido en Configuración.'}</small>
      {exerciseId === 'calc' && <small>Nivel {level}: {LEVEL_TOPICS[level]}.</small>}
    </div>
  );
}

function AreaView({ area, onBack, onStart, onFocus, minutes, setMinutes }: {
  area: CognitiveArea; onBack: () => void; onStart: () => void; onFocus: () => void; minutes: 3 | 5 | 10; setMinutes: (m: 3 | 5 | 10) => void;
}) {
  const info = AREA_INFO[area];
  return (
    <>
      <div className="page-head"><button className="btn small ghost" onClick={onBack}><Icon name="back" size={18} /> Entrenar</button></div>
      <h1>{info.label}</h1>
      <p className="muted">{info.blurb}</p>
      <div className="card">
        <b>Duración de la sesión</b>
        <Segmented<string> label="Duración" value={String(minutes)} onChange={(v) => setMinutes(Number(v) as 3 | 5 | 10)} options={MINUTES.map((m) => ({ value: String(m), label: `${m} min` }))} />
        <button className="btn primary hero" onClick={onStart}><Icon name="play" size={20} /> Empezar sesión</button>
        {area === 'concentracion' && <button className="btn" onClick={onFocus}><Icon name="clock" size={20} /> Sesión de enfoque con temporizador</button>}
      </div>
      <div className="card">
        <h2>Ejercicios y dificultad</h2>
        {EXERCISES.filter((e) => e.area === area).map((e) => (
          <div key={e.id} className="stack">
            <p className="muted">{e.description}</p>
            {e.scored ? <LevelPicker exerciseId={e.id} name={e.name} /> : <small>{e.name}: se valora con autoevaluación, no tiene nivel.</small>}
          </div>
        ))}
        <details>
          <summary>¿Cómo cambia la dificultad?</summary>
          <p>Después de cada sesión: si logras al menos {UP_THRESHOLD * 100} % de aciertos en {UP_SESSIONS} sesiones seguidas, subes un nivel. Si haces menos de {DOWN_THRESHOLD * 100} % en {DOWN_SESSIONS} sesiones seguidas, bajas uno. Con resultados irregulares el nivel se mantiene. Siempre puedes fijarlo tú a mano.</p>
        </details>
      </div>
      <p className="notice">{SCORE_DISCLAIMER}</p>
    </>
  );
}

export function Training({ onImmersive }: { onImmersive: (v: boolean) => void }) {
  const { prefs } = usePrefs();
  const sessions = useCollection('sessions');
  const [view, setView] = useState<View>({ kind: 'hub' });
  const [minutes, setMinutes] = useState<3 | 5 | 10>(prefs.sessionMinutes);
  const immersive = view.kind === 'session' || view.kind === 'focus';
  useEffect(() => { onImmersive(immersive); return () => onImmersive(false); }, [immersive, onImmersive]);

  const hub = () => setView({ kind: 'hub' });
  if (view.kind === 'session') return <Runner area={view.area} minutes={minutes} onExit={hub} />;
  if (view.kind === 'focus') return <FocusTimer onExit={hub} />;
  if (view.kind === 'history') return (
    <>
      <div className="page-head"><button className="btn small ghost" onClick={hub}><Icon name="back" size={18} /> Entrenar</button></div>
      <h1>Historial</h1>
      <History />
    </>
  );
  if (view.kind === 'area') {
    return <AreaView area={view.area} minutes={minutes} setMinutes={setMinutes} onBack={hub}
      onStart={() => setView({ kind: 'session', area: view.area })} onFocus={() => setView({ kind: 'focus' })} />;
  }

  const week = weeklyProgress({ tasks: [], habits: [], completions: [], goals: [], sessions: sessions.items });
  return (
    <>
      <div className="page-head"><h1>Entrenamiento cognitivo</h1></div>
      <div className="card">
        <b>Sesión rápida</b>
        <Segmented<string> label="Duración" value={String(minutes)} onChange={(v) => setMinutes(Number(v) as 3 | 5 | 10)} options={MINUTES.map((m) => ({ value: String(m), label: `${m} min` }))} />
        <button className="btn primary hero" onClick={() => setView({ kind: 'session', area: 'mixta' })}><Icon name="play" size={22} /> Sesión mixta</button>
        <small>Objetivo semanal: {week.trainingMinutes} / {prefs.weeklyGoalMinutes} min</small>
        <ProgressBar value={prefs.weeklyGoalMinutes ? week.trainingMinutes / prefs.weeklyGoalMinutes : 0} label="Objetivo semanal de entrenamiento" />
      </div>
      <h2>Áreas</h2>
      <div className="list">
        {AREAS.map((a) => (
          <button key={a} className="card flat option btn" style={{ alignItems: 'flex-start', flexDirection: 'column', textAlign: 'left' }} onClick={() => setView({ kind: 'area', area: a })}>
            <b>{AREA_INFO[a].label}</b>
            <small className="muted">{AREA_INFO[a].blurb} · {exercisesOf(a, false).length} {exercisesOf(a, false).length === 1 ? 'ejercicio' : 'ejercicios'}</small>
          </button>
        ))}
      </div>
      <button className="btn" onClick={() => setView({ kind: 'history' })}><Icon name="chart" size={20} /> Historial cognitivo</button>
      <p className="notice">{SCORE_DISCLAIMER}</p>
    </>
  );
}
