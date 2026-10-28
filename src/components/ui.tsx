import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StorageError } from '../services/storage';
import { ValidationError } from '../services/tasks';

// ---------- Iconos (trazo simple, 24x24) ----------
const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  compass: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  brain: 'M9 4a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 006 1V4a3 3 0 00-3 0zM15 4a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-6 1',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 00-2.2-1.3L14 3h-4l-.4 2.4a7 7 0 00-2.2 1.3l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-.9c.7.6 1.4 1 2.2 1.3L10 21h4l.4-2.4c.8-.3 1.5-.7 2.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  play: 'M7 4l13 8-13 8z',
  pause: 'M8 5v14M16 5v14',
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 11.5a.5.5 0 100 1',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h10',
  flag: 'M6 21V4M6 4h11l-2 4 2 4H6',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5v.5',
  repeat: 'M4 12a8 8 0 0113.5-5.8L20 8M20 4v4h-4M20 12a8 8 0 01-13.5 5.8L4 16M4 20v-4h4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
};

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

// ---------- Contexto de avisos y confirmaciones ----------
interface UIContextValue {
  toast: (msg: string, kind?: 'ok' | 'error') => void;
  confirm: (message: string, confirmLabel?: string) => Promise<boolean>;
  /** Ejecuta una acción y muestra un mensaje comprensible si falla. Devuelve true si salió bien. */
  guard: (fn: () => Promise<unknown>, okMsg?: string) => Promise<boolean>;
}
const UIContext = createContext<UIContextValue>(null as never);
export const useUI = () => useContext(UIContext);

export function messageOf(e: unknown): string {
  if (e instanceof ValidationError || e instanceof StorageError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return 'Ha ocurrido un error inesperado. Tus datos anteriores no se han modificado.';
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toastState, setToast] = useState<{ msg: string; kind: 'ok' | 'error'; id: number } | null>(null);
  const [dialog, setDialog] = useState<{ message: string; label: string; resolve: (v: boolean) => void } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    window.clearTimeout(timer.current);
    setToast({ msg, kind, id: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 6000 : 2800);
  }, []);
  const confirm = useCallback(
    (message: string, label = 'Confirmar') => new Promise<boolean>((resolve) => setDialog({ message, label, resolve })),
    [],
  );
  const guard = useCallback(async (fn: () => Promise<unknown>, okMsg?: string) => {
    try { await fn(); if (okMsg) toast(okMsg); return true; } catch (e) { toast(messageOf(e), 'error'); return false; }
  }, [toast]);

  const close = (v: boolean) => { dialog?.resolve(v); setDialog(null); };

  return (
    <UIContext.Provider value={{ toast, confirm, guard }}>
      {children}
      {toastState && (
        <div className={`toast ${toastState.kind}`} role="status" aria-live="polite" key={toastState.id}>{toastState.msg}</div>
      )}
      {dialog && (
        <Sheet title="¿Seguro?" onClose={() => close(false)}>
          <p>{dialog.message}</p>
          <div className="row gap">
            <button className="btn" onClick={() => close(false)}>Cancelar</button>
            <button className="btn danger" onClick={() => close(true)}>{dialog.label}</button>
          </div>
        </Sheet>
      )}
    </UIContext.Provider>
  );
}

// ---------- Componentes básicos ----------
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'compass', title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={32} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <small className="err" role="alert">{error}</small>}
    </label>
  );
}

export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return <div className="loading" role="status">{text}</div>;
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="card error-box" role="alert">
      <strong>No se pudieron cargar los datos.</strong>
      <p>{messageOf(error)}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

/** Barras sencillas para series cortas (7–30 días). */
export function Bars({ points, label, unit }: { points: { label: string; value: number }[]; label: string; unit: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="bars" role="img" aria-label={`${label}: ${points.map((p) => `${p.label} ${p.value} ${unit}`).join(', ')}`}>
      {points.map((p, i) => (
        <div key={i} className="bar-col" title={`${p.label}: ${p.value} ${unit}`}>
          <div className="bar" style={{ height: `${(p.value / max) * 100}%` }} data-zero={p.value === 0} />
          {points.length <= 10 && <span>{p.label}</span>}
        </div>
      ))}
    </div>
  );
}
