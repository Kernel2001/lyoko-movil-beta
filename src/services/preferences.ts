import type { UserPreferences } from '../types';
import { repos } from './storage';
import { nowISO } from '../utils/misc';

export const DEFAULT_PREFS: UserPreferences = {
  id: 'prefs',
  name: '',
  mainObjective: '',
  theme: 'dark',
  initialDifficulty: 1,
  sessionMinutes: 5,
  weeklyGoalMinutes: 60,
  remindersEnabled: false,
  dailyReminderTime: '',
  onboarded: false,
  seeded: false,
  updatedAt: '',
};

export async function loadPreferences(): Promise<UserPreferences> {
  const stored = await repos.preferences.get('prefs');
  // Mezclamos con los valores por defecto para tolerar copias antiguas con campos ausentes.
  return { ...DEFAULT_PREFS, ...stored };
}

export async function savePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await loadPreferences();
  const next: UserPreferences = { ...current, ...patch, id: 'prefs', updatedAt: nowISO() };
  next.weeklyGoalMinutes = Math.max(0, Math.round(Number(next.weeklyGoalMinutes) || 0));
  await repos.preferences.put(next);
  return next;
}
