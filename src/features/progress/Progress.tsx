import { useState } from 'react';
import { Bars, EmptyState, ErrorBox, Loading, Segmented } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { summarizeProgress } from '../../services/progress';
import { pct } from '../../services/scoring';
import { SCORE_DISCLAIMER } from '../../data/exercises/catalog';
import { formatShort } from '../../utils/dates';

export function Progress() {
  const tasks = useCollection('tasks');
  const habits = useCollection('habits');
  const completions = useCollection('habitCompletions');
  const sessions = useCollection('sessions');
  const goals = useCollection('goals');
  const [days, setDays] = useState<7 | 30>(7);

  if ([tasks, habits, completions, sessions, goals].some((c) => c.loading)) return <Loading />;
  const err = [tasks, habits, completions, sessions, goals].find((c) => c.error);
  if (err) return <ErrorBox error={err.error!} onRetry={err.reload} />;

  const s = summarizeProgress({ tasks: tasks.items, habits: habits.items, completions: completions.items, sessions: sessions.items, goals: goals.items }, days);
  const label = (d: string, i: number) => (days === 7 ? formatShort(d).split(' ')[0] : i % 5 === 0 ? formatShort(d).split(' ')[0] : '');

  return (
    <>
      <div className="page-head"><h1>Progreso</h1></div>
      <Segmented<string> label="Periodo" value={String(days)} onChange={(v) => setDays(Number(v) as 7 | 30)} options={[{ value: '7', label: '7 días' }, { value: '30', label: '30 días' }]} />

      {!s.hasData && (
        <EmptyState icon="chart" title="Todavía no hay datos">
          Completa una tarea, marca un hábito o termina una sesión de entrenamiento y verás aquí tu primera medición. No mostramos datos inventados.
        </EmptyState>
      )}

      <div className="grid2">
        <div className="stat"><b>{s.tasksCompleted}</b><span>Tareas completadas</span></div>
        <div className="stat"><b>{s.habitsCompleted}{s.habitsExpected > 0 && <small> / {s.habitsExpected}</small>}</b><span>Hábitos cumplidos</span></div>
        <div className="stat"><b>{s.sessions}</b><span>Sesiones cognitivas</span></div>
        <div className="stat"><b>{s.trainingMinutes} min</b><span>Tiempo de entrenamiento</span></div>
        <div className="stat"><b>{s.activeGoals}</b><span>Objetivos activos</span></div>
        <div className="stat"><b>{pct(s.accuracy)}</b><span>Precisión en juegos</span></div>
      </div>

      <div className="card">
        <h3>Minutos de entrenamiento por día</h3>
        <Bars points={s.series.map((p, i) => ({ label: label(p.date, i), value: p.minutes }))} label="Minutos de entrenamiento" unit="min" />
      </div>
      <div className="card">
        <h3>Tareas y hábitos por día</h3>
        <Bars points={s.series.map((p, i) => ({ label: label(p.date, i), value: p.tasks + p.habits }))} label="Tareas y hábitos completados" unit="completados" />
      </div>
      <p className="notice">{SCORE_DISCLAIMER} Aquí no hay rankings ni comparaciones: sólo tu propia evolución.</p>
    </>
  );
}
