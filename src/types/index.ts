// Modelo de datos. Convenciones:
//  - `id`: UUID estable. `createdAt`/`updatedAt`: ISO 8601 UTC (instante).
//  - `date`: clave de día LOCAL "YYYY-MM-DD" (lo que el usuario percibe como "hoy"), nunca UTC.

export type DateKey = string;
export type ISODateTime = string;

export type Theme = 'dark' | 'light' | 'system';
export type Level = 1 | 2 | 3 | 4 | 5;
export type Priority = 'alta' | 'media' | 'baja';

export interface UserPreferences {
  id: 'prefs';
  name: string;
  mainObjective: string;
  theme: Theme;
  initialDifficulty: Level;
  sessionMinutes: 3 | 5 | 10;
  weeklyGoalMinutes: number;
  remindersEnabled: boolean;
  dailyReminderTime: string; // "HH:MM" o "" si no hay recordatorio diario
  onboarded: boolean;
  seeded: boolean;
  updatedAt: ISODateTime;
}

export interface PersonalPrinciple {
  id: string;
  kind: 'principio' | 'valor';
  name: string;
  description: string;
  why: string;
  how: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ReflectionAnswers {
  wellDone: string;
  improve: string;
  learned: string;
  decision: string;
  tomorrow: string;
}

export interface PersonalReflection {
  id: string;
  kind: 'diario' | 'nota';
  date: DateKey;
  title: string; // sólo para notas libres
  answers: ReflectionAnswers;
  text: string; // texto libre (notas de filosofía)
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type GoalStatus = 'activo' | 'pausado' | 'completado';

export interface GoalStep {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: DateKey | '';
  priority: Priority;
  status: GoalStatus;
  nextAction: string;
  steps: GoalStep[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: DateKey;
  time: string; // "HH:MM" o ""
  priority: Priority;
  category: string;
  done: boolean;
  completedAt: ISODateTime | '';
  reminder: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Habit {
  id: string;
  name: string;
  days: number[]; // 0 = domingo … 6 = sábado (Date.getDay)
  archived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface HabitCompletion {
  id: string; // `${habitId}_${date}`: único por hábito y día
  habitId: string;
  date: DateKey;
  completedAt: ISODateTime;
}

// ---- Entrenamiento cognitivo ----

export type CognitiveArea = 'memoria' | 'concentracion' | 'calculo' | 'problemas' | 'analitica';
export type SessionArea = CognitiveArea | 'mixta';

export interface CognitiveExercise {
  id: string;
  area: CognitiveArea;
  name: string;
  description: string;
  instructions: string;
  /** false para la sesión de enfoque: no es un juego puntuable, es autoevaluación. */
  scored: boolean;
}

/**
 * Un intento = una unidad puntuable (una secuencia, una cuadrícula, una operación…).
 * Escala común: precisión = correct / total, donde `total` es el nº de elementos evaluables
 * y `correct` los acertados (ver services/scoring.ts).
 */
export interface ExerciseAttempt {
  id: string;
  sessionId: string;
  exerciseId: string;
  area: CognitiveArea;
  level: Level;
  date: DateKey;
  total: number;
  correct: number;
  errors: number; // respuestas erróneas / falsas alarmas / intrusiones
  omissions: number; // elementos no respondidos u omitidos
  responseMs: number; // tiempo de resolución
  detail: string; // referencia legible: problema, longitud alcanzada…
  createdAt: ISODateTime;
}

export interface FocusSelfEvaluation {
  maintained: 'si' | 'parcialmente' | 'no';
  distractions: string;
}

export interface TrainingSession {
  id: string;
  kind: 'juegos' | 'enfoque';
  area: SessionArea;
  date: DateKey;
  startedAt: ISODateTime;
  endedAt: ISODateTime;
  durationSec: number; // tiempo activo (sin segundo plano ni pausas)
  attempts: number;
  total: number;
  correct: number;
  accuracy: number | null; // null si no hubo elementos puntuables (p. ej. enfoque)
  focus?: FocusSelfEvaluation;
}

/** Nivel actual por ejercicio + datos de la regla de adaptación (ver services/difficulty.ts). */
export interface ExerciseLevel {
  id: string; // exerciseId
  level: Level;
  recent: number[]; // precisiones de las últimas sesiones a este nivel
  lastChange: string; // explicación en español del último cambio
  manual: boolean;
  updatedAt: ISODateTime;
}

export interface WeeklyProgress {
  weekStart: DateKey; // lunes
  trainingMinutes: number;
  sessions: number;
  accuracy: number | null;
  tasksCompleted: number;
  habitsCompleted: number;
}
