import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbForTests } from '../services/storage/db';
import { repos } from '../services/storage';
import { accuracy, summarize } from '../services/scoring';
import { adapt } from '../services/difficulty';
import { buildPlan, getExerciseLevel, recordFocusSession, recordSession, setManualLevel, type AttemptResult } from '../services/training';
import { summarizeProgress, weeklyProgress } from '../services/progress';
import { generateSequence, nextLength, parseSequenceInput, pickWords, scoreRecall, scoreSequence } from '../data/exercises/memory';
import { generateGrid, generateStream, scoreDetection, scoreSelection } from '../data/exercises/attention';
import { PROBLEMS, checkProblem } from '../data/problems/problems';
import { ANALYTIC_CASES, suggestRubric } from '../data/problems/analytic';
import { EXERCISES } from '../data/exercises/catalog';
import { seededRng } from '../utils/misc';
import { toDateKey } from '../utils/dates';
import type { Level } from '../types';

beforeEach(async () => { await resetDbForTests(); });

const result = (over: Partial<AttemptResult> = {}): AttemptResult => ({
  exerciseId: 'calc', level: 1, total: 1, correct: 1, errors: 0, omissions: 0, responseMs: 2000, detail: '', ...over,
});

describe('puntuación', () => {
  it('calcula la precisión y los promedios', () => {
    expect(accuracy(3, 4)).toBe(0.75);
    expect(accuracy(0, 0)).toBeNull();
    const s = summarize([
      { total: 4, correct: 3, errors: 1, omissions: 0, responseMs: 1000 },
      { total: 6, correct: 6, errors: 0, omissions: 0, responseMs: 3000 },
    ]);
    expect(s.accuracy).toBe(0.9);
    expect(s.avgResponseMs).toBe(2000);
    expect(s.errors).toBe(1);
  });
});

describe('dificultad progresiva', () => {
  it('sube tras 3 sesiones seguidas con buenos resultados', () => {
    let r = adapt(2, [], 0.9);
    expect(r.level).toBe(2);
    r = adapt(2, r.recent, 0.95);
    expect(r.level).toBe(2);
    r = adapt(2, r.recent, 1);
    expect(r.level).toBe(3);
    expect(r.changed).toBe(true);
    expect(r.recent).toEqual([]);
    expect(r.reason).toMatch(/Subes al nivel 3/);
  });
  it('baja tras 2 sesiones seguidas con errores y no baja de 1', () => {
    let r = adapt(3, [], 0.3);
    expect(r.level).toBe(3);
    r = adapt(3, r.recent, 0.4);
    expect(r.level).toBe(2);
    expect(adapt(1, [0.2], 0.1).level).toBe(1);
  });
  it('mantiene el nivel con resultados irregulares y explica por qué', () => {
    const r = adapt(3, [0.9, 0.3], 0.95);
    expect(r.level).toBe(3);
    expect(r.changed).toBe(false);
    expect(r.reason).toMatch(/irregulares/);
  });
  it('no sube del nivel máximo', () => {
    expect(adapt(5, [1, 1], 1).level).toBe(5);
  });
});

describe('registro de sesiones', () => {
  it('guarda sesión e intentos con métricas coherentes y registra el nivel', async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 120000);
    const { session } = await recordSession({
      area: 'calculo', startedAt: start, endedAt: end, durationSec: 120,
      results: [result({ total: 1, correct: 1 }), result({ total: 1, correct: 0, errors: 1 }), result({ total: 2, correct: 2 })],
    }, 2);
    expect(session.total).toBe(4);
    expect(session.correct).toBe(3);
    expect(session.accuracy).toBe(0.75);
    expect(session.date).toBe(toDateKey(start));
    expect(await repos.attempts.getAll()).toHaveLength(3);
    expect(await repos.sessions.getAll()).toHaveLength(1);
    const lvl = await getExerciseLevel('calc', 2);
    expect(lvl.level).toBe(2);
    expect(lvl.recent).toEqual([0.75]);
  });

  it('sube de nivel tras tres sesiones excelentes y respeta el nivel manual', async () => {
    for (let i = 0; i < 3; i++) {
      const now = new Date();
      await recordSession({ area: 'calculo', startedAt: now, endedAt: now, durationSec: 60, results: [result({ total: 5, correct: 5 })] }, 1);
    }
    expect((await getExerciseLevel('calc', 1)).level).toBe(2);
    await setManualLevel('calc', 4);
    const l = await getExerciseLevel('calc', 1);
    expect(l.level).toBe(4);
    expect(l.manual).toBe(true);
  });

  it('la sesión de enfoque guarda autoevaluación y no tiene precisión', async () => {
    const now = new Date();
    const s = await recordFocusSession({ startedAt: now, endedAt: now, activeSec: 600, focus: { maintained: 'parcialmente', distractions: ' móvil ' } });
    expect(s.kind).toBe('enfoque');
    expect(s.accuracy).toBeNull();
    expect(s.focus?.distractions).toBe('móvil');
  });

  it('progreso: el estado inicial vacío no inventa datos; con datos suma minutos', async () => {
    const empty = { tasks: [], habits: [], completions: [], sessions: [], goals: [] };
    const sm = summarizeProgress(empty, 7);
    expect(sm.hasData).toBe(false);
    expect(sm.series).toHaveLength(7);
    expect(sm.accuracy).toBeNull();
    const now = new Date();
    await recordSession({ area: 'calculo', startedAt: now, endedAt: now, durationSec: 300, results: [result()] }, 1);
    const sessions = await repos.sessions.getAll();
    const sm2 = summarizeProgress({ ...empty, sessions }, 30);
    expect(sm2.hasData).toBe(true);
    expect(sm2.trainingMinutes).toBe(5);
    expect(weeklyProgress({ ...empty, sessions }).trainingMinutes).toBe(5);
  });

  it('los planes tienen bloques según la duración y sólo ejercicios puntuables', () => {
    expect(buildPlan('mixta', 3)).toHaveLength(2);
    expect(buildPlan('mixta', 10)).toHaveLength(5);
    for (const b of [...buildPlan('mixta', 10), ...buildPlan('concentracion', 10)]) {
      expect(EXERCISES.find((e) => e.id === b.exerciseId)?.scored).toBe(true);
    }
    expect(new Set(buildPlan('mixta', 10).map((b) => b.exerciseId)).size).toBeGreaterThan(3);
  });
});

describe('memoria', () => {
  it('genera secuencias de la longitud pedida sin repetidos consecutivos', () => {
    for (const set of ['numeros', 'letras', 'simbolos'] as const) {
      const s = generateSequence(seededRng(3), 8, set);
      expect(s).toHaveLength(8);
      s.forEach((x, i) => { if (i) expect(x).not.toBe(s[i - 1]); });
    }
  });
  it('valida el orden directo e inverso', () => {
    const seq = ['1', '2', '3', '4'];
    expect(scoreSequence(seq, ['1', '2', '3', '4'])).toEqual({ total: 4, correct: 4, exact: true });
    expect(scoreSequence(seq, ['1', '2', '4', '3']).correct).toBe(2);
    expect(scoreSequence(seq, ['4', '3', '2', '1'], true).exact).toBe(true);
    expect(scoreSequence(seq, ['1', '2', '3', '4'], true).correct).toBe(0);
    expect(scoreSequence(seq, ['1', '2', '3']).exact).toBe(false);
  });
  it('la longitud sube con aciertos y baja con fallos dentro de límites', () => {
    expect(nextLength(4, true)).toBe(5);
    expect(nextLength(4, false)).toBe(3);
    expect(nextLength(2, false)).toBe(2);
    expect(nextLength(12, true)).toBe(12);
  });
  it('interpreta lo que escribe el usuario con o sin separadores', () => {
    expect(parseSequenceInput('4 8-1,2', 'numeros')).toEqual(['4', '8', '1', '2']);
    expect(parseSequenceInput('481', 'numeros')).toEqual(['4', '8', '1']);
    expect(parseSequenceInput('b c', 'letras')).toEqual(['B', 'C']);
  });
  it('puntúa el recuerdo de palabras ignorando tildes, mayúsculas y orden', () => {
    const exp = ['árbol', 'río', 'camión', 'luz'];
    expect(scoreRecall(exp, 'Rio, ARBOL camion perro')).toEqual({ total: 4, correct: 3, intrusions: 1 });
    expect(scoreRecall(exp, '').correct).toBe(0);
    expect(scoreRecall(exp, 'luz luz luz').correct).toBe(1);
    expect(new Set(pickWords(seededRng(1), 9)).size).toBe(9);
  });
});

describe('concentración', () => {
  it('la cuadrícula tiene objetivos que cumplen la condición y puntúa la selección', () => {
    for (let level = 1; level <= 5; level++) {
      const g = generateGrid(level as Level, seededRng(level));
      expect(g.cells).toHaveLength(g.config.cols * g.config.rows);
      expect(g.targets.length).toBeGreaterThanOrEqual(3);
      g.cells.forEach((c, i) => expect(g.config.targetPool.includes(c)).toBe(g.targets.includes(i)));
    }
    expect(scoreSelection([1, 2, 3], [1, 2, 9])).toMatchObject({ hits: 2, errors: 1, omissions: 1, total: 4, correct: 2 });
    expect(scoreSelection([1, 2], [1, 1]).hits).toBe(1); // marcar dos veces la misma casilla no duplica
  });
  it('detección: cuenta aciertos, omisiones y falsas alarmas', () => {
    const st = generateStream(3, seededRng(5));
    expect(st.isTarget.filter(Boolean).length).toBeGreaterThanOrEqual(3);
    st.stimuli.forEach((s, i) => expect(s === st.target).toBe(st.isTarget[i]));
    expect(scoreDetection([true, false, true, false], [true, true, false, false]))
      .toEqual({ hits: 1, omissions: 1, falseAlarms: 1, total: 3, correct: 1 });
    expect(scoreDetection([false, false], [false, false]).total).toBe(0);
  });
});

describe('problemas y análisis', () => {
  it('cada problema tiene respuesta corregible, 3 pistas y explicación', () => {
    expect(PROBLEMS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(PROBLEMS.map((p) => p.category)).size).toBe(7);
    for (const p of PROBLEMS) {
      expect(p.hints.every(Boolean)).toBe(true);
      expect(p.explanation.length).toBeGreaterThan(10);
      if (p.options) {
        expect(p.correct).toBeLessThan(p.options.length);
        expect(checkProblem(p, p.correct!)).toBe(true);
        expect(checkProblem(p, (p.correct! + 1) % p.options.length)).toBe(false);
      } else {
        expect(p.accepted!.length).toBeGreaterThan(0);
        expect(checkProblem(p, p.accepted![0])).toBe(true);
        expect(checkProblem(p, 'respuesta incorrecta zzz')).toBe(false);
      }
    }
  });
  it('acepta variantes de formato numérico y de texto', () => {
    expect(checkProblem(PROBLEMS.find((x) => x.id === 'p06')!, ' 10 ')).toBe(true);
    expect(checkProblem(PROBLEMS.find((x) => x.id === 'p06')!, '10,0')).toBe(true);
    expect(checkProblem(PROBLEMS.find((x) => x.id === 'p12')!, 'O')).toBe(true);
  });
  it('la rúbrica analítica sugiere criterios según la estructura y no puntúa respuestas vacías', () => {
    const c = ANALYTIC_CASES[0];
    const empty = suggestRubric(c, { known: '', asked: '', missing: '', alternatives: '', evidence: '', choice: '', check: '' });
    expect(Object.values(empty).every((v) => !v)).toBe(true);
    const full = suggestRubric(c, {
      known: 'El sueldo sube un 15 % pero el trayecto añade una hora', asked: 'Decidir si acepto',
      missing: 'Cuánto es en euros netos', alternatives: '1) Aceptar\n2) Rechazar',
      evidence: 'Aceptar: el sueldo mejora. Rechazar: pierdo una hora al día.',
      choice: 'Negociar, porque faltan datos clave', check: 'Probar tres meses y revisar mi energía',
    });
    expect(Object.values(full).every(Boolean)).toBe(true);
  });
});
