import type { DateKey, Priority, Task } from '../types';
import { repos } from './storage';
import { isDateKey, toDateKey } from '../utils/dates';
import { newId, nowISO } from '../utils/misc';

export interface TaskInput {
  title: string;
  description?: string;
  date: DateKey;
  time?: string;
  priority?: Priority;
  category?: string;
  reminder?: boolean;
}

export class ValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super(Object.values(fields)[0]);
    this.name = 'ValidationError';
  }
}

export function validateTaskInput(input: TaskInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title?.trim()) errors.title = 'Escribe un título para la tarea.';
  else if (input.title.trim().length > 140) errors.title = 'El título es demasiado largo (máximo 140 caracteres).';
  if (!isDateKey(input.date)) errors.date = 'Elige una fecha válida.';
  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) errors.time = 'La hora debe tener formato HH:MM.';
  if (input.reminder && !input.time) errors.time = 'Para un recordatorio necesitas indicar una hora.';
  return errors;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const errors = validateTaskInput(input);
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const now = nowISO();
  const task: Task = {
    id: newId(),
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    date: input.date,
    time: input.time ?? '',
    priority: input.priority ?? 'media',
    category: (input.category ?? '').trim(),
    done: false,
    completedAt: '',
    reminder: !!input.reminder,
    createdAt: now,
    updatedAt: now,
  };
  return repos.tasks.put(task);
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  const current = await repos.tasks.get(id);
  if (!current) throw new Error('La tarea ya no existe.');
  const merged: TaskInput = { ...current, ...patch };
  const errors = validateTaskInput(merged);
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const next: Task = {
    ...current,
    title: merged.title.trim(),
    description: (merged.description ?? '').trim(),
    date: merged.date,
    time: merged.time ?? '',
    priority: merged.priority ?? current.priority,
    category: (merged.category ?? '').trim(),
    reminder: !!merged.reminder,
    updatedAt: nowISO(),
  };
  return repos.tasks.put(next);
}

export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  const current = await repos.tasks.get(id);
  if (!current) throw new Error('La tarea ya no existe.');
  const now = nowISO();
  return repos.tasks.put({ ...current, done, completedAt: done ? now : '', updatedAt: now });
}

export async function deleteTask(id: string): Promise<void> {
  await repos.tasks.remove(id);
}

export type TaskView = 'hoy' | 'proximas' | 'completadas';

const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };

function byDateTimePriority(a: Task, b: Task) {
  return (
    a.date.localeCompare(b.date) ||
    (a.time || '99:99').localeCompare(b.time || '99:99') ||
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

/**
 * Hoy: pendientes de hoy + atrasadas (no se pierden de vista).
 * Próximas: pendientes posteriores a hoy. Completadas: historial, la más reciente primero.
 */
export function filterTasks(tasks: Task[], view: TaskView, today: DateKey = toDateKey()): Task[] {
  switch (view) {
    case 'hoy':
      return tasks.filter((t) => !t.done && t.date <= today).sort(byDateTimePriority);
    case 'proximas':
      return tasks.filter((t) => !t.done && t.date > today).sort(byDateTimePriority);
    case 'completadas':
      return tasks.filter((t) => t.done).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }
}
