import { useState } from 'react';
import type { Priority, Task } from '../../types';
import { EmptyState, ErrorBox, Field, Icon, Loading, Segmented, Sheet, useUI } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { createTask, deleteTask, filterTasks, setTaskDone, updateTask, ValidationError, type TaskView } from '../../services/tasks';
import { formatShort, toDateKey } from '../../utils/dates';
import { notificationPermission, requestNotificationPermission } from '../../services/notifications/notifications';
import { usePrefs } from '../../app/prefs';

export function TaskRow({ task, today }: { task: Task; today: string }) {
  const { guard } = useUI();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className={`item ${task.done ? 'done' : ''}`}>
        <button className={`check ${task.done ? 'on' : ''}`} aria-label={task.done ? 'Marcar como pendiente' : 'Marcar como completada'}
          onClick={() => guard(() => setTaskDone(task.id, !task.done))}><Icon name="check" /></button>
        <div className="grow" onClick={() => setEditing(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}>
          <div className="title">{task.title}</div>
          <div className="row gap wrap">
            <small>{task.date < today && !task.done ? `Atrasada · ${formatShort(task.date)}` : formatShort(task.date)}{task.time ? ` · ${task.time}` : ''}</small>
            <span className={`chip ${task.priority}`}>{task.priority}</span>
            {task.category && <span className="chip">{task.category}</span>}
            {task.reminder && <span className="chip">🔔</span>}
          </div>
        </div>
        <button className="icon-btn" aria-label="Editar tarea" onClick={() => setEditing(true)}><Icon name="edit" /></button>
      </div>
      {editing && <TaskForm task={task} onClose={() => setEditing(false)} />}
    </>
  );
}

export function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  const { prefs, update } = usePrefs();
  const [f, setF] = useState({
    title: task?.title ?? '', description: task?.description ?? '', date: task?.date ?? toDateKey(), time: task?.time ?? '',
    priority: (task?.priority ?? 'media') as Priority, category: task?.category ?? '', reminder: task?.reminder ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  async function toggleReminder(on: boolean) {
    set('reminder', on);
    if (on && !prefs.remindersEnabled) {
      const p = notificationPermission() === 'granted' ? 'granted' : await requestNotificationPermission();
      await update({ remindersEnabled: true });
      if (p !== 'granted') toast('Sin permiso de notificaciones verás el aviso dentro de la app (sólo con la app abierta).');
    }
  }

  async function save() {
    try {
      if (task) await updateTask(task.id, f); else await createTask(f);
      toast(task ? 'Tarea actualizada' : 'Tarea creada');
      onClose();
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.fields); else await guard(async () => { throw e; });
    }
  }

  return (
    <Sheet title={task ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose}>
      <Field label="Título" error={errors.title}><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="¿Qué quieres hacer?" autoFocus maxLength={140} /></Field>
      <Field label="Descripción (opcional)"><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Fecha" error={errors.date}><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Hora (opcional)" error={errors.time}><input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></Field>
      </div>
      <div className="grid2">
        <Field label="Prioridad">
          <select value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
          </select>
        </Field>
        <Field label="Categoría (opcional)"><input value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Estudio, casa…" /></Field>
      </div>
      <label className="row gap"><input type="checkbox" checked={f.reminder} onChange={(e) => toggleReminder(e.target.checked)} /> Recordatorio a la hora indicada <small>(sólo con la app abierta)</small></label>
      <div className="row gap">
        {task && <button className="btn danger" onClick={async () => { if (await confirm('Se eliminará esta tarea.', 'Eliminar')) { if (await guard(() => deleteTask(task.id), 'Tarea eliminada')) onClose(); } }}>Eliminar</button>}
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

export function Tasks() {
  const { items, loading, error, reload } = useCollection('tasks');
  const [view, setView] = useState<TaskView>('hoy');
  const [creating, setCreating] = useState(false);
  const today = toDateKey();
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const list = filterTasks(items, view, today);
  const empty = {
    hoy: ['Nada pendiente para hoy', 'Añade una tarea o disfruta del día despejado.'],
    proximas: ['Sin tareas próximas', 'Las tareas con fecha futura aparecerán aquí.'],
    completadas: ['Aún no has completado tareas', 'Cuando completes una, se guardará aquí como historial.'],
  }[view];
  return (
    <>
      <Segmented<TaskView> label="Vista de tareas" value={view} onChange={setView}
        options={[{ value: 'hoy', label: 'Hoy' }, { value: 'proximas', label: 'Próximas' }, { value: 'completadas', label: 'Hechas' }]} />
      {list.length === 0 ? (
        <EmptyState icon="tasks" title={empty[0]} action={view !== 'completadas' ? <button className="btn primary" onClick={() => setCreating(true)}>Añadir tarea</button> : undefined}>{empty[1]}</EmptyState>
      ) : (
        <div className="list">{list.map((t) => <TaskRow key={t.id} task={t} today={today} />)}</div>
      )}
      <button className="fab" aria-label="Nueva tarea" onClick={() => setCreating(true)}><Icon name="plus" size={28} /></button>
      {creating && <TaskForm onClose={() => setCreating(false)} />}
    </>
  );
}
