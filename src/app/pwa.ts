import { registerSW } from 'virtual:pwa-register';
import { useEffect, useState } from 'react';

type State = { needRefresh: boolean; offlineReady: boolean };
let state: State = { needRefresh: false, offlineReady: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

export function initPwa() {
  updateSW = registerSW({
    onNeedRefresh: () => set({ needRefresh: true }),
    onOfflineReady: () => set({ offlineReady: true }),
  });
}

export const applyUpdate = () => updateSW?.(true);
export const dismissPwaNotice = () => set({ needRefresh: false, offlineReady: false });

export function usePwaState(): State {
  const [s, setS] = useState(state);
  useEffect(() => {
    const l = () => setS(state);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return s;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
