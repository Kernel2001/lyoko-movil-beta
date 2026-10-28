import type { Level } from '../../types';
import { normalizeText, pick, shuffle, type Rng } from '../../utils/misc';

export type SymbolSet = 'numeros' | 'letras' | 'simbolos';

const SETS: Record<SymbolSet, string[]> = {
  numeros: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  letras: 'BCDFGHJKLMNPRSTV'.split(''),
  simbolos: ['★', '●', '■', '▲', '◆', '♥', '☾', '✚'],
};

export function generateSequence(rng: Rng, length: number, set: SymbolSet): string[] {
  const pool = SETS[set];
  const out: string[] = [];
  while (out.length < length) {
    const s = pick(rng, pool);
    if (out[out.length - 1] !== s) out.push(s); // sin repetidos consecutivos: evita ambigüedad al teclear
  }
  return out;
}

/** Texto del usuario → elementos. Acepta con o sin separadores ("4 8 1" o "481"). */
export function parseSequenceInput(text: string, set: SymbolSet): string[] {
  const clean = text.toUpperCase().replace(/[\s,;-]+/g, '');
  const pool = SETS[set];
  // Los símbolos pueden ser de varios caracteres unicode; recorremos con spread.
  return [...clean].filter((c) => pool.includes(c));
}

export interface SequenceScore {
  total: number;
  correct: number; // posiciones coincidentes
  exact: boolean;
}

/** Puntúa por posición: expected[i] === given[i]. En modo inverso se compara con la secuencia invertida. */
export function scoreSequence(expected: string[], given: string[], reverse = false): SequenceScore {
  const target = reverse ? [...expected].reverse() : expected;
  let correct = 0;
  target.forEach((s, i) => { if (given[i] === s) correct++; });
  return { total: target.length, correct, exact: correct === target.length && given.length === target.length };
}

/** Escalera: acierto total → +1, fallo → −1. Mantiene el reto en el límite de la capacidad. */
export function nextLength(length: number, exact: boolean, min = 2, max = 12): number {
  return Math.min(max, Math.max(min, length + (exact ? 1 : -1)));
}

export const startLength = (level: Level, reverse: boolean) => level + (reverse ? 1 : 2);
export const studyTimeMs = (length: number) => 1000 + length * 800;

// ---- Lista de palabras ----

export const WORDS = (
  'casa árbol mesa libro río montaña ventana camino puerta jardín nube cuchara espejo reloj bicicleta ' +
  'silla lámpara puente barco isla playa bosque campana moneda llave cuaderno maleta cielo piedra ' +
  'fuego sombra pan queso manzana naranja zapato abrigo guitarra tambor ciudad plaza fábrica granja ' +
  'tormenta viento hoja semilla flor abeja pájaro caballo tortuga conejo ratón lobo zorro águila ' +
  'martillo tijeras cuerda botella plato vaso cama almohada alfombra cortina pared techo suelo escalera ' +
  'teléfono pantalla teclado cable radio cámara mapa brújula linterna paraguas sombrero bufanda guante ' +
  'camión tren avión semáforo esquina calle hospital escuela museo teatro biblioteca mercado panadería ' +
  'invierno verano otoño primavera lunes domingo mañana noche'
).split(' ');

export const wordCount = (level: Level) => 4 + level; // 5..9
export const wordDelaySec = (level: Level) => 4 + level * 2; // 6..14 s de pausa
export const wordStudyMs = (count: number) => 1500 + count * 900;

export function pickWords(rng: Rng, n: number): string[] {
  return shuffle(rng, WORDS).slice(0, n);
}

export interface RecallScore {
  total: number;
  correct: number;
  intrusions: number; // palabras escritas que no estaban en la lista
}

/** Ignora mayúsculas y tildes; cada palabra de la lista cuenta una sola vez. */
export function scoreRecall(expected: string[], input: string): RecallScore {
  const given = new Set(normalizeText(input).split(' ').filter(Boolean));
  const exp = new Map(expected.map((w) => [normalizeText(w), w]));
  let correct = 0;
  for (const key of exp.keys()) if (given.has(key)) correct++;
  const intrusions = [...given].filter((g) => !exp.has(g)).length;
  return { total: expected.length, correct, intrusions };
}

export const SYMBOL_SETS = SETS;
