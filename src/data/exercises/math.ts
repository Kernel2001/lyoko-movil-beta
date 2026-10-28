import type { Level } from '../../types';
import { pick, randInt, type Rng } from '../../utils/misc';

export interface MathQuestion {
  kind: string;
  level: Level;
  prompt: string;
  /** Respuesta numérica exacta; en preguntas de elección, null. */
  answer: number | null;
  /** Texto de la respuesta para mostrar. */
  display: string;
  steps: string[];
  choices?: string[];
  correctChoice?: number;
  /** Expresión evaluable en JS (sólo para verificar en pruebas). */
  expr?: string;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
export const fmt = (n: number) => String(round6(n)).replace('.', ',').replace('-', '−');
const paren = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n));

/**
 * Convierte lo que escribe el usuario en número: acepta coma o punto decimal, signo menos
 * unicode, espacios y fracciones "a/b". Devuelve null si no es interpretable.
 */
export function parseNumber(input: string): number | null {
  const s = input.trim().replace(/\s+/g, '').replace('−', '-').replace(',', '.');
  if (!s) return null;
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = Number(frac[2]);
    return d === 0 ? null : Number(frac[1]) / d;
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Equivalencia numérica (0,5 = .5 = 1/2). Tolerancia mínima sólo para errores de coma flotante. */
export function checkNumeric(input: string, answer: number): boolean {
  const v = parseNumber(input);
  return v !== null && Math.abs(v - answer) <= 1e-9 * Math.max(1, Math.abs(answer));
}

export function checkMathAnswer(q: MathQuestion, input: string | number): boolean {
  if (q.choices) return input === q.correctChoice;
  return typeof input === 'string' && q.answer !== null && checkNumeric(input, q.answer);
}

type Maker = (rng: Rng, level: Level) => MathQuestion;

const num = (level: Level, answer: number, prompt: string, kind: string, steps: string[], expr: string): MathQuestion => ({
  kind, level, prompt, answer: round6(answer), display: fmt(answer), steps, expr,
});

const add: Maker = (r, l) => {
  const max = l <= 1 ? 60 : 200;
  const a = randInt(r, 8, max), b = randInt(r, 8, max);
  return num(l, a + b, `${a} + ${b}`, 'suma', [`${a} + ${b} = ${a + b}`], `${a}+${b}`);
};
const sub: Maker = (r, l) => {
  const max = l <= 1 ? 60 : 200;
  const a = randInt(r, 20, max), b = randInt(r, 5, a - 1);
  return num(l, a - b, `${a} − ${b}`, 'resta', [`${a} − ${b} = ${a - b}`], `${a}-${b}`);
};
const compare: Maker = (r, l) => {
  // Dos expresiones con valor conocido; ~25 % de las veces son iguales.
  const mk = () => {
    const a = randInt(r, 3, 12), b = randInt(r, 3, 12);
    return r() < 0.5 ? { t: `${a} + ${b}`, v: a + b } : { t: `${a} × ${b}`, v: a * b };
  };
  const x = mk();
  let y = mk();
  if (r() < 0.25) y = { t: `${x.v - 1} + 1`, v: x.v };
  const correct = x.v > y.v ? 0 : x.v < y.v ? 1 : 2;
  return {
    kind: 'comparar', level: l, prompt: `¿Cuál es mayor?  A: ${x.t}   B: ${y.t}`, answer: null,
    display: ['A', 'B', 'Son iguales'][correct], choices: ['A', 'B', 'Son iguales'], correctChoice: correct,
    steps: [`A = ${x.t} = ${x.v}`, `B = ${y.t} = ${y.v}`, correct === 2 ? 'Los dos valen lo mismo.' : `${correct === 0 ? 'A' : 'B'} es mayor.`],
  };
};
const mul: Maker = (r, l) => {
  const a = randInt(r, 2, 12), b = randInt(r, 2, l <= 2 ? 10 : 15);
  return num(l, a * b, `${a} × ${b}`, 'multiplicación', [`${a} × ${b} = ${a * b}`], `${a}*${b}`);
};
const div: Maker = (r, l) => {
  const b = randInt(r, 2, 12), q = randInt(r, 2, l <= 2 ? 10 : 15);
  return num(l, q, `${b * q} ÷ ${b}`, 'división', [`${b} × ${q} = ${b * q}`, `Por tanto ${b * q} ÷ ${b} = ${q}`], `${b * q}/${b}`);
};
const negatives: Maker = (r, l) => {
  const a = randInt(r, -15, 15) || 7, b = randInt(r, -12, 12) || -5;
  const op = pick(r, ['+', '−', '×']);
  const val = op === '+' ? a + b : op === '−' ? a - b : a * b;
  const jsOp = op === '−' ? '-' : op === '×' ? '*' : '+';
  const steps = op === '×'
    ? [`Signos: ${a * b < 0 ? 'distintos → resultado negativo' : 'iguales → resultado positivo'}`, `${Math.abs(a)} × ${Math.abs(b)} = ${Math.abs(a * b)}`]
    : [`${paren(a)} ${op} ${paren(b)} = ${fmt(val)}`];
  return num(l, val, `${paren(a)} ${op} ${paren(b)}`, 'negativos', steps, `(${a})${jsOp}(${b})`);
};
const decimals: Maker = (r, l) => {
  const a = randInt(r, 11, 99) / 10, b = randInt(r, 11, 99) / 10;
  if (r() < 0.5) {
    const op = pick(r, ['+', '−']);
    const val = op === '+' ? a + b : a - b;
    return num(l, val, `${fmt(a)} ${op} ${fmt(b)}`, 'decimales', [`${fmt(a)} ${op} ${fmt(b)} = ${fmt(val)}`], `${a}${op === '+' ? '+' : '-'}${b}`);
  }
  const k = randInt(r, 2, 9);
  return num(l, a * k, `${fmt(a)} × ${k}`, 'decimales', [`${fmt(a)} × ${k} = ${fmt(a * k)}`], `${a}*${k}`);
};
const percent: Maker = (r, l) => {
  const p = pick(r, [10, 20, 25, 50, 5, 15, 75]);
  const base = pick(r, [40, 60, 80, 120, 200, 160, 240]);
  const v = (p * base) / 100;
  return num(l, v, `¿Cuánto es el ${p} % de ${base}?`, 'porcentaje', [`${p} % de ${base} = ${base} × ${p} ÷ 100`, `= ${fmt(v)}`], `${p}*${base}/100`);
};
const discount: Maker = (r, l) => {
  const p = pick(r, [10, 20, 25, 50]), base = pick(r, [40, 60, 80, 120, 200]);
  const final = base - (base * p) / 100;
  return num(l, final, `Un artículo cuesta ${base} € y tiene un ${p} % de descuento. ¿Cuánto cuesta ahora?`, 'porcentaje',
    [`Descuento = ${base} × ${p} ÷ 100 = ${fmt((base * p) / 100)} €`, `${base} − ${fmt((base * p) / 100)} = ${fmt(final)} €`], `${base}-${base}*${p}/100`);
};
const fractionAdd: Maker = (r, l) => {
  // Denominadores 2, 4, 5, 10: el resultado siempre tiene decimal exacto, así que fracción y decimal son equivalentes.
  const dens = [2, 4, 5, 10];
  const d1 = pick(r, dens), d2 = pick(r, dens);
  const n1 = randInt(r, 1, d1 - 1), n2 = randInt(r, 1, d2 - 1);
  const v = n1 / d1 + n2 / d2;
  return num(l, v, `${n1}/${d1} + ${n2}/${d2}  (escribe fracción o decimal)`, 'fracciones',
    [`${n1}/${d1} = ${fmt(n1 / d1)} y ${n2}/${d2} = ${fmt(n2 / d2)}`, `${fmt(n1 / d1)} + ${fmt(n2 / d2)} = ${fmt(v)}`], `${n1}/${d1}+${n2}/${d2}`);
};
const fractionOf: Maker = (r, l) => {
  const d = pick(r, [2, 3, 4, 5]), n = randInt(r, 1, d - 1), k = randInt(r, 2, 8);
  const base = d * k;
  return num(l, n * k, `¿Cuánto es ${n}/${d} de ${base}?`, 'fracciones',
    [`${base} ÷ ${d} = ${k}`, `${k} × ${n} = ${n * k}`], `${n}*${base}/${d}`);
};
const combined: Maker = (r, l) => {
  const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 2, 9), d = randInt(r, 2, 9);
  switch (randInt(r, 0, 2)) {
    case 0: return num(l, a + b * c, `${a} + ${b} × ${c}`, 'combinadas', [`Primero la multiplicación: ${b} × ${c} = ${b * c}`, `${a} + ${b * c} = ${a + b * c}`], `${a}+${b}*${c}`);
    case 1: return num(l, (a + b) * c - d, `(${a} + ${b}) × ${c} − ${d}`, 'combinadas', [`Paréntesis: ${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${(a + b) * c}`, `${(a + b) * c} − ${d} = ${(a + b) * c - d}`], `(${a}+${b})*${c}-${d}`);
    default: return num(l, a * b - c * d, `${a} × ${b} − ${c} × ${d}`, 'combinadas', [`${a} × ${b} = ${a * b}`, `${c} × ${d} = ${c * d}`, `${a * b} − ${c * d} = ${a * b - c * d}`], `${a}*${b}-${c}*${d}`);
  }
};
const power: Maker = (r, l) => {
  const base = randInt(r, 2, 9), exp = base <= 3 ? randInt(r, 2, 5) : 2;
  const v = base ** exp;
  return num(l, v, `${base}${exp === 2 ? '²' : exp === 3 ? '³' : '^' + exp}`, 'potencias', [`${Array(exp).fill(base).join(' × ')} = ${v}`], `${base}**${exp}`);
};
const root: Maker = (r, l) => {
  if (r() < 0.25) {
    const n = pick(r, [2, 3, 4, 5]);
    return num(l, n, `∛${n ** 3}`, 'raíces', [`${n} × ${n} × ${n} = ${n ** 3}`, `Por tanto ∛${n ** 3} = ${n}`], `${n}`);
  }
  const n = randInt(r, 3, 15);
  return num(l, n, `√${n * n}`, 'raíces', [`Busca un número que multiplicado por sí mismo dé ${n * n}`, `${n} × ${n} = ${n * n}`], `${n}`);
};
const proportion: Maker = (r, l) => {
  const a = randInt(r, 2, 6), price = randInt(r, 2, 9) * a, c = a * randInt(r, 2, 5);
  const v = (price * c) / a;
  return num(l, v, `Si ${a} cuadernos cuestan ${price} €, ¿cuánto cuestan ${c}?`, 'proporciones',
    [`Precio de uno: ${price} ÷ ${a} = ${price / a} €`, `${c} × ${price / a} = ${fmt(v)} €`], `${price}*${c}/${a}`);
};
const multistep: Maker = (r, l) => {
  const n1 = randInt(r, 2, 4), p1 = pick(r, [1.5, 2, 2.5, 3]), n2 = randInt(r, 1, 3), p2 = pick(r, [0.5, 1, 1.2, 1.5]);
  const cost = n1 * p1 + n2 * p2;
  const pay = Math.ceil(cost / 10) * 10 + (r() < 0.5 ? 0 : 10);
  return num(l, pay - cost, `Compras ${n1} libretas de ${fmt(p1)} € y ${n2} bolígrafos de ${fmt(p2)} €. Pagas con ${pay} €. ¿Cuánto te devuelven?`, 'varios pasos',
    [`Libretas: ${n1} × ${fmt(p1)} = ${fmt(n1 * p1)} €`, `Bolígrafos: ${n2} × ${fmt(p2)} = ${fmt(n2 * p2)} €`, `Total: ${fmt(cost)} €`, `Devolución: ${pay} − ${fmt(cost)} = ${fmt(pay - cost)} €`], `${pay}-(${n1}*${p1}+${n2}*${p2})`);
};

/** Tipos de pregunta que se introducen en cada nivel. */
const KINDS: Record<Level, Maker[]> = {
  1: [add, sub, compare],
  2: [mul, div, sub],
  3: [negatives, decimals, percent],
  4: [fractionAdd, fractionOf, combined, discount],
  5: [power, root, proportion, multistep],
};

export const LEVEL_TOPICS: Record<Level, string> = {
  1: 'Sumas, restas y comparación',
  2: 'Multiplicaciones y divisiones exactas',
  3: 'Negativos, decimales y porcentajes',
  4: 'Fracciones, combinadas y descuentos',
  5: 'Potencias, raíces, proporciones y varios pasos',
};

/** 70 % preguntas del nivel actual, 30 % repaso de niveles anteriores. */
export function generateMathQuestion(level: Level, rng: Rng): MathQuestion {
  const useLower = level > 1 && rng() < 0.3;
  const lvl = (useLower ? randInt(rng, 1, level - 1) : level) as Level;
  return pick(rng, KINDS[lvl])(rng, level);
}
