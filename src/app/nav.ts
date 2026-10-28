export type Route = 'inicio' | 'desarrollo' | 'organizacion' | 'entrenar' | 'progreso' | 'config';
export const ROUTES: Route[] = ['inicio', 'desarrollo', 'organizacion', 'entrenar', 'progreso', 'config'];

export function navigate(route: Route) {
  window.location.hash = `/${route}`;
}
