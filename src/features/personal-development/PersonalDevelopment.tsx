import { useState } from 'react';
import { Segmented } from '../../components/ui';
import { Philosophy } from './Principles';
import { Goals } from './Goals';
import { Journal } from './Journal';

type Tab = 'objetivos' | 'filosofia' | 'diario';

export function PersonalDevelopment() {
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem('lyoko.devtab') as Tab) || 'objetivos');
  const change = (t: Tab) => { setTab(t); try { sessionStorage.setItem('lyoko.devtab', t); } catch { /* sin almacenamiento de sesión */ } };
  return (
    <>
      <div className="page-head"><h1>Desarrollo personal</h1></div>
      <Segmented<Tab> label="Sección" value={tab} onChange={change}
        options={[{ value: 'objetivos', label: 'Objetivos' }, { value: 'filosofia', label: 'Filosofía' }, { value: 'diario', label: 'Diario' }]} />
      {tab === 'objetivos' && <Goals />}
      {tab === 'filosofia' && <Philosophy />}
      {tab === 'diario' && <Journal />}
    </>
  );
}
