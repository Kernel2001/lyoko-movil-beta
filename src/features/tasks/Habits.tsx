import { useState } from 'react';
import type { Habit } from '../../types';
import { EmptyState, ErrorBox, Field, Icon, Loading, ProgressBar, Sheet, useUI } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { createHabit, deleteHabit, habitStats, habitsForDay, setHabitDone, updateHabit } from '../../services/habits';
import { ValidationError } from '../../services/tasks';
import { HABIT_SUGGESTIONS } from '../../data/seed';
import { WEEKDAYS_NAMES, WEEKDAYS_SHORT, toDateKey } from '../../utils/dates';
import { pct } from '../../services/scoring';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // semana de lunes a domingo

function HabitForm({ habit, preset, onClose }: { habit?: Habit; preset?: string; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  const [name, setName] = useState(habit?.name ?? preset ?? '');
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toggle = (d: number) => setDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));

  async function save() {
    try {
      if (habit) await updateHabit(habit.id, { name, days }); else await createHabit(name, days);
      toast(habit ? 'Hábito actualizado' : 'Hábito creado');
      onClose();
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.fields); else await guard(async () => { throw e; });
    }
  }

  return (
    <Sheet title={habit ? 'Editar hábito' : 'Nuevo hábito'} onClose={onClose}>
      <Field label="Nombre" error={errors.name}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leer, estudiar, entrenar…" autoFocus /></Field>
      <Field label="Días" error={errors.days}>
        <div className="days">{ORDER.map((d) => (
          <button key={d} type="button" className={days.includes(d) ? 'on' : ''} aria-pressed={days.includes(d)} aria-label={WEEKDAYS_NAMES[d]} onClick={() => toggle(d)}>{WEEKDAYS_SHORT[d]}</button>
        ))}</div>
      </Field>
      <div className="row gap">
        <button type="button" className="btn small" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>Todos</button>
        <button type="button" className="btn small" onClick={() => setDays([1, 2, 3, 4, 5])}>Entre semana</button>
      </div>
      <div className="row gap">
        {habit && (
          <button className="btn danger" onClick={async () => {
            if (await confirm('Se eliminará el hábito y todo su historial de cumplimiento.', 'Eliminar')) { if (await guard(() => deleteHabit(habit.id), 'Hábito eliminado')) onClose(); }
          }}>Eliminar</button>
        )}
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

/** Lista de hábitos de hoy (reutilizada en Inicio). */
export function TodayHabits({ compact = false }: { compact?: boolean }) {
  const habits = useCollection('habits');
  const comps = useCollection('habitCompletions');
  const { guard } = useUI();
  const today = toDateKey();
  if (habits.loading || comps.loading) return <Loading />;
  const list = habitsForDay(habits.items, today);
  if (list.length === 0) return <p className="muted">{compact ? 'No tienes hábitos programados para hoy.' : 'Sin hábitos programados hoy.'}</p>;
  const done = new Set(comps.items.filter((c) => c.date === today).map((c) => c.habitId));
  return (
    <div className="list">
      {list.map((h) => (
        <div key={h.id} className={`item ${done.has(h.id) ? 'done' : ''}`}>
          <button className={`check ${done.has(h.id) ? 'on' : ''}`} aria-label={`${h.name}: ${done.has(h.id) ? 'desmarcar' : 'marcar como hecho'}`}
            onClick={() => guard(() => setHabitDone(h.id, today, !done.has(h.id)))}><Icon name="check" /></button>
          <span className="title grow">{h.name}</span>
        </div>
      ))}
    </div>
  );
}

export function Habits() {
  const habits = useCollection('habits');
  const comps = useCollection('habitCompletions');
  const [form, setForm] = useState<{ habit?: Habit; preset?: string } | null>(null);
  const today = toDateKey();
  if (habits.loading || comps.loading) return <Loading />;
  if (habits.error) return <ErrorBox error={habits.error} onRetry={habits.reload} />;
  const active = habits.items.filter((h) => !h.archived);
  const todayList = habitsForDay(habits.items, today);
  const done = new Set(comps.items.filter((c) => c.date === today).map((c) => c.habitId));

  return (
    <>
      {active.length === 0 ? (
        <EmptyState icon="repeat" title="Aún no tienes hábitos" action={<div className="wordlist">{HABIT_SUGGESTIONS.map((s) => <button key={s} className="btn small" onClick={() => setForm({ preset: s })}>{s}</button>)}</div>}>
          Un hábito es algo pequeño que repites. Elige una sugerencia o crea el tuyo.
        </EmptyState>
      ) : (
        <>
          <div className="card">
            <h2>Hoy ({done.size}/{todayList.length})</h2>
            {todayList.length > 0 && <ProgressBar value={done.size / todayList.length} label="Hábitos de hoy" />}
            <TodayHabits />
          </div>
          <h3>Tus hábitos</h3>
          <div className="list">
            {active.map((h) => {
              const s = habitStats(h, comps.items, today);
              return (
                <div key={h.id} className="card flat">
                  <div className="row between gap">
                    <div className="grow">
                      <div className="title">{h.name}</div>
                      <small>{h.days.length === 7 ? 'Todos los días' : ORDER.filter((d) => h.days.includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(' ')}</small>
                    </div>
                    <button className="icon-btn" aria-label={`Editar ${h.name}`} onClick={() => setForm({ habit: h })}><Icon name="edit" /></button>
                  </div>
                  <ProgressBar value={s.weekExpected ? s.weekDone / s.weekExpected : 0} label={`Semana de ${h.name}`} />
                  <small>Esta semana: {s.weekDone}/{s.weekExpected || 0} · Últimos 30 días: {pct(s.monthRate)} · Últimos 7 días: {s.daysDoneLast7} {s.daysDoneLast7 === 1 ? 'día' : 'días'}</small>
                </div>
              );
            })}
          </div>
          <p className="notice">Aquí no hay «rachas rotas»: un día sin cumplir no borra lo que ya has hecho. Lo importante es volver.</p>
        </>
      )}
      <button className="fab" aria-label="Nuevo hábito" onClick={() => setForm({})}><Icon name="plus" size={28} /></button>
      {form && <HabitForm habit={form.habit} preset={form.preset} onClose={() => setForm(null)} />}
    </>
  );
}
