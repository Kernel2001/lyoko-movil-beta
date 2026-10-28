import type { Goal, GoalStatus, GoalStep, Priority } from '../types';
import { repos } from './storage';
import { isDateKey } from '../utils/dates';
import { newId, nowISO } from '../utils/misc';
import { ValidationError } from './tasks';

export interface GoalInput {
  title: string;
  description?: string;
  category?: string;
  targetDate?: string;
  priority?: Priority;
  status?: GoalStatus;
  nextAction?: string;
  steps?: GoalStep[];
}

function validate(i: GoalInput) {
  const e: Record<string, string> = {};
  if (!i.title?.trim()) e.title = 'Escribe un título para el objetivo.';
  if (i.targetDate && !isDateKey(i.targetDate)) e.targetDate = 'La fecha no es válida.';
  if (Object.keys(e).length) throw new ValidationError(e);
}

export async function saveGoal(input: GoalInput, id?: string): Promise<Goal> {
  validate(input);
  const now = nowISO();
  const current = id ? await repos.goals.get(id) : undefined;
  const goal: Goal = {
    id: current?.id ?? newId(),
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    category: (input.category ?? '').trim(),
    targetDate: input.targetDate ?? '',
    priority: input.priority ?? 'media',
    status: input.status ?? current?.status ?? 'activo',
    nextAction: (input.nextAction ?? '').trim(),
    steps: (input.steps ?? current?.steps ?? []).filter((s) => s.title.trim()),
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  return repos.goals.put(goal);
}

/** La acción que se puede hacer YA: el primer paso pendiente o, si no hay pasos, la «próxima acción» escrita. */
export function nextActionOf(g: Goal): string {
  return g.steps.find((s) => !s.done)?.title ?? g.nextAction;
}

export function goalProgress(g: Goal): { done: number; total: number } {
  return { done: g.steps.filter((s) => s.done).length, total: g.steps.length };
}
