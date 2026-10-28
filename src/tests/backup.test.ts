import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbForTests } from '../services/storage/db';
import { repos } from '../services/storage';
import { createTask } from '../services/tasks';
import { createHabit, setHabitDone } from '../services/habits';
import { savePreferences } from '../services/preferences';
import { backupToJson, buildBackup, deleteAllData, importBackup, parseBackup, validateBackup } from '../services/export/backup';

beforeEach(async () => { await resetDbForTests(); });

async function seed() {
  await savePreferences({ name: 'Ana' });
  await createTask({ title: 'Tarea 1', date: '2026-05-04' });
  const h = await createHabit('Leer', [1, 2, 3]);
  await setHabitDone(h.id, '2026-05-04', true);
}

describe('copias de seguridad', () => {
  it('exporta un JSON válido que vuelve a validarse', async () => {
    await seed();
    const json = backupToJson(await buildBackup());
    const { backup, result } = parseBackup(json);
    expect(result.ok).toBe(true);
    expect(backup!.data.tasks).toHaveLength(1);
    expect(result.counts.habitCompletions).toBe(1);
  });

  it('exporta e importa (reemplazar) tras borrar todo', async () => {
    await seed();
    const json = backupToJson(await buildBackup());
    await deleteAllData();
    expect(await repos.tasks.getAll()).toEqual([]);
    const { backup } = parseBackup(json);
    await importBackup(backup!, 'reemplazar');
    expect((await repos.tasks.getAll())[0].title).toBe('Tarea 1');
    expect(await repos.habits.getAll()).toHaveLength(1);
  });

  it('combinar no sobrescribe los registros existentes', async () => {
    await seed();
    const backup = await buildBackup();
    const [task] = await repos.tasks.getAll();
    await repos.tasks.put({ ...task, title: 'Editada después de la copia' });
    await importBackup(backup, 'combinar');
    expect((await repos.tasks.getAll())[0].title).toBe('Editada después de la copia');
  });

  it('rechaza copias inválidas SIN modificar los datos existentes', async () => {
    await seed();
    const invalid = [
      'no es json', '{}', '[]',
      JSON.stringify({ app: 'otra', version: 1, data: {} }),
      JSON.stringify({ app: 'project-lyoko-movil-beta', version: 1, data: { tasks: [{ id: 'x', title: 5 }] } }),
      JSON.stringify({ app: 'project-lyoko-movil-beta', version: 99, data: {} }),
    ];
    for (const bad of invalid) expect(parseBackup(bad).result.ok).toBe(false);
    const bad = { app: 'project-lyoko-movil-beta', version: 1, exportedAt: '', data: { tasks: [{ id: 'x' }] } } as never;
    expect(validateBackup(bad).ok).toBe(false);
    await expect(importBackup(bad, 'reemplazar')).rejects.toThrow();
    expect(await repos.tasks.getAll()).toHaveLength(1);
  });

  it('detecta identificadores repetidos', () => {
    const t = { id: 'a', title: 't', date: '2026-05-04', done: false };
    const r = validateBackup({ app: 'project-lyoko-movil-beta', version: 1, data: { tasks: [t, t] } });
    expect(r.ok).toBe(false);
  });

  it('eliminar todos los datos deja la app en estado vacío', async () => {
    await seed();
    await deleteAllData();
    expect(await repos.habits.getAll()).toEqual([]);
    expect(await repos.preferences.getAll()).toEqual([]);
  });
});
