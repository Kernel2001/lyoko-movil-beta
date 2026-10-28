import { useState } from 'react';
import type { Level } from '../../types';
import { Field, useUI } from '../../components/ui';
import { usePrefs } from '../../app/prefs';
import { LEVEL_LABELS } from '../../services/difficulty';

/** Configuración inicial breve: todo es opcional y se puede cambiar después. */
export function Onboarding() {
  const { prefs, update } = usePrefs();
  const { guard } = useUI();
  const [name, setName] = useState(prefs.name);
  const [objective, setObjective] = useState(prefs.mainObjective);
  const [level, setLevel] = useState<Level>(prefs.initialDifficulty);
  const [weekly, setWeekly] = useState(String(prefs.weeklyGoalMinutes));

  const start = () => guard(() => update({
    name: name.trim(), mainObjective: objective.trim(), initialDifficulty: level,
    weeklyGoalMinutes: weekly.trim() !== '' && Number.isFinite(Number(weekly)) ? Math.max(0, Number(weekly)) : 60, onboarded: true,
  }));

  return (
    <div className="page" style={{ paddingTop: 'calc(30px + env(safe-area-inset-top))' }}>
      <h1>Project Lyoko <span className="tag-level">Móvil Beta</span></h1>
      <p>Comprender → Planificar → Actuar → Evaluar → Mejorar. Una herramienta personal: sin cuenta, sin servidores, tus datos se quedan en este dispositivo.</p>
      <div className="card">
        <Field label="¿Cómo quieres que te llame? (opcional)"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" /></Field>
        <Field label="Tu objetivo principal ahora mismo (opcional)" hint="Una frase. Lo verás cada día en Inicio.">
          <input value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={120} placeholder="Ej.: Mejorar mi constancia al estudiar" />
        </Field>
        <Field label="Dificultad inicial del entrenamiento">
          <select value={level} onChange={(e) => setLevel(Number(e.target.value) as Level)}>
            {([1, 2, 3, 4, 5] as Level[]).map((l) => <option key={l} value={l}>{l} · {LEVEL_LABELS[l]}</option>)}
          </select>
        </Field>
        <Field label="Objetivo semanal de entrenamiento (minutos)"><input type="number" inputMode="numeric" min={0} max={1000} value={weekly} onChange={(e) => setWeekly(e.target.value)} /></Field>
        <button className="btn primary hero" onClick={start}>Empezar</button>
      </div>
      <p className="notice">Los datos se guardan en el navegador. Si borras los datos del sitio o desinstalas la app, se pierden: exporta copias de seguridad desde Configuración.</p>
    </div>
  );
}
