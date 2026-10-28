import { useState } from 'react';
import { Icon, Loading, ProgressBar } from '../../components/ui';
import { usePrefs } from '../../app/prefs';
import { navigate } from '../../app/nav';
import { useCollection } from '../../hooks/useCollection';
import { filterTasks } from '../../services/tasks';
import { weeklyProgress } from '../../services/progress';
import { dailyQuestion } from '../../data/seed';
import { formatLong, greeting, toDateKey } from '../../utils/dates';
import { nextActionOf } from '../../services/goals';
import { TaskRow, TaskForm } from '../tasks/Tasks';
import { TodayHabits } from '../tasks/Habits';

export function Dashboard() {
  const { prefs } = usePrefs();
  const tasks = useCollection('tasks');
  const sessions = useCollection('sessions');
  const completions = useCollection('habitCompletions');
  const goals = useCollection('goals');
  const [adding, setAdding] = useState(false);
  const today = toDateKey();

  if (tasks.loading || sessions.loading || completions.loading || goals.loading) return <Loading />;

  const pending = filterTasks(tasks.items, 'hoy', today);
  const week = weeklyProgress({ tasks: tasks.items, habits: [], completions: completions.items, sessions: sessions.items, goals: goals.items }, today);
  const totalMin = Math.round(sessions.items.reduce((a, s) => a + s.durationSec, 0) / 60);
  const active = goals.items.filter((g) => g.status === 'activo');
  const nextGoal = active.map((g) => ({ g, next: nextActionOf(g) })).find((x) => x.next);
  const weekRatio = prefs.weeklyGoalMinutes ? week.trainingMinutes / prefs.weeklyGoalMinutes : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{formatLong(today)}</div>
          <h1>{greeting()}{prefs.name ? `, ${prefs.name}` : ''}</h1>
        </div>
        <a className="icon-btn" href="#/config" aria-label="Configuración"><Icon name="gear" /></a>
      </div>

      <button className="btn primary hero" onClick={() => navigate('entrenar')}><Icon name="bolt" size={22} /> Iniciar entrenamiento cognitivo</button>

      <div className="card">
        <div className="row gap"><Icon name="flag" size={20} /><h2>Objetivo principal</h2></div>
        {prefs.mainObjective ? <p><b>{prefs.mainObjective}</b></p> : (
          <p className="muted">Aún no has definido un objetivo principal. <a href="#/config">Añádelo en Configuración</a>.</p>
        )}
        {nextGoal && <div className="feedback"><small>Próxima acción · {nextGoal.g.title}</small><div><b>{nextGoal.next}</b></div></div>}
        {!nextGoal && active.length === 0 && <a href="#/desarrollo">Crear un objetivo con su primera acción →</a>}
      </div>

      <div className="card">
        <div className="row between"><h2>Tareas de hoy</h2><span className="chip">{pending.length}</span></div>
        {pending.length === 0 ? <p className="muted">No tienes tareas pendientes. {tasks.items.length === 0 && 'Añade la primera.'}</p>
          : <div className="list">{pending.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} today={today} />)}</div>}
        {pending.length > 5 && <a href="#/organizacion">Ver las {pending.length} tareas →</a>}
        <button className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Nueva tarea</button>
      </div>

      <div className="card">
        <h2>Hábitos de hoy</h2>
        <TodayHabits compact />
        <a href="#/organizacion">Gestionar hábitos →</a>
      </div>

      <div className="card">
        <h2>Esta semana</h2>
        <div className="grid2">
          <div className="stat"><b>{week.trainingMinutes} min</b><span>Entrenamiento (total: {totalMin} min)</span></div>
          <div className="stat"><b>{week.tasksCompleted}</b><span>Tareas completadas</span></div>
        </div>
        {prefs.weeklyGoalMinutes > 0 && <><ProgressBar value={weekRatio} label="Objetivo semanal de entrenamiento" /><small>{Math.min(100, Math.round(weekRatio * 100))} % de tu objetivo de {prefs.weeklyGoalMinutes} min</small></>}
        {sessions.items.length === 0 && <p className="muted">Tu primera sesión de entrenamiento aparecerá aquí.</p>}
      </div>

      <div className="card">
        <h2><Icon name="bulb" size={20} /> Para pensar hoy</h2>
        <p>{dailyQuestion(today)}</p>
        <a href="#/desarrollo">Escribir en el diario →</a>
      </div>
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  );
}
