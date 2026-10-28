import type { Level } from '../../types';
import { pick, randInt, shuffle, type Rng } from '../../utils/misc';

// ---- Atención selectiva: cuadrícula ----

export interface GridConfig {
  cols: number;
  rows: number;
  label: string; // condición que se muestra al usuario
  targetPool: string[];
  distractorPool: string[];
  targetCount: number;
}

export function gridConfig(level: Level, rng: Rng): GridConfig {
  switch (level) {
    case 1: return { cols: 4, rows: 4, label: 'la letra A', targetPool: ['A'], distractorPool: 'EFHKLMNTXZ'.split(''), targetCount: randInt(rng, 3, 4) };
    case 2: return { cols: 5, rows: 5, label: 'el número 6', targetPool: ['6'], distractorPool: ['9', '8', '0', '5', '3'], targetCount: randInt(rng, 4, 6) };
    case 3: return { cols: 5, rows: 6, label: 'la letra b (cuidado con d, p y q)', targetPool: ['b'], distractorPool: ['d', 'p', 'q', 'h'], targetCount: randInt(rng, 5, 7) };
    case 4: return { cols: 6, rows: 6, label: 'las vocales', targetPool: 'AEIOU'.split(''), distractorPool: 'BCDFGLMNPRST'.split(''), targetCount: randInt(rng, 6, 9) };
    default: return { cols: 6, rows: 7, label: 'los números pares', targetPool: ['2', '4', '6', '8'], distractorPool: ['1', '3', '5', '7', '9'], targetCount: randInt(rng, 8, 11) };
  }
}

export interface Grid {
  config: GridConfig;
  cells: string[];
  targets: number[];
}

export function generateGrid(level: Level, rng: Rng): Grid {
  const config = gridConfig(level, rng);
  const n = config.cols * config.rows;
  const targets = shuffle(rng, Array.from({ length: n }, (_, i) => i)).slice(0, config.targetCount).sort((a, b) => a - b);
  const set = new Set(targets);
  const cells = Array.from({ length: n }, (_, i) => pick(rng, set.has(i) ? config.targetPool : config.distractorPool));
  return { config, cells, targets };
}

export interface SelectionScore {
  hits: number;
  errors: number; // casillas marcadas que no cumplían la condición
  omissions: number;
  total: number; // elementos evaluables = objetivos + errores
  correct: number;
}

export function scoreSelection(targets: number[], selected: number[]): SelectionScore {
  const t = new Set(targets);
  const sel = new Set(selected);
  let hits = 0, errors = 0;
  sel.forEach((i) => (t.has(i) ? hits++ : errors++));
  return { hits, errors, omissions: t.size - hits, total: t.size + errors, correct: hits };
}

// ---- Detección de objetivos: flujo de estímulos ----

export const STIMULI = ['●', '■', '▲', '◆', '★'];

export interface Stream {
  target: string;
  stimuli: string[];
  isTarget: boolean[];
}

export const streamLength = (level: Level) => 20 + level * 4;
export const stimulusMs = (level: Level) => [1600, 1400, 1200, 1000, 850][level - 1];

export function generateStream(level: Level, rng: Rng): Stream {
  const target = pick(rng, STIMULI);
  const length = streamLength(level);
  const others = STIMULI.filter((s) => s !== target);
  let stimuli: string[];
  let isTarget: boolean[];
  do {
    isTarget = Array.from({ length }, () => rng() < 0.25);
    stimuli = isTarget.map((t) => (t ? target : pick(rng, others)));
  } while (isTarget.filter(Boolean).length < 3);
  return { target, stimuli, isTarget };
}

export interface DetectionScore {
  hits: number;
  omissions: number;
  falseAlarms: number;
  total: number; // objetivos + falsas alarmas
  correct: number;
}

export function scoreDetection(isTarget: boolean[], responded: boolean[]): DetectionScore {
  let hits = 0, omissions = 0, falseAlarms = 0;
  isTarget.forEach((t, i) => {
    if (t && responded[i]) hits++;
    else if (t) omissions++;
    else if (responded[i]) falseAlarms++;
  });
  return { hits, omissions, falseAlarms, total: hits + omissions + falseAlarms, correct: hits };
}
