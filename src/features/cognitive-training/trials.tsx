import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ExerciseAttempt, Level } from '../../types';
import type { AttemptResult } from '../../services/training';
import { Field, ProgressBar } from '../../components/ui';
import {
  generateSequence, nextLength, pickWords, scoreRecall, scoreSequence, startLength, studyTimeMs,
  SYMBOL_SETS, wordCount, wordDelaySec, wordStudyMs, type SymbolSet,
} from '../../data/exercises/memory';
import { generateGrid, generateStream, scoreDetection, scoreSelection, stimulusMs } from '../../data/exercises/attention';
import { checkMathAnswer, generateMathQuestion, type MathQuestion } from '../../data/exercises/math';
import { PROBLEMS, checkProblem, problemsForLevel, type Problem } from '../../data/problems/problems';
import { ANALYTIC_CASES, RUBRIC, analyticCasesForLevel, suggestRubric, type AnalyticAnswers } from '../../data/problems/analytic';
import { shuffle } from '../../utils/misc';
import { Icon } from '../../components/ui';

export interface BlockProps {
  level: Level;
  history: ExerciseAttempt[];
  interruptKey: number; // cambia cuando la app vuelve de segundo plano: el intento en curso se reinicia
  onDone: (results: AttemptResult[]) => void;
}

/** Ejecuta `count` intentos seguidos; cada uno llama a `finish` al pulsar «Siguiente». */
function Trials({ count, interruptKey, onDone, render }: {
  count: number; interruptKey: number; onDone: (r: AttemptResult[]) => void;
  render: (index: number, finish: (r: AttemptResult) => void) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const results = useRef<AttemptResult[]>([]);
  const finish = (r: AttemptResult) => {
    results.current = [...results.current, r];
    if (index + 1 >= count) onDone(results.current); else setIndex(index + 1);
  };
  return (
    <div className="stack">
      <div className="row between"><small>Ejercicio {index + 1} de {count}</small></div>
      <ProgressBar value={index / count} label="Avance del bloque" />
      <div key={`${index}-${interruptKey}`} className="stack">{render(index, finish)}</div>
    </div>
  );
}

const useStamp = () => useRef(0);

/** Teclado en pantalla: evita que el teclado del móvil tape el ejercicio y permite símbolos. */
function Keypad({ pool, value, onChange }: { pool: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="stack">
      <div className="sym" aria-live="polite" aria-label="Tu respuesta">{value.length ? value.join(' ') : '…'}</div>
      <div className="grid-sel" style={{ gridTemplateColumns: `repeat(${pool.length > 9 ? 6 : 5}, 1fr)` }}>
        {pool.map((s) => <button key={s} type="button" onClick={() => onChange([...value, s])}>{s}</button>)}
        <button type="button" onClick={() => onChange(value.slice(0, -1))} aria-label="Borrar último">⌫</button>
      </div>
    </div>
  );
}

const Next = ({ onClick, label = 'Siguiente' }: { onClick: () => void; label?: string }) => (
  <button className="btn primary hero" onClick={onClick} autoFocus>{label}</button>
);

// ---------------------------------------------------------------- Memoria: secuencias

function SequenceTrial({ length, set, reverse, level, exerciseId, onFinish }: {
  length: number; set: SymbolSet; reverse: boolean; level: Level; exerciseId: string;
  onFinish: (r: AttemptResult, exact: boolean) => void;
}) {
  const seq = useMemo(() => generateSequence(Math.random, length, set), [length, set]);
  const [phase, setPhase] = useState<'show' | 'input' | 'feedback'>('show');
  const [given, setGiven] = useState<string[]>([]);
  const t0 = useStamp();
  const score = useMemo(() => scoreSequence(seq, given, reverse), [seq, given, reverse]);
  const ms = studyTimeMs(length);

  useEffect(() => {
    if (phase !== 'show') return;
    const id = window.setTimeout(() => { t0.current = Date.now(); setPhase('input'); }, ms);
    return () => window.clearTimeout(id);
  }, [phase, ms, t0]);

  const [elapsed, setElapsed] = useState(0);
  const result = (): AttemptResult => ({
    exerciseId, level, total: score.total, correct: score.correct, errors: Math.max(0, given.length - score.correct),
    omissions: Math.max(0, score.total - given.length), responseMs: elapsed, detail: `Longitud ${length}`,
  });
  const expected = reverse ? [...seq].reverse() : seq;

  if (phase === 'show') return (
    <>
      <p>Memoriza la secuencia{reverse ? ' (después la escribirás AL REVÉS)' : ''}.</p>
      <div className="sym" aria-label="Secuencia a memorizar">{seq.join(' ')}</div>
      <ProgressBar value={1} label="Tiempo restante" />
    </>
  );
  if (phase === 'input') return (
    <>
      <p>{reverse ? 'Escríbela en orden inverso.' : 'Escríbela en el mismo orden.'}</p>
      <Keypad pool={SYMBOL_SETS[set]} value={given} onChange={setGiven} />
      <button className="btn primary hero" disabled={given.length === 0} onClick={() => { setElapsed(Date.now() - t0.current); setPhase('feedback'); }}>Comprobar</button>
    </>
  );
  return (
    <>
      <div className={`feedback ${score.exact ? 'ok' : 'bad'}`}>
        <b>{score.exact ? '¡Correcto!' : `${score.correct} de ${score.total} en su sitio`}</b>
        <p>Respuesta esperada: <b>{expected.join(' ')}</b></p>
        <p>Tu respuesta: {given.join(' ') || '—'}</p>
        <small>{score.exact ? 'La próxima secuencia será más larga.' : 'La próxima secuencia será un poco más corta.'}</small>
      </div>
      <Next onClick={() => onFinish(result(), score.exact)} />
    </>
  );
}

export function SequenceBlock({ level, interruptKey, onDone, reverse }: BlockProps & { reverse: boolean }) {
  const len = useRef(startLength(level, reverse));
  const sets: SymbolSet[] = reverse ? ['numeros', 'letras'] : ['numeros', 'letras', 'simbolos'];
  const maxReached = useRef(0);
  return (
    <Trials count={5} interruptKey={interruptKey} onDone={(r) => onDone(r.map((x) => ({ ...x, detail: `${x.detail} (máx. ${maxReached.current})` })))}
      render={(i, finish) => (
        <SequenceTrial length={len.current} set={sets[i % sets.length]} reverse={reverse} level={level} exerciseId={reverse ? 'mem-rev' : 'mem-seq'}
          onFinish={(r, exact) => { if (exact) maxReached.current = Math.max(maxReached.current, len.current); len.current = nextLength(len.current, exact); finish(r); }} />
      )} />
  );
}

// ---------------------------------------------------------------- Memoria: palabras

function WordsTrial({ level, onFinish }: { level: Level; onFinish: (r: AttemptResult) => void }) {
  const words = useMemo(() => pickWords(Math.random, wordCount(level)), [level]);
  const [phase, setPhase] = useState<'show' | 'wait' | 'input' | 'feedback'>('show');
  const [left, setLeft] = useState(wordDelaySec(level));
  const [text, setText] = useState('');
  const t0 = useStamp();
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (phase !== 'show') return;
    const id = window.setTimeout(() => setPhase('wait'), wordStudyMs(words.length));
    return () => window.clearTimeout(id);
  }, [phase, words.length]);
  useEffect(() => {
    if (phase !== 'wait') return;
    const end = Date.now() + wordDelaySec(level) * 1000; // basado en reloj, no en ticks: correcto aunque la pestaña se ralentice
    const id = window.setInterval(() => {
      const rest = Math.ceil((end - Date.now()) / 1000);
      if (rest <= 0) { window.clearInterval(id); t0.current = Date.now(); setPhase('input'); } else setLeft(rest);
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, level, t0]);

  const score = scoreRecall(words, text);
  if (phase === 'show') return (<><p>Memoriza estas {words.length} palabras.</p><div className="wordlist">{words.map((w) => <span key={w}>{w}</span>)}</div><ProgressBar value={1} label="Tiempo" /></>);
  if (phase === 'wait') return (<><p>Ahora espera. Intenta no repetirte las palabras…</p><div className="timer" aria-live="off">{left}</div></>);
  if (phase === 'input') return (
    <>
      <Field label="Escribe las palabras que recuerdes (separadas por espacios o comas)"><textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" /></Field>
      <button className="btn primary hero" onClick={() => { setMs(Date.now() - t0.current); setPhase('feedback'); }}>Comprobar</button>
    </>
  );
  return (
    <>
      <div className={`feedback ${score.correct === score.total ? 'ok' : 'bad'}`}>
        <b>Recordaste {score.correct} de {score.total}</b>
        <p>Lista: {words.join(', ')}</p>
        {score.intrusions > 0 && <small>Palabras que no estaban en la lista: {score.intrusions}</small>}
      </div>
      <Next onClick={() => onFinish({ exerciseId: 'mem-words', level, total: score.total, correct: score.correct, errors: score.intrusions, omissions: score.total - score.correct, responseMs: ms, detail: `${score.total} palabras` })} />
    </>
  );
}

export function WordsBlock({ level, interruptKey, onDone }: BlockProps) {
  return <Trials count={2} interruptKey={interruptKey} onDone={onDone} render={(_, finish) => <WordsTrial level={level} onFinish={finish} />} />;
}

// ---------------------------------------------------------------- Concentración: cuadrícula

function SelectTrial({ level, onFinish }: { level: Level; onFinish: (r: AttemptResult) => void }) {
  const grid = useMemo(() => generateGrid(level, Math.random), [level]);
  const [sel, setSel] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const t0 = useRef(Date.now());
  const [ms, setMs] = useState(0);
  const score = scoreSelection(grid.targets, sel);
  const toggle = (i: number) => !checked && setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  return (
    <>
      <p>Toca <b>{grid.config.label}</b>. Hay {grid.targets.length} en total.</p>
      <div className="grid-sel" style={{ gridTemplateColumns: `repeat(${grid.config.cols}, 1fr)` }}>
        {grid.cells.map((c, i) => {
          const isT = grid.targets.includes(i), on = sel.includes(i);
          const style = checked ? { borderColor: isT ? 'var(--ok)' : on ? 'var(--danger)' : undefined, background: isT && on ? 'var(--ok)' : on ? 'var(--danger)' : undefined, color: on ? '#04130d' : undefined } : undefined;
          return <button key={i} className={on && !checked ? 'on' : ''} style={style} aria-pressed={on} onClick={() => toggle(i)}>{c}</button>;
        })}
      </div>
      {!checked ? (
        <button className="btn primary hero" onClick={() => { setMs(Date.now() - t0.current); setChecked(true); }}>Listo ({sel.length} marcadas)</button>
      ) : (
        <>
          <div className={`feedback ${score.errors === 0 && score.omissions === 0 ? 'ok' : 'bad'}`}>
            <b>{score.hits} de {grid.targets.length} encontrados · {score.errors} errores</b>
            <small> · {(ms / 1000).toFixed(1)} s</small>
            <p><small>Verde: objetivos. Rojo: marcadas por error. Contorno verde sin relleno: se te escapó.</small></p>
          </div>
          <Next onClick={() => onFinish({ exerciseId: 'foc-select', level, total: score.total, correct: score.correct, errors: score.errors, omissions: score.omissions, responseMs: ms, detail: grid.config.label })} />
        </>
      )}
    </>
  );
}

export function SelectBlock({ level, interruptKey, onDone }: BlockProps) {
  return <Trials count={4} interruptKey={interruptKey} onDone={onDone} render={(_, finish) => <SelectTrial level={level} onFinish={finish} />} />;
}

// ---------------------------------------------------------------- Concentración: detección

function TargetTrial({ level, onFinish }: { level: Level; onFinish: (r: AttemptResult) => void }) {
  const stream = useMemo(() => generateStream(level, Math.random), [level]);
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const [shown, setShown] = useState<{ i: number; visible: boolean }>({ i: -1, visible: false });
  const responded = useRef<boolean[]>(stream.stimuli.map(() => false));
  const reactions = useRef<number[]>([]);
  const onset = useRef(0);
  const cur = useRef(-1);
  const score = useMemo(() => (phase === 'done' ? scoreDetection(stream.isTarget, responded.current) : null), [phase, stream]);

  useEffect(() => {
    if (phase !== 'run') return;
    const ms = stimulusMs(level);
    const timers: number[] = [];
    stream.stimuli.forEach((_, i) => {
      timers.push(window.setTimeout(() => { cur.current = i; onset.current = Date.now(); setShown({ i, visible: true }); }, i * (ms + 300)));
      timers.push(window.setTimeout(() => setShown({ i, visible: false }), i * (ms + 300) + ms)); // el hueco sigue contando para i
    });
    timers.push(window.setTimeout(() => setPhase('done'), stream.stimuli.length * (ms + 300) + 200));
    return () => timers.forEach(window.clearTimeout);
  }, [phase, level, stream]);

  const press = () => {
    const i = cur.current;
    if (i < 0 || responded.current[i]) return;
    responded.current[i] = true;
    if (stream.isTarget[i]) reactions.current.push(Date.now() - onset.current);
  };

  if (phase === 'ready') return (
    <>
      <p>Pulsa el botón SOLO cuando veas este símbolo:</p>
      <div className="stimulus" aria-label="Símbolo objetivo">{stream.target}</div>
      <p className="muted">Aparecerán {stream.stimuli.length} símbolos seguidos. Si cambias de aplicación, el ejercicio se reinicia.</p>
      <button className="btn primary hero" onClick={() => setPhase('run')}>Empezar</button>
    </>
  );
  if (phase === 'run') return (
    <>
      <small>Objetivo: <b>{stream.target}</b></small>
      <div className="stimulus" aria-live="off">{shown.visible ? stream.stimuli[shown.i] : ''}</div>
      <button className="btn primary hero" style={{ minHeight: 96 }} onPointerDown={press} onClick={press}>¡Objetivo!</button>
    </>
  );
  const s = score!;
  const avg = reactions.current.length ? Math.round(reactions.current.reduce((a, b) => a + b, 0) / reactions.current.length) : 0;
  return (
    <>
      <div className={`feedback ${s.omissions === 0 && s.falseAlarms === 0 ? 'ok' : 'bad'}`}>
        <b>Aciertos {s.hits} · Omisiones {s.omissions} · Falsas alarmas {s.falseAlarms}</b>
        {avg > 0 && <p><small>Tiempo de reacción medio: {avg} ms</small></p>}
      </div>
      <Next onClick={() => onFinish({ exerciseId: 'foc-target', level, total: s.total, correct: s.correct, errors: s.falseAlarms, omissions: s.omissions, responseMs: avg, detail: `Objetivo ${stream.target}` })} />
    </>
  );
}

export function TargetBlock({ level, interruptKey, onDone }: BlockProps) {
  return <Trials count={2} interruptKey={interruptKey} onDone={onDone} render={(_, finish) => <TargetTrial level={level} onFinish={finish} />} />;
}

// ---------------------------------------------------------------- Cálculo mental

function CalcTrial({ level, onFinish }: { level: Level; onFinish: (r: AttemptResult) => void }) {
  const q: MathQuestion = useMemo(() => generateMathQuestion(level, Math.random), [level]);
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [answered, setAnswered] = useState<null | { ok: boolean; ms: number }>(null);
  const t0 = useRef(Date.now());

  const submit = (given: string | number) => {
    if (answered) return;
    setAnswered({ ok: checkMathAnswer(q, given), ms: Date.now() - t0.current });
  };
  const canSubmit = q.choices ? choice !== null : value.trim().length > 0;

  return (
    <>
      <div className="sym" style={{ fontSize: q.prompt.length > 24 ? '1.2rem' : '2rem', letterSpacing: 'normal' }}>{q.prompt}</div>
      {!answered && (q.choices ? (
        <div className="stack">{q.choices.map((c, i) => <button key={c} className={`btn option ${choice === i ? 'primary' : ''}`} onClick={() => { setChoice(i); submit(i); }}>{c}</button>)}</div>
      ) : (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (canSubmit) submit(value); }}>
          <input className="big-input" value={value} onChange={(e) => setValue(e.target.value)} inputMode={level >= 3 ? 'text' : 'numeric'} autoFocus
            autoComplete="off" aria-label="Tu respuesta" placeholder="Respuesta" />
          <button className="btn primary hero" type="submit" disabled={!canSubmit}>Responder</button>
        </form>
      ))}
      {answered && (
        <>
          <div className={`feedback ${answered.ok ? 'ok' : 'bad'}`}>
            <b>{answered.ok ? '¡Correcto!' : `Incorrecto. La respuesta es ${q.display}`}</b>
            <small> · {(answered.ms / 1000).toFixed(1)} s</small>
            <ol className="steps">{q.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
          <Next onClick={() => onFinish({ exerciseId: 'calc', level, total: 1, correct: answered.ok ? 1 : 0, errors: answered.ok ? 0 : 1, omissions: 0, responseMs: answered.ms, detail: q.kind })} />
        </>
      )}
    </>
  );
}

export function CalcBlock({ level, interruptKey, onDone }: BlockProps) {
  return <Trials count={8} interruptKey={interruptKey} onDone={onDone} render={(_, finish) => <CalcTrial level={level} onFinish={finish} />} />;
}

// ---------------------------------------------------------------- Resolución de problemas

function ProblemTrial({ problem, level, onFinish }: { problem: Problem; level: Level; onFinish: (r: AttemptResult) => void }) {
  const [hints, setHints] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<null | { ok: boolean; given: boolean; ms: number }>(null);
  const t0 = useRef(Date.now());
  const answer = (given: string | number) => {
    if (result) return;
    setResult({ ok: checkProblem(problem, given), given: true, ms: Date.now() - t0.current });
  };
  return (
    <>
      <div className="row gap wrap"><span className="chip">{problem.category}</span><span className="tag-level">Dificultad {problem.difficulty}</span></div>
      <div className="card flat">
        <p>{problem.statement}</p>
        {problem.info.length > 0 && <ul className="steps">{problem.info.map((i) => <li key={i}>{i}</li>)}</ul>}
        <b>{problem.question}</b>
      </div>
      {!result && (
        <>
          {problem.options ? (
            <div className="stack">{problem.options.map((o, i) => <button key={o} className="btn option" onClick={() => answer(i)}>{o}</button>)}</div>
          ) : (
            <form className="stack" onSubmit={(e) => { e.preventDefault(); if (value.trim()) answer(value); }}>
              <input className="big-input" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" aria-label="Tu respuesta" placeholder="Tu respuesta" />
              <button className="btn primary hero" type="submit" disabled={!value.trim()}>Responder</button>
            </form>
          )}
          {hints > 0 && <div className="stack">{problem.hints.slice(0, hints).map((h, i) => <div key={i} className="feedback"><small>Pista {i + 1}</small><br />{h}</div>)}</div>}
          <div className="row gap">
            {hints < 3 && <button className="btn" onClick={() => setHints(hints + 1)}><Icon name="bulb" size={18} /> Pista ({hints}/3)</button>}
            {hints >= 3 && <button className="btn ghost" onClick={() => setResult({ ok: false, given: false, ms: Date.now() - t0.current })}>Ver solución</button>}
          </div>
        </>
      )}
      {result && (
        <>
          <div className={`feedback ${result.ok ? 'ok' : 'bad'}`}>
            <b>{result.ok ? '¡Correcto!' : result.given ? 'No es esa.' : 'Solución revelada.'}</b>
            <p><b>Solución: </b>{problem.options ? problem.options[problem.correct!] : problem.accepted![0]}</p>
            <p>{problem.explanation}</p>
            {hints > 0 && <small>Pistas usadas: {hints}</small>}
          </div>
          <Next onClick={() => onFinish({ exerciseId: 'prob', level, total: 1, correct: result.ok ? 1 : 0, errors: result.given && !result.ok ? 1 : 0, omissions: result.given ? 0 : 1, responseMs: result.ms, detail: `${problem.id}|pistas ${hints}` })} />
        </>
      )}
    </>
  );
}

export function ProblemBlock({ level, history, interruptKey, onDone }: BlockProps) {
  const chosen = useMemo(() => {
    const seen = new Set(history.filter((a) => a.exerciseId === 'prob').map((a) => a.detail.split('|')[0]));
    const pool = problemsForLevel(level);
    const fresh = shuffle(Math.random, pool.filter((p) => !seen.has(p.id)));
    const old = shuffle(Math.random, pool.filter((p) => seen.has(p.id)));
    const picked = [...fresh, ...old, ...shuffle(Math.random, PROBLEMS)].filter((p, i, a) => a.indexOf(p) === i);
    return picked.slice(0, 3);
  }, [level, history]);
  return <Trials count={chosen.length} interruptKey={interruptKey} onDone={onDone} render={(i, finish) => <ProblemTrial problem={chosen[i]} level={level} onFinish={finish} />} />;
}

// ---------------------------------------------------------------- Capacidad analítica

const STEPS: { key: keyof AnalyticAnswers; q: string; hint: string }[] = [
  { key: 'known', q: '1. ¿Qué sé?', hint: 'Datos y hechos del caso.' },
  { key: 'asked', q: '2. ¿Qué me piden?', hint: 'La pregunta, con tus palabras.' },
  { key: 'missing', q: '3. ¿Qué información me falta? ¿Qué supuestos hago?', hint: 'Lo que necesitarías averiguar.' },
  { key: 'alternatives', q: '4. ¿Qué posibles explicaciones o soluciones existen?', hint: 'Al menos dos; una por línea.' },
  { key: 'evidence', q: '5. ¿Qué argumentos o pruebas apoyan cada opción?', hint: 'Usa datos concretos del caso.' },
  { key: 'choice', q: '6. ¿Cuál elegiría y por qué?', hint: 'Incluye el «porque…».' },
  { key: 'check', q: '7. ¿Cómo comprobaría mi conclusión?', hint: 'Qué resultado observable la confirmaría o la refutaría.' },
];

function AnalyticTrial({ level, history, onFinish }: { level: Level; history: ExerciseAttempt[]; onFinish: (r: AttemptResult) => void }) {
  const c = useMemo(() => {
    const seen = new Set(history.filter((a) => a.exerciseId === 'ana').map((a) => a.detail.split('|')[0]));
    const pool = analyticCasesForLevel(level);
    const fresh = pool.filter((p) => !seen.has(p.id));
    const base = fresh.length ? fresh : pool.length ? pool : ANALYTIC_CASES;
    return base[Math.floor(Math.random() * base.length)];
  }, [level, history]);
  const [a, setA] = useState<AnalyticAnswers>({ known: '', asked: '', missing: '', alternatives: '', evidence: '', choice: '', check: '' });
  const [stage, setStage] = useState<'write' | 'review'>('write');
  const [rubric, setRubric] = useState<Record<string, boolean>>({});
  const t0 = useRef(Date.now());
  const [ms, setMs] = useState(0);
  const filled = Object.values(a).filter((v) => v.trim()).length;
  const score = RUBRIC.filter((r) => rubric[r.id]).length;

  if (stage === 'write') return (
    <>
      <div className="row gap wrap"><span className="chip">{c.kind}</span><span className="tag-level">Dificultad {c.difficulty}</span></div>
      <div className="card flat">
        <h3>{c.title}</h3>
        <p>{c.scenario}</p>
        <ul className="steps">{c.facts.map((f) => <li key={f}>{f}</li>)}</ul>
        <b>{c.question}</b>
      </div>
      <details><summary>Criterios de evaluación</summary>
        <ul className="steps">{RUBRIC.map((r) => <li key={r.id}><b>{r.label}.</b> <small>{r.hint}</small></li>)}</ul>
        <small>No hay una única respuesta correcta: se valora tu razonamiento, no que coincidas con el modelo.</small>
      </details>
      {STEPS.map((s) => (
        <Field key={s.key} label={s.q} hint={s.hint}>
          <textarea value={a[s.key]} onChange={(e) => setA((x) => ({ ...x, [s.key]: e.target.value }))} />
        </Field>
      ))}
      <button className="btn primary hero" disabled={filled < 3}
        onClick={() => { setMs(Date.now() - t0.current); setRubric(suggestRubric(c, a)); setStage('review'); }}>
        Comparar con el modelo
      </button>
      {filled < 3 && <small className="muted">Rellena al menos 3 pasos para continuar.</small>}
    </>
  );
  return (
    <>
      <h3>Respuesta modelo: {c.title}</h3>
      <p className="notice">Es UNA forma razonable de resolverlo, no la única. Compara el método, no sólo la conclusión.</p>
      {STEPS.map((s, i) => (
        <div key={s.key} className="card flat">
          <b>{s.q}</b>
          <small>Tu respuesta:</small>
          <p>{a[s.key].trim() || <i className="muted">(vacío)</i>}</p>
          <small>Modelo:</small>
          <p>{Object.values(c.model)[i]}</p>
        </div>
      ))}
      <div className="card">
        <h3>Autoevaluación</h3>
        <small>Marcamos por ti lo que se ve en tu estructura; corrígelo con honestidad.</small>
        {RUBRIC.map((r) => (
          <label key={r.id} className="row gap"><input type="checkbox" checked={!!rubric[r.id]} onChange={(e) => setRubric((x) => ({ ...x, [r.id]: e.target.checked }))} /><span>{r.label}</span></label>
        ))}
        <b>{score} de {RUBRIC.length} criterios</b>
      </div>
      <Next label="Terminar" onClick={() => onFinish({ exerciseId: 'ana', level, total: RUBRIC.length, correct: score, errors: 0, omissions: RUBRIC.length - score, responseMs: ms, detail: `${c.id}|${c.title}` })} />
    </>
  );
}

export function AnalyticBlock({ level, history, interruptKey, onDone }: BlockProps) {
  return <Trials count={1} interruptKey={interruptKey} onDone={onDone} render={(_, finish) => <AnalyticTrial level={level} history={history} onFinish={finish} />} />;
}

export const BLOCKS: Record<string, (p: BlockProps) => ReactNode> = {
  'mem-seq': (p) => <SequenceBlock {...p} reverse={false} />,
  'mem-rev': (p) => <SequenceBlock {...p} reverse />,
  'mem-words': (p) => <WordsBlock {...p} />,
  'foc-select': (p) => <SelectBlock {...p} />,
  'foc-target': (p) => <TargetBlock {...p} />,
  calc: (p) => <CalcBlock {...p} />,
  prob: (p) => <ProblemBlock {...p} />,
  ana: (p) => <AnalyticBlock {...p} />,
};
