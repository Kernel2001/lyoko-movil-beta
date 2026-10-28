import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDbConnection, resetDbForTests, StorageError } from '../services/storage/db';
import { repos } from '../services/storage';
import { createTask, deleteTask, filterTasks, setTaskDone, updateTask, ValidationError } from '../services/tasks';
import { loadPreferences, savePreferences } from '../services/preferences';

beforeEach(async () => { await resetDbForTests(); });

describe('tareas', () => {
  it('crea, edita, completa y elimina', async () => {
    const t = await createTask({ title: '  Estudiar  ', date: '2026-05-04', priority: 'alta' });
    expect(t.title).toBe('Estudiar');
    expect(t.done).toBe(false);

    const edited = await updateTask(t.id, { title: 'Estudiar cálculo', time: '18:30' });
    expect(edited.title).toBe('Estudiar cálculo');
    expect(edited.time).toBe('18:30');
    expect(edited.createdAt).toBe(t.createdAt);

    const done = await setTaskDone(t.id, true);
    expect(done.done).toBe(true);
    expect(done.completedAt).not.toBe('');
    const undone = await setTaskDone(t.id, false);
    expect(undone.completedAt).toBe('');

    await deleteTask(t.id);
    expect(await repos.tasks.getAll()).toEqual([]);
  });

  it('valida el formulario', async () => {
    await expect(createTask({ title: '   ', date: '2026-05-04' })).rejects.toBeInstanceOf(ValidationError);
    await expect(createTask({ title: 'x', date: '04/05/2026' })).rejects.toBeInstanceOf(ValidationError);
    await expect(createTask({ title: 'x', date: '2026-02-31' })).rejects.toBeInstanceOf(ValidationError);
    await expect(createTask({ title: 'x', date: '2026-05-04', time: '25:00' })).rejects.toBeInstanceOf(ValidationError);
    await expect(createTask({ title: 'x', date: '2026-05-04', reminder: true })).rejects.toBeInstanceOf(ValidationError);
  });

  it('separa hoy, próximas y completadas (las completadas salen de pendientes pero se conservan)', async () => {
    const today = '2026-05-04';
    const a = await createTask({ title: 'hoy', date: today });
    await createTask({ title: 'atrasada', date: '2026-05-01' });
    await createTask({ title: 'mañana', date: '2026-05-05' });
    await setTaskDone(a.id, true);
    const all = await repos.tasks.getAll();
    expect(filterTasks(all, 'hoy', today).map((t) => t.title)).toEqual(['atrasada']);
    expect(filterTasks(all, 'proximas', today).map((t) => t.title)).toEqual(['mañana']);
    expect(filterTasks(all, 'completadas', today).map((t) => t.title)).toEqual(['hoy']);
  });

  it('estado vacío: listas vacías sin errores', async () => {
    expect(await repos.tasks.getAll()).toEqual([]);
    expect(filterTasks([], 'hoy')).toEqual([]);
    expect((await loadPreferences()).onboarded).toBe(false);
  });
});

describe('persistencia', () => {
  it('los datos sobreviven a cerrar y reabrir la base de datos', async () => {
    await createTask({ title: 'Persistente', date: '2026-05-04' });
    await savePreferences({ name: 'Ana', theme: 'light' });
    await closeDbConnection(); // equivale a recargar la app
    expect((await repos.tasks.getAll()).map((t) => t.title)).toEqual(['Persistente']);
    expect((await loadPreferences()).name).toBe('Ana');
  });

  it('editar una tarea inexistente falla sin crear nada', async () => {
    await expect(updateTask('no-existe', { title: 'x' })).rejects.toThrow();
    expect(await repos.tasks.getAll()).toEqual([]);
  });
});

describe('errores de almacenamiento', () => {
  it('informa con StorageError si IndexedDB no está disponible', async () => {
    await closeDbConnection();
    vi.stubGlobal('indexedDB', undefined);
    await expect(repos.tasks.getAll()).rejects.toBeInstanceOf(StorageError);
    await expect(createTask({ title: 'x', date: '2026-05-04' })).rejects.toBeInstanceOf(StorageError);
    vi.unstubAllGlobals();
  });
});
