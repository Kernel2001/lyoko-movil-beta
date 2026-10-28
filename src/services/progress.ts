import type { DateKey, ExerciseAttempt, Goal, Habit, HabitCompletion, Task, TrainingSession, WeeklyProgress } from '../types';
import { addDays, lastDays, startOfWeek, toDateKey } from '../utils/dates';
import { accuracy } from './scoring';
import { habitsForDay } from './habits';

export interface ProgressData {
  tasks: Task[];
  habits: Habit[];
  completions: HabitCompletion[];
  sessions: TrainingSession[];
  goals: Goal[];
}

export interface DayPoint {
  date: DateKey;
  minutes: number;
  tasks: number;
  habits: number;
}

export interface ProgressSummary {
  days: number;
  hasData: boolean;
  tasksCompleted: number;
  habitsCompleted: number;
  habitsExpected: number;
  sessions: number;
  trainingMinutes: number;
  accuracy: number | null;
  activeGoals: number;
  series: DayPoint[];
}

const dateOfISO = (iso: string) => toDateKey(new Date(iso));

/** Resumen de los últimos `days` días (incluido hoy). Sin datos → ceros y `hasData: false`; nunca se inventa nada. */
export function summarizeProgress(d: ProgressData, days: number, today: DateKey = toDateKey()): ProgressSummary {
  const range = lastDays(days, today);
  const set = new Set(range);
  const doneTasks = d.tasks.filter((t) => t.done && t.completedAt && set.has(dateOfISO(t.completedAt)));
  const sessions = d.sessions.filter((s) => set.has(s.date));
  const comps = d.completions.filter((c) => set.has(c.date));
  const gameSessions = sessions.filter((s) => s.kind === 'juegos');

  const series: DayPoint[] = range.map((date) => ({
    date,
    minutes: Math.round(sessions.filter((s) => s.date === date).reduce((a, s) => a + s.durationSec, 0) / 60),
    tasks: doneTasks.filter((t) => dateOfISO(t.completedAt) === date).length,
    habits: comps.filter((c) => c.date === date).length,
  }));

  const habitsExpected = range.reduce((n, date) => n + habitsForDay(d.habits, date).length, 0);
  const total = gameSessions.reduce((s, x) => s + x.total, 0);
  const correct = gameSessions.reduce((s, x) => s + x.correct, 0);
  const trainingMinutes = Math.round(sessions.reduce((a, s) => a + s.durationSec, 0) / 60);

  return {
    days,
    hasData: doneTasks.length + comps.length + sessions.length > 0,
    tasksCompleted: doneTasks.length,
    habitsCompleted: comps.length,
    habitsExpected,
    sessions: sessions.length,
    trainingMinutes,
    accuracy: accuracy(correct, total),
    activeGoals: d.goals.filter((g) => g.status === 'activo').length,
    series,
  };
}

export function weeklyProgress(d: ProgressData, today: DateKey = toDateKey()): WeeklyProgress {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const inWeek = (k: DateKey) => k >= weekStart && k <= weekEnd;
  const sessions = d.sessions.filter((s) => inWeek(s.date));
  const game = sessions.filter((s) => s.kind === 'juegos');
  return {
    weekStart,
    trainingMinutes: Math.round(sessions.reduce((a, s) => a + s.durationSec, 0) / 60),
    sessions: sessions.length,
    accuracy: accuracy(game.reduce((s, x) => s + x.correct, 0), game.reduce((s, x) => s + x.total, 0)),
    tasksCompleted: d.tasks.filter((t) => t.done && t.completedAt && inWeek(dateOfISO(t.completedAt))).length,
    habitsCompleted: d.completions.filter((c) => inWeek(c.date)).length,
  };
}

/** Precisión por área y por ejercicio (cada una en su propia escala: no se mezclan ejercicios). */
export function attemptsByExercise(attempts: ExerciseAttempt[]) {
  const map = new Map<string, ExerciseAttempt[]>();
  attempts.forEach((a) => map.set(a.exerciseId, [...(map.get(a.exerciseId) ?? []), a]));
  return map;
}
