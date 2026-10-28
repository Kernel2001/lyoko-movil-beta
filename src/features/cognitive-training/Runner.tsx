import { useEffect, useRef, useState } from 'react';
import type { ExerciseAttempt, Level, SessionArea } from '../../types';
import { Icon, Loading, useUI } from '../../components/ui';
import { buildPlan, getExerciseLevel, recordSession, type AttemptResult, type LevelChange } from '../../services/training';
import { repos } from '../../services/storage';
import { exerciseById, sessionAreaLabel, SCORE_DISCLAIMER, AREA_INFO } from '../../data/exercises/catalog';
import { LEVEL_LABELS } from '../../services/difficulty';
import { pct, secs, summarize } from '../../services/scoring';
import { BLOCKS } from './trials';
import { usePrefs } from '../../app/prefs';

type Stage =
  | { kind: 'loading' }
  | { kind: 'intro'; index: number }
  | { kind: 'block'; index: number }
  | { kind: 'saving' }
  | { kind: 'summary'; results: AttemptResult[]; changes: LevelChange[]; seconds: number };

export function Runner({ area, minutes, onExit }: { area: SessionArea; minutes: number; onExit: () => void }) {
  const { prefs } = usePrefs();
  const { guard, confirm } = useUI();
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [plan] = useState(() => buildPlan(area, minutes, Math.floor(Math.random() * 4)));
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [history, setHistory] = useState<ExerciseAttempt[]>([]);
  const [interruptKey, setInterruptKey] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const exitRef = useRef(onExit);
  exitRef.current = onExit; // onExit cambia en cada render del padre; no debe reiniciar la carga
  const results = useRef<AttemptResult[]>([]);
  const startedAt = useRef(new Date());
  const hiddenMs = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const map: Record<string, Level> = {};
      for (const b of plan) map[b.exerciseId] = (await getExerciseLevel(b.exerciseId, prefs.initialDifficulty)).level;
      setLevels(map);
      setHistory(await repos.attempts.getAll());
      setStage({ kind: 'intro', index: 0 });
    })().catch(async (e) => { await guard(async () => { throw e; }); exitRef.current(); });
  }, [plan, prefs.initialDifficulty, guard]);

  // Segundo plano: no cuenta como tiempo de práctica y el intento en curso se reinicia para que ningún resultado sea engañoso.
  useEffect(() => {
    const on = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current) {
        hiddenMs.current += Date.now() - hiddenAt.current;
        hiddenAt.current = null;
        setInterruptKey((k) => k + 1);
        setInterrupted(true);
      }
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  async function finish(): Promise<void> {
    setStage({ kind: 'saving' });
    const endedAt = new Date();
    const seconds = Math.max(1, (endedAt.getTime() - startedAt.current.getTime() - hiddenMs.current) / 1000);
    let changes: LevelChange[] = [];
    const ok = await guard(async () => {
      const r = await recordSession({ area, startedAt: startedAt.current, endedAt, durationSec: seconds, results: results.current }, prefs.initialDifficulty);
      changes = r.changes;
    });
    if (!ok) { onExit(); return; }
    setStage({ kind: 'summary', results: results.current, changes, seconds });
  }

  async function exit() {
    if (stage.kind === 'summary' || await confirm('Si sales ahora, esta sesión no se guardará.', 'Salir sin guardar')) onExit();
  }

  const header = (
    <div className="session-top">
      <strong>{sessionAreaLabel(area)}</strong>
      <button className="btn small ghost" onClick={exit}><Icon name="x" size={18} /> Salir</button>
    </div>
  );

  if (stage.kind === 'loading' || stage.kind === 'saving') return <>{header}<Loading text={stage.kind === 'saving' ? 'Guardando sesión…' : 'Preparando…'} /></>;

  if (stage.kind === 'intro' || stage.kind === 'block') {
    const block = plan[stage.index];
    const ex = exerciseById(block.exerciseId);
    const level = levels[block.exerciseId];
    const Block = BLOCKS[ex.id];
    return (
      <>
        {header}
        <small className="muted">Bloque {stage.index + 1} de {plan.length}</small>
        {stage.kind === 'intro' ? (
          <div className="card">
            <h2>{ex.name}</h2>
            <span className="tag-level">Nivel {level} · {LEVEL_LABELS[level]}</span>
            <p>{ex.instructions}</p>
            <button className="btn primary hero" onClick={() => { setInterrupted(false); setStage({ kind: 'block', index: stage.index }); }}>Empezar</button>
          </div>
        ) : (
          <>
            {interrupted && <div className="banner warn" role="status">Saliste de la app: el ejercicio en curso se reinició y ese tiempo no cuenta.</div>}
            <Block level={level} history={history} interruptKey={interruptKey}
              onDone={(r) => {
                results.current = [...results.current, ...r];
                if (stage.index + 1 < plan.length) setStage({ kind: 'intro', index: stage.index + 1 }); else void finish();
              }} />
          </>
        )}
      </>
    );
  }

  const s = summarize(stage.results);
  const byExercise = [...new Set(stage.results.map((r) => r.exerciseId))];
  return (
    <>
      {header}
      <div className="card">
        <h2>Sesión completada</h2>
        <div className="grid2">
          <div className="stat"><b>{pct(s.accuracy)}</b><span>Precisión global</span></div>
          <div className="stat"><b>{Math.max(1, Math.round(stage.seconds / 60))} min</b><span>Tiempo de práctica</span></div>
        </div>
        <small>Intentos: {s.attempts} · Aciertos: {s.correct}/{s.total} · Errores: {s.errors} · Omisiones: {s.omissions}</small>
      </div>
      <div className="card">
        <h3>Por ejercicio</h3>
        {byExercise.map((id) => {
          const sub = summarize(stage.results.filter((r) => r.exerciseId === id));
          const lvl = stage.results.find((r) => r.exerciseId === id)!.level;
          return (
            <div key={id} className="item">
              <div className="grow"><div className="title">{exerciseById(id).name}</div><small>{AREA_INFO[exerciseById(id).area].short} · Nivel {lvl} · {secs(sub.avgResponseMs)} por intento</small></div>
              <b>{pct(sub.accuracy)}</b>
            </div>
          );
        })}
      </div>
      <div className="card">
        <h3>Dificultad</h3>
        {stage.changes.length === 0 ? <p>Tu nivel se mantiene: aún no hay suficientes datos o los resultados son irregulares.</p> :
          stage.changes.map((c) => <p key={c.exerciseId}><b>{exerciseById(c.exerciseId).name}:</b> {c.reason}</p>)}
        <small>Puedes cambiar el nivel de cada ejercicio cuando quieras desde su área.</small>
      </div>
      <p className="notice">{SCORE_DISCLAIMER}</p>
      <div className="row gap"><button className="btn grow" onClick={onExit}>Terminar</button></div>
    </>
  );
}
