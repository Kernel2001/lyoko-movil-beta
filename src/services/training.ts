import type {
  CognitiveArea, ExerciseAttempt, ExerciseLevel, FocusSelfEvaluation, Level, SessionArea, TrainingSession,
} from '../types';
import { repos } from './storage';
import { accuracy } from './scoring';
import { adapt, defaultExerciseLevel } from './difficulty';
import { exerciseById, exercisesOf, AREAS } from '../data/exercises/catalog';
import { toDateKey } from '../utils/dates';
import { newId, nowISO } from '../utils/misc';

/** Resultado crudo de un intento, producido por cada ejercicio. */
export interface AttemptResult {
  exerciseId: string;
  level: Level;
  total: number;
  correct: number;
  errors: number;
  omissions: number;
  responseMs: number;
  detail: string;
}

export interface BlockPlan {
  exerciseId: string;
}

/**
 * Plan de una sesión: número de bloques según los minutos elegidos (≈ 2 min por bloque) y
 * ejercicios puntuables rotando. Mixta: reparte entre las áreas.
 */
export function buildPlan(area: SessionArea, minutes: number, shuffleOffset = 0): BlockPlan[] {
  const blocks = Math.max(1, Math.round(minutes / 2));
  if (area === 'mixta') {
    // Una por área en rotación para variedad; dentro del área se alterna el ejercicio.
    const plan: BlockPlan[] = [];
    for (let i = 0; i < blocks; i++) {
      const a: CognitiveArea = AREAS[(i + shuffleOffset) % AREAS.length];
      const ex = exercisesOf(a);
      plan.push({ exerciseId: ex[(Math.floor(i / AREAS.length) + shuffleOffset) % ex.length].id });
    }
    return plan;
  }
  const pool = exercisesOf(area);
  // Un caso analítico lleva varios minutos: 1 por sesión (2 en las de 10 min).
  const count = area === 'analitica' ? (minutes >= 10 ? 2 : 1) : blocks;
  return Array.from({ length: count }, (_, i) => ({ exerciseId: pool[(i + shuffleOffset) % pool.length].id }));
}

export async function getExerciseLevel(exerciseId: string, initial: Level): Promise<ExerciseLevel> {
  return (await repos.levels.get(exerciseId)) ?? defaultExerciseLevel(exerciseId, initial);
}

export async function setManualLevel(exerciseId: string, level: Level): Promise<ExerciseLevel> {
  const next: ExerciseLevel = {
    id: exerciseId, level, recent: [], manual: true, updatedAt: nowISO(),
    lastChange: `Nivel ${level} elegido manualmente.`,
  };
  return repos.levels.put(next);
}

export interface SessionInput {
  area: SessionArea;
  startedAt: Date;
  endedAt: Date;
  /** Segundos de actividad real (sin segundo plano). */
  durationSec: number;
  results: AttemptResult[];
}

export interface LevelChange {
  exerciseId: string;
  from: Level;
  to: Level;
  reason: string;
}

/**
 * Registra la sesión y sus intentos, y aplica la regla de dificultad por ejercicio.
 * Todo se guarda antes de actualizar niveles: si algo falla a medias, nunca se pierde el historial.
 */
export async function recordSession(input: SessionInput, initial: Level): Promise<{ session: TrainingSession; changes: LevelChange[] }> {
  const sessionId = newId();
  const date = toDateKey(input.startedAt);
  const createdAt = nowISO();
  const attempts: ExerciseAttempt[] = input.results.map((r) => ({
    id: newId(), sessionId, exerciseId: r.exerciseId, area: exerciseById(r.exerciseId).area, level: r.level, date,
    total: r.total, correct: r.correct, errors: r.errors, omissions: r.omissions,
    responseMs: Math.max(0, Math.round(r.responseMs)), detail: r.detail, createdAt,
  }));
  const total = attempts.reduce((s, a) => s + a.total, 0);
  const correct = attempts.reduce((s, a) => s + a.correct, 0);
  const session: TrainingSession = {
    id: sessionId, kind: 'juegos', area: input.area, date,
    startedAt: input.startedAt.toISOString(), endedAt: input.endedAt.toISOString(),
    durationSec: Math.max(0, Math.round(input.durationSec)), attempts: attempts.length, total, correct,
    accuracy: accuracy(correct, total),
  };
  await repos.sessions.put(session);
  await repos.attempts.putMany(attempts);

  const changes: LevelChange[] = [];
  const byExercise = new Map<string, AttemptResult[]>();
  input.results.forEach((r) => byExercise.set(r.exerciseId, [...(byExercise.get(r.exerciseId) ?? []), r]));
  for (const [exerciseId, list] of byExercise) {
    const acc = accuracy(list.reduce((s, r) => s + r.correct, 0), list.reduce((s, r) => s + r.total, 0));
    if (acc === null) continue;
    const current = await getExerciseLevel(exerciseId, initial);
    const result = adapt(current.level, current.recent, acc);
    await repos.levels.put({ ...current, level: result.level, recent: result.recent, lastChange: result.reason, manual: false, updatedAt: nowISO() });
    if (result.changed) changes.push({ exerciseId, from: current.level, to: result.level, reason: result.reason });
  }
  return { session, changes };
}

/** Sesión de enfoque: no hay puntuación de juego, sólo autoevaluación. */
export async function recordFocusSession(
  input: { startedAt: Date; endedAt: Date; activeSec: number; focus: FocusSelfEvaluation },
): Promise<TrainingSession> {
  const session: TrainingSession = {
    id: newId(), kind: 'enfoque', area: 'concentracion', date: toDateKey(input.startedAt),
    startedAt: input.startedAt.toISOString(), endedAt: input.endedAt.toISOString(),
    durationSec: Math.max(0, Math.round(input.activeSec)), attempts: 0, total: 0, correct: 0, accuracy: null,
    focus: { maintained: input.focus.maintained, distractions: input.focus.distractions.trim() },
  };
  return repos.sessions.put(session);
}
