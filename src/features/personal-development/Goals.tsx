import { useState } from 'react';
import type { Goal, GoalStatus, Priority } from '../../types';
import { EmptyState, ErrorBox, Field, Icon, Loading, ProgressBar, Sheet, useUI } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { repos } from '../../services/storage';
import { goalProgress, nextActionOf, saveGoal } from '../../services/goals';
import { ValidationError } from '../../services/tasks';
import { formatShort } from '../../utils/dates';
import { newId, nowISO } from '../../utils/misc';

const STATUS_LABEL: Record<GoalStatus, string> = { activo: 'Activo', pausado: 'Pausado', completado: 'Completado' };

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  const [f, setF] = useState({
    title: goal?.title ?? '', description: goal?.description ?? '', category: goal?.category ?? '', targetDate: goal?.targetDate ?? '',
    priority: (goal?.priority ?? 'media') as Priority, status: (goal?.status ?? 'activo') as GoalStatus, nextAction: goal?.nextAction ?? '',
  });
  const [steps, setSteps] = useState(goal?.steps ?? []);
  const [newStep, setNewStep] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const addStep = () => { if (newStep.trim()) { setSteps((s) => [...s, { id: newId(), title: newStep.trim(), done: false }]); setNewStep(''); } };

  async function save() {
    try {
      const pending = newStep.trim() ? [...steps, { id: newId(), title: newStep.trim(), done: false }] : steps;
      await saveGoal({ ...f, steps: pending }, goal?.id);
      toast('Objetivo guardado');
      onClose();
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.fields); else await guard(async () => { throw e; });
    }
  }

  return (
    <Sheet title={goal ? 'Editar objetivo' : 'Nuevo objetivo'} onClose={onClose}>
      <Field label="Título" error={errors.title}><input value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus /></Field>
      <Field label="Descripción"><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Categoría"><input value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Salud, estudios…" /></Field>
        <Field label="Fecha objetivo (opcional)" error={errors.targetDate}><input type="date" value={f.targetDate} onChange={(e) => set('targetDate', e.target.value)} /></Field>
        <Field label="Prioridad"><select value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
        <Field label="Estado"><select value={f.status} onChange={(e) => set('status', e.target.value as GoalStatus)}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <Field label="Próxima acción concreta" hint="Lo primero que harías, algo que puedas empezar hoy."><input value={f.nextAction} onChange={(e) => set('nextAction', e.target.value)} /></Field>
      <div className="stack">
        <b>Pasos pequeños</b>
        {steps.map((s) => (
          <div key={s.id} className="item">
            <input type="checkbox" checked={s.done} aria-label={`Paso: ${s.title}`} onChange={() => setSteps((l) => l.map((x) => x.id === s.id ? { ...x, done: !x.done } : x))} />
            <span className={`grow ${s.done ? 'muted' : ''}`}>{s.title}</span>
            <button className="icon-btn" aria-label="Quitar paso" onClick={() => setSteps((l) => l.filter((x) => x.id !== s.id))}><Icon name="x" size={18} /></button>
          </div>
        ))}
        <div className="row gap">
          <input value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} placeholder="Añadir un paso" />
          <button className="btn" onClick={addStep} aria-label="Añadir paso"><Icon name="plus" size={18} /></button>
        </div>
      </div>
      <div className="row gap">
        {goal && <button className="btn danger" onClick={async () => { if (await confirm('Se eliminará este objetivo.', 'Eliminar') && await guard(() => repos.goals.remove(goal.id), 'Objetivo eliminado')) onClose(); }}>Eliminar</button>}
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

export function Goals() {
  const { items, loading, error, reload } = useCollection('goals');
  const { guard } = useUI();
  const [form, setForm] = useState<{ goal?: Goal } | null>(null);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const order: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };
  const sorted = [...items].sort((a, b) => (a.status === 'completado' ? 1 : 0) - (b.status === 'completado' ? 1 : 0) || order[a.priority] - order[b.priority]);

  async function completeStep(g: Goal) {
    const step = g.steps.find((s) => !s.done);
    if (!step) return;
    await guard(() => repos.goals.put({ ...g, steps: g.steps.map((s) => s.id === step.id ? { ...s, done: true } : s), updatedAt: nowISO() }), 'Paso completado');
  }

  return (
    <>
      {sorted.length === 0 ? (
        <EmptyState icon="flag" title="Aún no tienes objetivos" action={<button className="btn primary" onClick={() => setForm({})}>Crear objetivo</button>}>
          Un buen objetivo tiene una próxima acción que puedas empezar hoy.
        </EmptyState>
      ) : (
        <div className="list">
          {sorted.map((g) => {
            const prog = goalProgress(g);
            const next = nextActionOf(g);
            return (
              <div key={g.id} className="card flat">
                <div className="row between gap">
                  <div className="grow">
                    <div className="title">{g.title}</div>
                    <div className="row gap wrap"><span className={`chip ${g.priority}`}>{g.priority}</span><span className="chip">{STATUS_LABEL[g.status]}</span>{g.category && <span className="chip">{g.category}</span>}{g.targetDate && <small>Para el {formatShort(g.targetDate)}</small>}</div>
                  </div>
                  <button className="icon-btn" aria-label={`Editar ${g.title}`} onClick={() => setForm({ goal: g })}><Icon name="edit" /></button>
                </div>
                {prog.total > 0 && <><ProgressBar value={prog.done / prog.total} label="Pasos completados" /><small>{prog.done}/{prog.total} pasos</small></>}
                {g.status === 'activo' && (next ? (
                  <div className="feedback"><small>Siguiente acción</small><div className="row between gap"><b className="grow">{next}</b>{g.steps.some((s) => !s.done) && <button className="btn small primary" onClick={() => completeStep(g)}>Hecho</button>}</div></div>
                ) : <p className="notice">Define una próxima acción para poder empezar.</p>)}
              </div>
            );
          })}
        </div>
      )}
      <button className="btn" onClick={() => setForm({})}><Icon name="plus" size={18} /> Nuevo objetivo</button>
      {form && <GoalForm goal={form.goal} onClose={() => setForm(null)} />}
    </>
  );
}
