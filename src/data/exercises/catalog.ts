import type { CognitiveArea, CognitiveExercise, SessionArea } from '../../types';

export const AREA_INFO: Record<CognitiveArea, { label: string; short: string; blurb: string }> = {
  memoria: { label: 'Memoria', short: 'Memoria', blurb: 'Retener y recuperar secuencias y palabras.' },
  concentracion: { label: 'Concentración', short: 'Atención', blurb: 'Mantener la atención y detectar lo relevante.' },
  calculo: { label: 'Cálculo mental', short: 'Cálculo', blurb: 'Operaciones con dificultad progresiva.' },
  problemas: { label: 'Resolución de problemas', short: 'Problemas', blurb: 'Lógica, patrones, planificación y decisiones.' },
  analitica: { label: 'Capacidad analítica', short: 'Análisis', blurb: 'Un método de razonamiento paso a paso.' },
};

export const AREAS = Object.keys(AREA_INFO) as CognitiveArea[];

export const sessionAreaLabel = (a: SessionArea) => (a === 'mixta' ? 'Sesión mixta' : AREA_INFO[a].label);

export const EXERCISES: CognitiveExercise[] = [
  {
    id: 'mem-seq', area: 'memoria', name: 'Memorizar secuencias', scored: true,
    description: 'Recuerda una secuencia en el orden correcto.',
    instructions: 'Verás una secuencia durante unos segundos. Cuando desaparezca, escríbela en el mismo orden. Si aciertas, la siguiente será más larga; si fallas, más corta.',
  },
  {
    id: 'mem-rev', area: 'memoria', name: 'Memoria de trabajo (orden inverso)', scored: true,
    description: 'Repite la secuencia al revés.',
    instructions: 'Verás una secuencia. Cuando desaparezca, escríbela en ORDEN INVERSO (del último al primero).',
  },
  {
    id: 'mem-words', area: 'memoria', name: 'Recuerdo de palabras', scored: true,
    description: 'Recuerda una lista de palabras tras una pausa.',
    instructions: 'Lee la lista de palabras. Tras una breve pausa desaparecerá y deberás escribir todas las que recuerdes, en cualquier orden.',
  },
  {
    id: 'foc-select', area: 'concentracion', name: 'Atención selectiva', scored: true,
    description: 'Encuentra los elementos que cumplen una condición.',
    instructions: 'Toca todas las casillas que cumplan la condición indicada y pulsa «Listo». Los errores restan precisión.',
  },
  {
    id: 'foc-target', area: 'concentracion', name: 'Detección de objetivos', scored: true,
    description: 'Responde sólo cuando aparezca el objetivo.',
    instructions: 'Irán apareciendo símbolos uno a uno. Pulsa el botón SOLO cuando veas el símbolo objetivo. Si pasas la app a segundo plano, el bloque se reinicia.',
  },
  {
    id: 'foc-timer', area: 'concentracion', name: 'Sesión de enfoque', scored: false,
    description: 'Temporizador de enfoque con autoevaluación.',
    instructions: 'Elige una duración, trabaja en una sola cosa y al terminar valora cómo fue. Es una autoevaluación, no una puntuación de juego.',
  },
  {
    id: 'calc', area: 'calculo', name: 'Cálculo mental', scored: true,
    description: 'Operaciones generadas con dificultad progresiva.',
    instructions: 'Resuelve cada operación mentalmente. Puedes escribir decimales con coma o punto, y fracciones como 3/4. Después verás la solución paso a paso.',
  },
  {
    id: 'prob', area: 'problemas', name: 'Biblioteca de problemas', scored: true,
    description: 'Lógica, secuencias, patrones, restricciones y planificación.',
    instructions: 'Lee el enunciado y responde. Puedes pedir hasta tres pistas antes de ver la solución; no cambian tu resultado, pero intenta usarlas poco.',
  },
  {
    id: 'ana', area: 'analitica', name: 'Método analítico', scored: true,
    description: 'Plantilla de 7 pasos sobre casos prácticos.',
    instructions: 'Resuelve un caso siguiendo 7 pasos: qué sé, qué me piden, qué falta, alternativas, pruebas, elección y comprobación. Después compara con una respuesta modelo y evalúate con criterios claros.',
  },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)!;
export const exercisesOf = (area: CognitiveArea, onlyScored = true) =>
  EXERCISES.filter((e) => e.area === area && (!onlyScored || e.scored));

/** Mensaje que acompaña a las puntuaciones: no son un diagnóstico. */
export const SCORE_DISCLAIMER =
  'Estas puntuaciones sólo miden tu práctica en estos ejercicios. No son un test de inteligencia ni de memoria, ni un diagnóstico, y mejorar aquí no implica automáticamente mejorar en la vida real.';
