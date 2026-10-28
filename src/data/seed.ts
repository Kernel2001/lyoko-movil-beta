import type { PersonalPrinciple } from '../types';
import { newId } from '../utils/misc';

/** Ejemplos iniciales: son sugerencias editables, no verdades universales. */
const SEEDS: Pick<PersonalPrinciple, 'name' | 'description' | 'why' | 'how'>[] = [
  { name: 'Disciplina', description: 'Actuar según lo que decidí, no según cómo me sienta en el momento.', why: 'La motivación va y viene; las decisiones tomadas con calma suelen ser mejores.', how: 'Empezar con 5 minutos de la tarea planificada, aunque no tenga ganas.' },
  { name: 'Razonamiento', description: 'Basar mis decisiones en hechos y argumentos, y cambiar de opinión si aparecen mejores pruebas.', why: 'Reduce errores evitables y me ayuda a entender mis propios sesgos.', how: 'Antes de decidir algo importante, escribir qué sé, qué falta y qué alternativas tengo.' },
  { name: 'Responsabilidad', description: 'Asumir mi parte en lo que me ocurre y centrarme en lo que sí puedo cambiar.', why: 'Me devuelve capacidad de acción en lugar de esperar a que cambien las circunstancias.', how: 'Ante un problema, preguntarme: «¿qué es lo siguiente que depende de mí?».' },
  { name: 'Perseverancia', description: 'Seguir avanzando en lo importante aunque el progreso sea lento.', why: 'Casi todo lo valioso requiere repetición y paciencia.', how: 'Medir el avance semanal, no el diario, y no abandonar tras un mal día.' },
  { name: 'Autocontrol', description: 'Dejar un espacio entre el impulso y la respuesta.', why: 'Muchas decisiones de las que me arrepiento se toman en caliente.', how: 'Respirar y esperar 10 segundos antes de reaccionar; posponer 24 h las compras impulsivas.' },
  { name: 'Aprendizaje continuo', description: 'Tratar los errores como información y dedicar tiempo regular a aprender.', why: 'Mis capacidades pueden mejorar con práctica deliberada.', how: 'Terminar cada día anotando qué he aprendido.' },
];

export function seedPrinciples(): PersonalPrinciple[] {
  const base = Date.now();
  // createdAt escalonado 1 ms: conserva el orden de la lista al ordenar por fecha de creación.
  return SEEDS.map((s, i) => {
    const at = new Date(base + i).toISOString();
    return { id: newId(), kind: 'principio', ...s, createdAt: at, updatedAt: at };
  });
}

export const DAILY_QUESTIONS = [
  '¿Qué es lo único que, si lo hago hoy, hará que el día valga la pena?',
  '¿Qué decisión estoy posponiendo y por qué?',
  '¿Qué hábito pequeño puedo mejorar hoy?',
  '¿En qué estoy invirtiendo mi atención y es lo que quiero?',
  '¿Qué aprendí ayer que pueda aplicar hoy?',
  '¿Qué haría hoy la versión de mí que quiero ser?',
  '¿Qué obstáculo probable aparecerá hoy y cómo lo manejaré?',
];

export const dailyQuestion = (key: string) => {
  const n = [...key].reduce((s, c) => s + c.charCodeAt(0), 0);
  return DAILY_QUESTIONS[n % DAILY_QUESTIONS.length];
};

export const HABIT_SUGGESTIONS = ['Estudiar', 'Leer', 'Entrenar', 'Practicar cálculo', 'Mantener el espacio ordenado', 'Dedicar tiempo a un objetivo personal'];
