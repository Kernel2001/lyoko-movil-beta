import { useState } from 'react';
import type { PersonalPrinciple, PersonalReflection } from '../../types';
import { EmptyState, ErrorBox, Field, Icon, Loading, Segmented, Sheet, useUI } from '../../components/ui';
import { useCollection } from '../../hooks/useCollection';
import { repos } from '../../services/storage';
import { newId, nowISO } from '../../utils/misc';
import { formatShort, toDateKey } from '../../utils/dates';

type Kind = PersonalPrinciple['kind'];

function PrincipleForm({ item, kind, onClose }: { item?: PersonalPrinciple; kind: Kind; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  const [f, setF] = useState({ name: item?.name ?? '', description: item?.description ?? '', why: item?.why ?? '', how: item?.how ?? '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.name.trim()) { setErr('Escribe un nombre.'); return; }
    const now = nowISO();
    const ok = await guard(() => repos.principles.put({
      id: item?.id ?? newId(), kind: item?.kind ?? kind, name: f.name.trim(), description: f.description.trim(), why: f.why.trim(), how: f.how.trim(),
      createdAt: item?.createdAt ?? now, updatedAt: now,
    }));
    if (ok) { toast('Guardado'); onClose(); }
  }
  const noun = (item?.kind ?? kind) === 'valor' ? 'valor' : 'principio';
  return (
    <Sheet title={item ? `Editar ${noun}` : `Nuevo ${noun}`} onClose={onClose}>
      <Field label="Nombre" error={err}><input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
      <Field label="Descripción"><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="¿Por qué es importante para mí?"><textarea value={f.why} onChange={(e) => set('why', e.target.value)} /></Field>
      <Field label="¿Cómo lo aplico en la vida diaria?"><textarea value={f.how} onChange={(e) => set('how', e.target.value)} /></Field>
      <div className="row gap">
        {item && <button className="btn danger" onClick={async () => { if (await confirm(`Se eliminará «${item.name}».`, 'Eliminar') && await guard(() => repos.principles.remove(item.id), 'Eliminado')) onClose(); }}>Eliminar</button>}
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

function NoteForm({ item, onClose }: { item?: PersonalReflection; onClose: () => void }) {
  const { guard, confirm, toast } = useUI();
  const [title, setTitle] = useState(item?.title ?? '');
  const [text, setText] = useState(item?.text ?? '');
  const [err, setErr] = useState('');
  async function save() {
    if (!text.trim()) { setErr('Escribe tu reflexión.'); return; }
    const now = nowISO();
    const ok = await guard(() => repos.reflections.put({
      id: item?.id ?? newId(), kind: 'nota', date: item?.date ?? toDateKey(), title: title.trim(), text: text.trim(),
      answers: item?.answers ?? { wellDone: '', improve: '', learned: '', decision: '', tomorrow: '' },
      createdAt: item?.createdAt ?? now, updatedAt: now,
    }));
    if (ok) { toast('Reflexión guardada'); onClose(); }
  }
  return (
    <Sheet title={item ? 'Editar reflexión' : 'Nueva reflexión'} onClose={onClose}>
      <Field label="Título (opcional)"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Reflexión" error={err}><textarea style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} autoFocus /></Field>
      <div className="row gap">
        {item && <button className="btn danger" onClick={async () => { if (await confirm('Se eliminará esta reflexión.', 'Eliminar') && await guard(() => repos.reflections.remove(item.id), 'Eliminada')) onClose(); }}>Eliminar</button>}
        <button className="btn primary grow" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

export function Philosophy() {
  const principles = useCollection('principles');
  const reflections = useCollection('reflections');
  const [kind, setKind] = useState<Kind>('principio');
  const [form, setForm] = useState<{ item?: PersonalPrinciple } | null>(null);
  const [note, setNote] = useState<{ item?: PersonalReflection } | null>(null);
  if (principles.loading || reflections.loading) return <Loading />;
  if (principles.error) return <ErrorBox error={principles.error} onRetry={principles.reload} />;
  const list = principles.items.filter((p) => p.kind === kind).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const notes = reflections.items.filter((r) => r.kind === 'nota').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <p className="notice">Tu filosofía es tuya: estos ejemplos son sólo un punto de partida. Edítalos, elimínalos o escribe los tuyos.</p>
      <Segmented<Kind> label="Tipo" value={kind} onChange={setKind} options={[{ value: 'principio', label: 'Principios' }, { value: 'valor', label: 'Valores' }]} />
      {list.length === 0 ? (
        <EmptyState icon="book" title={kind === 'valor' ? 'Aún no has registrado valores' : 'Aún no tienes principios'}
          action={<button className="btn primary" onClick={() => setForm({})}>Añadir {kind}</button>}>
          {kind === 'valor' ? 'Un valor es algo que consideras importante: honestidad, libertad, familia…' : 'Un principio es una regla que quieres aplicar al actuar.'}
        </EmptyState>
      ) : (
        <div className="list">
          {list.map((p) => (
            <details key={p.id} className="card flat">
              <summary><span className="grow">{p.name}</span><button className="icon-btn" aria-label={`Editar ${p.name}`} onClick={(e) => { e.preventDefault(); setForm({ item: p }); }}><Icon name="edit" /></button></summary>
              {p.description && <p>{p.description}</p>}
              {p.why && <p><b>Por qué importa: </b>{p.why}</p>}
              {p.how && <p><b>Cómo aplicarlo: </b>{p.how}</p>}
              <small>Creado el {formatShort(p.createdAt.slice(0, 10))}</small>
            </details>
          ))}
        </div>
      )}
      <button className="btn" onClick={() => setForm({})}><Icon name="plus" size={18} /> Añadir {kind}</button>

      <h2>Mis reflexiones</h2>
      {notes.length === 0 ? <p className="muted">Todavía no has escrito reflexiones sobre tu filosofía.</p> : (
        <div className="list">
          {notes.map((n) => (
            <button key={n.id} className="item option btn" onClick={() => setNote({ item: n })}>
              <div className="grow"><div className="title">{n.title || n.text.slice(0, 40)}</div><small>{formatShort(n.date)}</small></div>
              <Icon name="edit" size={18} />
            </button>
          ))}
        </div>
      )}
      <button className="btn" onClick={() => setNote({})}><Icon name="plus" size={18} /> Nueva reflexión</button>
      {form && <PrincipleForm item={form.item} kind={kind} onClose={() => setForm(null)} />}
      {note && <NoteForm item={note.item} onClose={() => setNote(null)} />}
    </>
  );
}
