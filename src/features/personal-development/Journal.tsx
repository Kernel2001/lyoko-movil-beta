import { useState } from 'react';
import type { PersonalReflection, ReflectionAnswers } from '../../types';
import { EmptyState, ErrorBox, Field, Icon, Loading, Sheet, useUI } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { repos } from '../../services/storage';
import { formatLong, toDateKey } from '../../utils/dates';
import { newId, nowISO } from '../../utils/misc';

const QUESTIONS: { key: keyof ReflectionAnswers; label: string }[] = [
  { key: 'wellDone', label: '¿Qué he hecho bien hoy?' },
  { key: 'improve', label: '¿Qué podría mejorar?' },
  { key: 'learned', label: '¿Qué he aprendido?' },
  { key: 'decision', label: '¿Qué decisión he tomado y por qué?' },
  { key: 'tomorrow', label: '¿Qué haré de forma diferente mañana?' },
];
const EMPTY: ReflectionAnswers = { wellDone: '', improve: '', learned: '', decision: '', tomorrow: '' };

function EntryForm({ entry, onClose }: { entry?: PersonalReflection; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  const [date, setDate] = useState(entry?.date ?? toDateKey());
  const [a, setA] = useState<ReflectionAnswers>(entry?.answers ?? EMPTY);
  const [err, setErr] = useState('');
  async function save() {
    if (!Object.values(a).some((v) => v.trim())) { setErr('Responde al menos una pregunta (todas son opcionales).'); return; }
    if (!date) { setErr('Elige una fecha.'); return; }
    const now = nowISO();
    const ok = await guard(() => repos.reflections.put({
      id: entry?.id ?? newId(), kind: 'diario', date, title: '', text: '',
      answers: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.trim()])) as unknown as ReflectionAnswers,
      createdAt: entry?.createdAt ?? now, updatedAt: now,
    }));
    if (ok) { toast('Entrada guardada'); onClose(); }
  }
  return (
    <Sheet title={entry ? 'Editar entrada' : 'Entrada del diario'} onClose={onClose}>
      <Field label="Fecha"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {QUESTIONS.map((q) => (
        <Field key={q.key} label={q.label}><textarea value={a[q.key]} onChange={(e) => setA((s) => ({ ...s, [q.key]: e.target.value }))} /></Field>
      ))}
      {err && <small className="err" role="alert">{err}</small>}
      <div className="row gap">
        {entry && <button className="btn danger" onClick={async () => { if (await confirm('Se eliminará esta entrada del diario.', 'Eliminar') && await guard(() => repos.reflections.remove(entry.id), 'Entrada eliminada')) onClose(); }}>Eliminar</button>}
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

export function Journal() {
  const { items, loading, error, reload } = useCollection('reflections');
  const [form, setForm] = useState<{ entry?: PersonalReflection } | null>(null);
  const [filter, setFilter] = useState('');
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const entries = items.filter((r) => r.kind === 'diario' && (!filter || r.date === filter)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <p className="notice">Tu diario es privado y se guarda sólo en este dispositivo.</p>
      <button className="btn primary" onClick={() => setForm({})}><Icon name="plus" size={18} /> Escribir hoy</button>
      <Field label="Consultar por fecha"><div className="row gap"><input type="date" value={filter} onChange={(e) => setFilter(e.target.value)} />{filter && <button className="btn small" onClick={() => setFilter('')}>Ver todo</button>}</div></Field>
      {entries.length === 0 ? (
        <EmptyState icon="book" title={filter ? 'No hay entradas ese día' : 'Tu diario está vacío'}>{filter ? 'Prueba con otra fecha o pulsa «Ver todo».' : 'Escribe unas líneas al final del día: ¿qué ha ido bien y qué harás distinto?'}</EmptyState>
      ) : (
        <div className="list">
          {entries.map((r) => (
            <details key={r.id} className="card flat">
              <summary><span className="grow">{formatLong(r.date)}</span><button className="icon-btn" aria-label="Editar entrada" onClick={(e) => { e.preventDefault(); setForm({ entry: r }); }}><Icon name="edit" /></button></summary>
              {QUESTIONS.filter((q) => r.answers[q.key]).map((q) => <p key={q.key}><b>{q.label}</b><br />{r.answers[q.key]}</p>)}
            </details>
          ))}
        </div>
      )}
      {form && <EntryForm entry={form.entry} onClose={() => setForm(null)} />}
    </>
  );
}
