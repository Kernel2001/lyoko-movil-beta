import { useRef, useState } from 'react';
import type { Level } from '../../types';
import { Field, Icon, Sheet, useUI } from '../../components/ui';
import { usePrefs } from '../../app/prefs';
import { LEVEL_LABELS } from '../../services/difficulty';
import { backupToJson, buildBackup, deleteAllData, importBackup, parseBackup, type BackupFile, type ValidationResult } from '../../services/export/backup';
import { notificationPermission, requestNotificationPermission } from '../../services/notifications/notifications';
import { toDateKey } from '../../utils/dates';

const STORE_LABELS: Record<string, string> = {
  tasks: 'tareas', habits: 'hábitos', habitCompletions: 'cumplimientos de hábitos', goals: 'objetivos', principles: 'principios y valores',
  reflections: 'reflexiones y entradas del diario', sessions: 'sesiones', attempts: 'intentos de ejercicios', levels: 'niveles', preferences: 'preferencias',
};

function ImportSheet({ backup, result, onClose }: { backup: BackupFile; result: ValidationResult; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  async function run(mode: 'combinar' | 'reemplazar') {
    if (mode === 'reemplazar' && !(await confirm('Se sustituirán TODOS tus datos actuales por los de la copia. Te recomendamos exportar antes una copia de lo que tienes ahora.', 'Reemplazar todo'))) return;
    const ok = await guard(async () => {
      const r = await importBackup(backup, mode);
      toast(mode === 'combinar' ? `Importado: ${r.added} registros nuevos (los existentes no se tocaron)` : 'Copia restaurada');
    });
    if (ok) onClose();
  }
  return (
    <Sheet title="Importar copia de seguridad" onClose={onClose}>
      <p>La copia es válida. Contiene:</p>
      <ul className="steps">{Object.entries(result.counts).filter(([, n]) => n).map(([k, n]) => <li key={k}>{n} {STORE_LABELS[k] ?? k}</li>)}</ul>
      <button className="btn primary" onClick={() => run('combinar')}>Combinar (seguro)</button>
      <small>Añade lo que falte y NO sobrescribe nada de lo que ya tienes.</small>
      <button className="btn danger" onClick={() => run('reemplazar')}>Reemplazar todo</button>
      <small>Borra tus datos actuales y deja exactamente los de la copia.</small>
    </Sheet>
  );
}

export function Settings() {
  const { prefs, update } = usePrefs();
  const { guard, confirm, toast } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imp, setImp] = useState<{ backup: BackupFile; result: ValidationResult } | null>(null);
  const [name, setName] = useState(prefs.name);
  const [objective, setObjective] = useState(prefs.mainObjective);
  const [weekly, setWeekly] = useState(String(prefs.weeklyGoalMinutes));
  const [perm, setPerm] = useState(notificationPermission());
  const [wipe, setWipe] = useState(false);
  const [wipeText, setWipeText] = useState('');

  async function exportData() {
    await guard(async () => {
      const json = backupToJson(await buildBackup());
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-lyoko-copia-${toDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'Copia de seguridad exportada');
  }

  async function pickFile(file?: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast('El archivo es demasiado grande para ser una copia de Lyoko.', 'error'); return; }
    const text = await file.text();
    const { backup, result } = parseBackup(text);
    if (!backup) { toast(`Copia no válida. ${result.errors[0] ?? ''} No se ha modificado nada.`, 'error'); return; }
    setImp({ backup, result });
  }

  async function toggleReminders(on: boolean) {
    if (on) {
      const p = notificationPermission() === 'granted' ? 'granted' : await requestNotificationPermission();
      setPerm(p);
      if (p !== 'granted') toast('Sin permiso de notificaciones, los avisos se mostrarán dentro de la app (sólo si está abierta).');
    }
    await guard(() => update({ remindersEnabled: on }));
  }

  return (
    <>
      <div className="page-head"><h1>Configuración</h1></div>

      <div className="card">
        <h2>Perfil</h2>
        <Field label="Nombre o alias"><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={() => guard(() => update({ name: name.trim() }))} /></Field>
        <Field label="Objetivo principal"><input value={objective} maxLength={120} onChange={(e) => setObjective(e.target.value)} onBlur={() => guard(() => update({ mainObjective: objective.trim() }))} /></Field>
        <Field label="Tema">
          <select value={prefs.theme} onChange={(e) => guard(() => update({ theme: e.target.value as typeof prefs.theme }))}>
            <option value="dark">Oscuro</option><option value="light">Claro</option><option value="system">Según el sistema</option>
          </select>
        </Field>
      </div>

      <div className="card">
        <h2>Entrenamiento</h2>
        <Field label="Dificultad inicial" hint="Se usa en ejercicios que aún no tienen nivel. Los ya jugados se ajustan solos (o a mano en su área).">
          <select value={prefs.initialDifficulty} onChange={(e) => guard(() => update({ initialDifficulty: Number(e.target.value) as Level }))}>
            {([1, 2, 3, 4, 5] as Level[]).map((l) => <option key={l} value={l}>{l} · {LEVEL_LABELS[l]}</option>)}
          </select>
        </Field>
        <Field label="Duración preferida de la sesión">
          <select value={prefs.sessionMinutes} onChange={(e) => guard(() => update({ sessionMinutes: Number(e.target.value) as 3 | 5 | 10 }))}>
            <option value={3}>3 minutos</option><option value={5}>5 minutos</option><option value={10}>10 minutos</option>
          </select>
        </Field>
        <Field label="Objetivo semanal (minutos)">
          <input type="number" inputMode="numeric" min={0} max={1000} value={weekly} onChange={(e) => setWeekly(e.target.value)} onBlur={() => {
            // Un valor vacío o ilegible no debe poner el objetivo a 0: se conserva el anterior.
            const n = Number(weekly);
            if (weekly.trim() === '' || !Number.isFinite(n)) { setWeekly(String(prefs.weeklyGoalMinutes)); return; }
            void guard(() => update({ weeklyGoalMinutes: Math.max(0, n) }));
          }} />
        </Field>
      </div>

      <div className="card">
        <h2>Recordatorios</h2>
        <label className="row gap"><input type="checkbox" checked={prefs.remindersEnabled} onChange={(e) => toggleReminders(e.target.checked)} /> Activar recordatorios</label>
        <Field label="Aviso diario de entrenamiento (opcional)"><input type="time" value={prefs.dailyReminderTime} onChange={(e) => guard(() => update({ dailyReminderTime: e.target.value }))} /></Field>
        <small>Permiso de notificaciones: {{ granted: 'concedido', denied: 'denegado (cámbialo en los ajustes del navegador)', default: 'sin decidir', unsupported: 'no disponible en este navegador' }[perm]}</small>
        <p className="notice"><b>Limitación:</b> sin un servidor, los avisos sólo se emiten mientras la app está abierta o recién pasada a segundo plano. Con la app cerrada, el sistema no los entrega. En iPhone, las notificaciones sólo funcionan si instalas la app en la pantalla de inicio (iOS 16.4 o superior). Para no depender de ellos, usa también las alarmas de tu móvil.</p>
      </div>

      <div className="card">
        <h2>Copias de seguridad</h2>
        <p>Tus datos viven sólo en este dispositivo. Exporta una copia con regularidad y guárdala fuera del móvil.</p>
        <button className="btn primary" onClick={exportData}><Icon name="download" size={20} /> Exportar copia (JSON)</button>
        <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={20} /> Importar copia</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }} />
        <small>Antes de modificar nada, la copia se valida. Si tiene errores, no se toca ningún dato.</small>
      </div>

      <div className="card">
        <h2>Privacidad y límites</h2>
        <ul className="steps">
          <li>Sin cuenta, sin servidor, sin analítica ni publicidad. Nada sale de tu dispositivo.</li>
          <li>Si borras los datos del navegador o desinstalas la app, <b>se pierden tus datos</b> (por eso las copias).</li>
          <li>Las puntuaciones miden tu práctica en estos ejercicios; no son un diagnóstico ni un test de inteligencia, memoria o atención.</li>
          <li>Los datos no se sincronizan entre dispositivos. Para moverlos, exporta e importa.</li>
          <li>Los ejercicios y respuestas se generan con reglas locales; no hay IA en esta beta.</li>
        </ul>
        <details><summary>Cómo instalar la app</summary>
          <p><b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación» o «Añadir a la pantalla de inicio».</p>
          <p><b>iPhone/iPad (Safari):</b> botón Compartir → «Añadir a pantalla de inicio».</p>
        </details>
      </div>

      <div className="card" style={{ borderColor: 'var(--danger)' }}>
        <h2>Zona de peligro</h2>
        <p>Eliminar todos tus datos de este dispositivo. No se puede deshacer.</p>
        <button className="btn danger" onClick={() => setWipe(true)}>Eliminar todos los datos…</button>
      </div>
      <small className="muted">Project Lyoko Móvil Beta · versión 0.1.0</small>

      {imp && <ImportSheet backup={imp.backup} result={imp.result} onClose={() => setImp(null)} />}
      {wipe && (
        <Sheet title="Eliminar todos los datos" onClose={() => { setWipe(false); setWipeText(''); }}>
          <p>Se borrarán tareas, hábitos, objetivos, diario, historial de entrenamiento y preferencias. Exporta antes una copia si quieres conservarla.</p>
          <Field label="Escribe ELIMINAR para confirmar"><input value={wipeText} onChange={(e) => setWipeText(e.target.value)} autoCapitalize="characters" /></Field>
          <button className="btn danger" disabled={wipeText.trim().toUpperCase() !== 'ELIMINAR'}
            onClick={async () => {
              if (!(await confirm('Última confirmación: se eliminará todo.', 'Eliminar todo'))) return;
              if (await guard(deleteAllData)) { setWipe(false); setWipeText(''); toast('Todos los datos han sido eliminados'); }
            }}>Eliminar definitivamente</button>
        </Sheet>
      )}
    </>
  );
}
