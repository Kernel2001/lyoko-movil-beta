import { Bars, EmptyState, ErrorBox, Loading } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { AREAS, AREA_INFO, EXERCISES, SCORE_DISCLAIMER, sessionAreaLabel } from '../../data/exercises/catalog';
import { pct, secs, summarize } from '../../services/scoring';
import { weeklyProgress } from '../../services/progress';
import { formatShort } from '../../utils/dates';
import { ProgressBar } from '../../components/ui';
import { usePrefs } from '../../app/prefs';

export function History() {
  const sessions = useCollection('sessions');
  const attempts = useCollection('attempts');
  const levels = useCollection('levels');
  const { prefs } = usePrefs();
  if (sessions.loading || attempts.loading || levels.loading) return <Loading />;
  if (sessions.error || attempts.error) return <ErrorBox error={(sessions.error ?? attempts.error)!} onRetry={sessions.reload} />;
  if (sessions.items.length === 0) {
    return <EmptyState icon="brain" title="Aún no hay sesiones">Completa tu primera sesión para ver aquí tu historial. No mostramos datos de ejemplo.</EmptyState>;
  }

  const week = weeklyProgress({ tasks: [], habits: [], completions: [], goals: [], sessions: sessions.items });
  const totalSec = sessions.items.reduce((a, s) => a + s.durationSec, 0);
  const games = sessions.items.filter((s) => s.kind === 'juegos');
  const focus = sessions.items.filter((s) => s.kind === 'enfoque').sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const byEx = new Map<string, typeof attempts.items>();
  attempts.items.forEach((a) => byEx.set(a.exerciseId, [...(byEx.get(a.exerciseId) ?? []), a]));

  return (
    <>
      <div className="card">
        <h2>Resumen</h2>
        <div className="grid2">
          <div className="stat"><b>{sessions.items.length}</b><span>Sesiones completadas</span></div>
          <div className="stat"><b>{Math.round(totalSec / 60)} min</b><span>Tiempo total</span></div>
        </div>
        <small>Objetivo semanal: {week.trainingMinutes} / {prefs.weeklyGoalMinutes} min</small>
        <ProgressBar value={prefs.weeklyGoalMinutes ? week.trainingMinutes / prefs.weeklyGoalMinutes : 0} label="Objetivo semanal" />
      </div>

      <div className="card">
        <h3>Precisión por categoría</h3>
        <small>Cada categoría se mide con su propia escala; no se comparan entre sí.</small>
        {AREAS.map((a) => {
          const list = attempts.items.filter((x) => x.area === a);
          const s = summarize(list);
          return (
            <div key={a} className="item">
              <div className="grow"><div className="title">{AREA_INFO[a].label}</div><small>{list.length} intentos · {secs(s.avgResponseMs)} de media</small></div>
              <b>{pct(s.accuracy)}</b>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Evolución por ejercicio</h3>
        <small>Barras: precisión de las últimas sesiones (de antigua a reciente).</small>
        {EXERCISES.filter((e) => e.scored && byEx.has(e.id)).map((e) => {
          const list = byEx.get(e.id)!;
          const bySession = new Map<string, typeof list>();
          list.forEach((a) => bySession.set(a.sessionId, [...(bySession.get(a.sessionId) ?? []), a]));
          const points = [...bySession.values()]
            .sort((x, y) => x[0].createdAt.localeCompare(y[0].createdAt)).slice(-12)
            .map((l) => ({ label: formatShort(l[0].date), value: Math.round((summarize(l).accuracy ?? 0) * 100), level: l[0].level }));
          const lvl = levels.items.find((l) => l.id === e.id);
          return (
            <div key={e.id} className="stack">
              <div className="row between"><b>{e.name}</b>{lvl && <span className="tag-level">Nivel {lvl.level}</span>}</div>
              <Bars points={points} label={`Precisión en ${e.name}`} unit="%" />
              <small>Niveles jugados: {points.map((p) => p.level).join(' → ')}</small>
              {lvl && <small className="muted">{lvl.lastChange}</small>}
            </div>
          );
        })}
      </div>

      {focus.length > 0 && (
        <div className="card">
          <h3>Sesiones de enfoque (autoevaluación)</h3>
          {focus.slice(0, 8).map((s) => (
            <div key={s.id} className="item">
              <div className="grow"><div className="title">{formatShort(s.date)} · {Math.round(s.durationSec / 60)} min</div>
                <small>{s.focus?.maintained === 'si' ? 'Mantuviste el enfoque' : s.focus?.maintained === 'parcialmente' ? 'Enfoque parcial' : 'Te costó enfocarte'}{s.focus?.distractions ? ` · ${s.focus.distractions}` : ''}</small></div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Últimas sesiones</h3>
        {[...games].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 8).map((s) => (
          <div key={s.id} className="item">
            <div className="grow"><div className="title">{sessionAreaLabel(s.area)}</div><small>{formatShort(s.date)} · {Math.max(1, Math.round(s.durationSec / 60))} min · {s.attempts} intentos</small></div>
            <b>{pct(s.accuracy)}</b>
          </div>
        ))}
        {games.length === 0 && <p className="muted">Sólo hay sesiones de enfoque por ahora.</p>}
      </div>
      <p className="notice">{SCORE_DISCLAIMER}</p>
    </>
  );
}
