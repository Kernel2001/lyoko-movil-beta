import type { DateKey } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local (no UTC) en formato YYYY-MM-DD. */
export function toDateKey(d: Date = new Date()): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Interpreta una clave como medianoche local; el mediodía evita saltos por cambios de hora. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function isDateKey(v: unknown): v is DateKey {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return toDateKey(fromDateKey(v)) === v;
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** Lunes de la semana de `key`. */
export function startOfWeek(key: DateKey): DateKey {
  const d = fromDateKey(key);
  const diff = (d.getDay() + 6) % 7;
  return addDays(key, -diff);
}

/** Lista de `n` días terminando en `end` (inclusive), en orden cronológico. */
export function lastDays(n: number, end: DateKey = toDateKey()): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function weekdayOf(key: DateKey): number {
  return fromDateKey(key).getDay();
}

export function formatLong(key: DateKey): string {
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(fromDateKey(key));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShort(key: DateKey): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(fromDateKey(key));
}

export const WEEKDAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const WEEKDAYS_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
