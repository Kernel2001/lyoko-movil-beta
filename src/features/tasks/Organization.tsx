import { useState } from 'react';
import { Segmented } from '../../components/ui';
import { Tasks } from './Tasks';
import { Habits } from './Habits';

export function Organization() {
  const [tab, setTab] = useState<'tareas' | 'habitos'>(() => (sessionStorage.getItem('lyoko.orgtab') as 'tareas' | 'habitos') || 'tareas');
  const change = (t: 'tareas' | 'habitos') => { setTab(t); try { sessionStorage.setItem('lyoko.orgtab', t); } catch { /* sin almacenamiento de sesión */ } };
  return (
    <>
      <div className="page-head"><h1>Organización</h1></div>
      <Segmented label="Sección" value={tab} onChange={change} options={[{ value: 'tareas', label: 'Tareas' }, { value: 'habitos', label: 'Hábitos' }]} />
      {tab === 'tareas' ? <Tasks /> : <Habits />}
    </>
  );
}
