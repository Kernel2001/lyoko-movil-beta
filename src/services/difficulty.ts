import type { ExerciseLevel, Level } from '../types';
import { clamp } from '../utils/misc';

export const MIN_LEVEL: Level = 1;
export const MAX_LEVEL: Level = 5;

/** Umbrales de la regla (documentados en la app para que el usuario sepa por qué cambia el nivel). */
export const UP_THRESHOLD = 0.85; // 3 sesiones seguidas con ≥ 85 % → sube
export const UP_SESSIONS = 3;
export const DOWN_THRESHOLD = 0.5; // 2 sesiones seguidas con < 50 % → baja
export const DOWN_SESSIONS = 2;

export interface Adaptation {
  level: Level;
  recent: number[];
  reason: string;
  changed: boolean;
}

/**
 * Regla simple y transparente, aplicada tras cada sesión con un ejercicio:
 *  - 3 sesiones seguidas a este nivel con ≥ 85 % de precisión → sube un nivel.
 *  - 2 sesiones seguidas con < 50 % → baja un nivel.
 *  - Cualquier otro caso (resultados irregulares o pocos datos) → mantiene el nivel y sigue recogiendo datos.
 * `recent` contiene las precisiones sólo del nivel actual; se reinicia al cambiar de nivel.
 */
export function adapt(level: Level, recent: number[], newAccuracy: number): Adaptation {
  const history = [...recent, newAccuracy];
  const lastUp = history.slice(-UP_SESSIONS);
  const lastDown = history.slice(-DOWN_SESSIONS);

  if (lastUp.length === UP_SESSIONS && lastUp.every((a) => a >= UP_THRESHOLD)) {
    if (level < MAX_LEVEL) {
      return { level: (level + 1) as Level, recent: [], changed: true, reason: `Subes al nivel ${level + 1}: ${UP_SESSIONS} sesiones seguidas con al menos ${UP_THRESHOLD * 100} % de aciertos.` };
    }
    return { level, recent: history.slice(-UP_SESSIONS), changed: false, reason: 'Ya estás en el nivel máximo con buenos resultados.' };
  }
  if (lastDown.length === DOWN_SESSIONS && lastDown.every((a) => a < DOWN_THRESHOLD)) {
    if (level > MIN_LEVEL) {
      return { level: (level - 1) as Level, recent: [], changed: true, reason: `Bajas al nivel ${level - 1}: ${DOWN_SESSIONS} sesiones seguidas con menos de ${DOWN_THRESHOLD * 100} % de aciertos. Puedes volver a subirlo cuando quieras.` };
    }
    return { level, recent: history.slice(-UP_SESSIONS), changed: false, reason: 'Estás en el nivel más bajo; sigue practicando con calma.' };
  }
  const needed = history.length < UP_SESSIONS ? ' Se necesitan más sesiones para decidir.' : '';
  return {
    level,
    recent: history.slice(-UP_SESSIONS),
    changed: false,
    reason: `Se mantiene el nivel ${level}: resultados irregulares o insuficientes.${needed}`,
  };
}

export function defaultExerciseLevel(exerciseId: string, initial: Level): ExerciseLevel {
  return { id: exerciseId, level: initial, recent: [], lastChange: 'Nivel inicial elegido en Configuración.', manual: false, updatedAt: new Date().toISOString() };
}

export const toLevel = (n: number): Level => clamp(Math.round(n), MIN_LEVEL, MAX_LEVEL) as Level;

export const LEVEL_LABELS: Record<Level, string> = { 1: 'Muy fácil', 2: 'Fácil', 3: 'Medio', 4: 'Difícil', 5: 'Muy difícil' };
