import { describe, expect, it } from 'vitest';
import { checkMathAnswer, checkNumeric, generateMathQuestion, parseNumber } from '../data/exercises/math';
import { seededRng } from '../utils/misc';
import type { Level } from '../types';

const LEVELS: Level[] = [1, 2, 3, 4, 5];

describe('generador de cálculo mental', () => {
  it('genera ejercicios con solución válida en todos los niveles', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 400; seed++) {
        const q = generateMathQuestion(level, seededRng(seed * 31 + level));
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(q.steps.length).toBeGreaterThan(0);
        if (q.choices) {
          expect(q.correctChoice).toBeGreaterThanOrEqual(0);
          expect(q.correctChoice).toBeLessThan(q.choices.length);
          continue;
        }
        expect(Number.isFinite(q.answer!)).toBe(true);
        expect(Math.abs(q.answer!)).toBeLessThan(10000);
        // Como mucho 4 decimales: nada de resultados periódicos o ilegibles.
        expect(Math.abs(q.answer! * 1e4 - Math.round(q.answer! * 1e4))).toBeLessThan(1e-6);
        if (q.expr && /^[\d+\-*/().\s]+$/.test(q.expr)) {
          // Verificación independiente: la expresión evaluada coincide con la respuesta guardada.
          const v = Function(`"use strict"; return (${q.expr})`)() as number;
          expect(Math.abs(v - q.answer!)).toBeLessThan(1e-6);
        }
        if (q.kind === 'división' || q.kind === 'raíces') expect(Number.isInteger(q.answer!)).toBe(true);
        if (q.kind === 'resta') expect(q.answer!).toBeGreaterThan(0);
        // La respuesta mostrada siempre se acepta como correcta.
        expect(checkMathAnswer(q, q.display)).toBe(true);
      }
    }
  });

  it('es reproducible con la misma semilla', () => {
    expect(generateMathQuestion(3, seededRng(7))).toEqual(generateMathQuestion(3, seededRng(7)));
  });

  it('la respuesta de comparación se corrige por opción', () => {
    for (let s = 1; s < 200; s++) {
      const q = generateMathQuestion(1, seededRng(s));
      if (!q.choices) continue;
      expect(checkMathAnswer(q, q.correctChoice!)).toBe(true);
      expect(checkMathAnswer(q, (q.correctChoice! + 1) % 3)).toBe(false);
    }
  });
});

describe('corrección de respuestas numéricas', () => {
  it('acepta formatos equivalentes', () => {
    expect(checkNumeric('0,75', 0.75)).toBe(true);
    expect(checkNumeric('0.75', 0.75)).toBe(true);
    expect(checkNumeric('3/4', 0.75)).toBe(true);
    expect(checkNumeric(' .75 ', 0.75)).toBe(true);
    expect(checkNumeric('−5', -5)).toBe(true);
    expect(checkNumeric('-5', -5)).toBe(true);
    expect(checkNumeric('10/4', 2.5)).toBe(true);
    expect(checkNumeric('1 2', 12)).toBe(true);
  });
  it('rechaza respuestas incorrectas o ilegibles', () => {
    expect(checkNumeric('0,7', 0.75)).toBe(false);
    expect(checkNumeric('abc', 1)).toBe(false);
    expect(checkNumeric('', 0)).toBe(false);
    expect(checkNumeric('1/0', 1)).toBe(false);
    expect(checkNumeric('1.2.3', 1.2)).toBe(false);
    expect(parseNumber('2/')).toBeNull();
  });
});
