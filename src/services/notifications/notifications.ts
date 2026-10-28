import type { Task } from '../../types';
import { toDateKey } from '../../utils/dates';

/**
 * LIMITACIÓN: sin servidor push no hay notificaciones programadas fiables con la app cerrada.
 * Aquí los avisos sólo se emiten mientras la app está abierta (o en segundo plano reciente).
 * iOS sólo permite notificaciones a PWAs instaladas en la pantalla de inicio (iOS 16.4+).
 */
export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

export interface DueReminder {
  key: string; // evita avisar dos veces
  title: string;
  body: string;
}

/** Tareas con recordatorio cuya hora ya llegó hoy (y no se han completado). */
export function dueTaskReminders(tasks: Task[], now: Date = new Date()): DueReminder[] {
  const today = toDateKey(now);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return tasks
    .filter((t) => t.reminder && !t.done && t.date === today && t.time && t.time <= hhmm)
    .map((t) => ({ key: `task:${t.id}:${t.date}:${t.time}`, title: 'Tarea pendiente', body: `${t.time} · ${t.title}` }));
}

export function dueDailyReminder(time: string, now: Date = new Date()): DueReminder | null {
  if (!time) return null;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (time > hhmm) return null;
  return { key: `daily:${toDateKey(now)}`, title: 'Project Lyoko', body: 'Es un buen momento para tu sesión de entrenamiento y tus hábitos.' };
}

export async function showNotification(r: DueReminder): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(r.title, { body: r.body, icon: 'icon-192.png', tag: r.key });
    else new Notification(r.title, { body: r.body, tag: r.key });
    return true;
  } catch {
    return false;
  }
}
