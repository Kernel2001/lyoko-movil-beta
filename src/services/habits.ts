import type { DateKey, Habit, HabitCompletion } from '../types';
import { repos } from './storage';
import { addDays, startOfWeek, toDateKey, weekdayOf } from '../utils/dates';
import { newId, nowISO } from '../utils/misc';
import { ValidationError } from './tasks';

export async function createHabit(name: string, days: number[]): Promise<Habit> {
  const clean = [...new Set(days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Escribe un nombre para el hábito.';
  if (clean.length === 0) errors.days = 'Elige al menos un día de la semana.';
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const now = nowISO();
  return repos.habits.put({ id: newId(), name: name.trim(), days: clean, archived: false, createdAt: now, updatedAt: now });
}

export async function updateHabit(id: string, patch: { name?: string; days?: number[]; archived?: boolean }): Promise<Habit> {
  const current = await repos.habits.get(id);
  if (!current) throw new Error('El hábito ya no existe.');
  const next = { ...current, ...patch, updatedAt: nowISO() };
  if (!next.name.trim()) throw new ValidationError({ name: 'Escribe un nombre para el hábito.' });
  if (next.days.length === 0) throw new ValidationError({ days: 'Elige al menos un día de la semana.' });
  next.name = next.name.trim();
  return repos.habits.put(next);
}

/** Borrar un hábito conserva su historial de cumplimiento sólo si se archiva; borrar lo elimina todo. */
export async function deleteHabit(id: string): Promise<void> {
  const completions = await repos.habitCompletions.getAll();
  for (const c of completions.filter((c) => c.habitId === id)) await repos.habitCompletions.remove(c.id);
  await repos.habits.remove(id);
}

export async function setHabitDone(habitId: string, date: DateKey, done: boolean): Promise<void> {
  const id = `${habitId}_${date}`;
  if (done) {
    const c: HabitCompletion = { id, habitId, date, completedAt: nowISO() };
    await repos.habitCompletions.put(c);
  } else {
    await repos.habitCompletions.remove(id);
  }
}

export const isScheduled = (h: Habit, date: DateKey) => h.days.includes(weekdayOf(date));

/** Un hábito no cuenta como pendiente antes del día en que se creó. */
const createdKey = (h: Habit) => toDateKey(new Date(h.createdAt));

export interface HabitStats {
  weekDone: number;
  weekExpected: number;
  monthRate: number | null; // últimos 30 días, 0..1 (null si aún no había días programados)
  daysDoneLast7: number;
}

/**
 * Constancia sin castigo: no hay "racha que se rompe". Se muestra cumplimiento de la semana,
 * porcentaje de los últimos 30 días y días cumplidos de los últimos 7.
 */
export function habitStats(h: Habit, completions: HabitCompletion[], today: DateKey = toDateKey()): HabitStats {
  const done = new Set(completions.filter((c) => c.habitId === h.id).map((c) => c.date));
  const start = createdKey(h);
  const monday = startOfWeek(today);
  let weekDone = 0, weekExpected = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (done.has(d)) weekDone++;
    if (isScheduled(h, d) && d >= start) weekExpected++;
  }
  let monthDone = 0, monthExpected = 0, last7 = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    if (d < start && !done.has(d)) continue;
    if (done.has(d)) { monthDone++; if (i < 7) last7++; }
    if (isScheduled(h, d)) monthExpected++;
  }
  return {
    weekDone,
    weekExpected: Math.max(weekExpected, weekDone),
    monthRate: monthExpected ? Math.min(1, monthDone / monthExpected) : null,
    daysDoneLast7: last7,
  };
}

export function habitsForDay(habits: Habit[], date: DateKey): Habit[] {
  return habits.filter((h) => !h.archived && isScheduled(h, date) && createdKey(h) <= date);
}

