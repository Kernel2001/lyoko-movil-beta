import type { ExerciseAttempt } from '../types';

/**
 * Escala común: precisión = aciertos / elementos evaluables (0..1).
 * Cada ejercicio define qué es un "elemento" (posición de una secuencia, operación, objetivo…),
 * por eso sólo se compara la precisión entre intentos del MISMO ejercicio o categoría,
 * y siempre acompañada del nivel.
 */
export function accuracy(correct: number, total: number): number | null {
  if (!(total > 0)) return null;
  return Math.min(1, Math.max(0, correct / total));
}

export interface AttemptSummary {
  attempts: number;
  total: number;
  correct: number;
  errors: number;
  omissions: number;
  accuracy: number | null;
  avgResponseMs: number | null;
}

export function summarize(attempts: Pick<ExerciseAttempt, 'total' | 'correct' | 'errors' | 'omissions' | 'responseMs'>[]): AttemptSummary {
  const total = attempts.reduce((s, a) => s + a.total, 0);
  const correct = attempts.reduce((s, a) => s + a.correct, 0);
  return {
    attempts: attempts.length,
    total,
    correct,
    errors: attempts.reduce((s, a) => s + a.errors, 0),
    omissions: attempts.reduce((s, a) => s + a.omissions, 0),
    accuracy: accuracy(correct, total),
    avgResponseMs: attempts.length ? Math.round(attempts.reduce((s, a) => s + a.responseMs, 0) / attempts.length) : null,
  };
}

export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);
export const secs = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);
