import type { Level } from '../../types';
import { normalizeText } from '../../utils/misc';

export interface AnalyticCase {
  id: string;
  kind: 'decisión' | 'organización del tiempo' | 'interpretación de información' | 'error de razonamiento' | 'evaluación de argumentos';
  difficulty: Level;
  title: string;
  scenario: string;
  facts: string[];
  question: string;
  /** Palabras clave del caso; si la respuesta las usa, se considera que apoya el razonamiento en datos. */
  keywords: string[];
  model: {
    known: string;
    asked: string;
    missing: string;
    alternatives: string;
    evidence: string;
    choice: string;
    check: string;
  };
}

export const ANALYTIC_CASES: AnalyticCase[] = [
  {
    id: 'a01', kind: 'decisión', difficulty: 1, title: 'Una oferta de trabajo',
    scenario: 'Te ofrecen un trabajo nuevo. Tienes que decidir si lo aceptas.',
    facts: ['El sueldo es un 15 % mayor.', 'El trayecto añade 1 hora diaria entre ida y vuelta.', 'El equipo es más pequeño y no conoces a nadie.', 'Tu trabajo actual es estable y te gusta.'],
    question: '¿Aceptas la oferta?',
    keywords: ['sueldo', '15', 'trayecto', 'hora', 'equipo', 'estable', 'tiempo'],
    model: {
      known: 'Más sueldo (+15 %), 1 hora más de trayecto al día, equipo pequeño desconocido, trabajo actual estable y agradable.',
      asked: 'Decidir si me compensa cambiar de trabajo.',
      missing: 'Cuánto es 15 % en euros netos; si el trabajo nuevo tiene posibilidades de crecer; el ambiente real del equipo; si podría teletrabajar algún día.',
      alternatives: '1) Aceptar. 2) Rechazar. 3) Negociar (teletrabajo o más sueldo) antes de decidir.',
      evidence: 'Aceptar: el aumento es medible. Rechazar: 1 hora diaria son ~20 horas al mes y el trabajo actual es estable. Negociar: la información que falta podría cambiar el resultado.',
      choice: 'Negociar primero, porque la decisión depende de datos que aún no tengo (euros netos y teletrabajo), y lo peor que puede pasar es que digan no y siga igual.',
      check: 'Calcular cuánto vale mi hora extra de trayecto con el aumento; probar durante 3 meses y revisar si mi energía y mi tiempo libre han empeorado.',
    },
  },
  {
    id: 'a02', kind: 'organización del tiempo', difficulty: 2, title: 'Preparar un examen',
    scenario: 'Tienes un examen dentro de 10 días con 4 temas.',
    facts: ['El tema 1 lo dominas; los temas 2 y 3 los conoces a medias; el tema 4 no lo has visto.', 'Puedes estudiar 1,5 horas al día entre semana y 3 horas en cada día del fin de semana.', 'Hoy es lunes.'],
    question: '¿Cómo repartirías el estudio?',
    keywords: ['tema', 'semana', 'horas', 'día', 'repaso', 'fin de semana', 'dominas'],
    model: {
      known: '10 días, 4 temas con niveles distintos, tiempo limitado: 1,5 h entre semana y 3 h en fin de semana. Hoy es lunes.',
      asked: 'Un reparto del estudio que cubra todo el temario antes del examen.',
      missing: 'Cuánto pesa cada tema en el examen; cuánto tardo en estudiar un tema nuevo; si tendré otros compromisos esos días.',
      alternatives: '1) Estudiar los temas en orden. 2) Dar prioridad al tema 4 (el que no he visto) y repasar el resto. 3) Repartir por igual.',
      evidence: 'Repartir por igual desperdicia horas en el tema 1, que ya domino. El tema 4 es el de mayor riesgo porque parte de cero. Los temas 2 y 3 necesitan repaso, no estudio completo.',
      choice: 'Alternativa 2: el tema 4 primero (los primeros días), luego 2 y 3, y dejar el tema 1 y un repaso general para los últimos días, porque así dedico más tiempo a lo que menos sé.',
      check: 'Hacer un mini test de cada tema a mitad de plan; si el tema 4 sigue por debajo de lo esperado, reasignar horas del fin de semana.',
    },
  },
  {
    id: 'a03', kind: 'interpretación de información', difficulty: 2, title: 'Helados y piscinas',
    scenario: 'Una noticia dice: «Cuando aumentan las ventas de helados, aumentan también los accidentes en piscinas. Los helados provocan accidentes».',
    facts: ['Ambas cifras suben en verano.', 'No se ha medido nada más.'],
    question: '¿Es correcta la conclusión de la noticia?',
    keywords: ['verano', 'calor', 'correlación', 'causa', 'piscina', 'helados', 'tercer'],
    model: {
      known: 'Las ventas de helados y los accidentes en piscinas suben a la vez, ambos en verano.',
      asked: 'Decidir si de ahí se puede concluir que los helados provocan los accidentes.',
      missing: 'Datos de otras épocas; si hay más gente en piscinas por el calor; si los accidentados comieron helado.',
      alternatives: '1) Los helados causan accidentes. 2) Los accidentes aumentan las ventas de helados. 3) Un tercer factor (el calor del verano) aumenta ambos.',
      evidence: 'Que dos cosas suban a la vez no prueba causa. En verano hace más calor: más gente se baña y más gente compra helados. No hay mecanismo que explique 1 o 2.',
      choice: 'La alternativa 3, porque explica ambos aumentos con un solo factor conocido y las otras no tienen un mecanismo razonable.',
      check: 'Comparar días calurosos con y sin ventas altas de helados; si los accidentes dependen del calor y no de los helados, la hipótesis 3 se sostiene.',
    },
  },
  {
    id: 'a04', kind: 'error de razonamiento', difficulty: 2, title: 'El tío que fumaba',
    scenario: 'Alguien dice: «Mi tío fumó toda su vida y vivió 95 años, así que fumar no es dañino».',
    facts: ['Es un único caso.', 'No se sabe qué otros factores influyeron en su salud.'],
    question: '¿Qué error de razonamiento hay en este argumento y por qué?',
    keywords: ['caso', 'anécdota', 'muestra', 'excepción', 'estadística', 'generalizar', 'único'],
    model: {
      known: 'Un único caso (el tío) fumó y vivió 95 años.',
      asked: 'Evaluar si el argumento justifica concluir que fumar no es dañino.',
      missing: 'Datos de muchas personas; cómo vivió el tío (genética, dieta); cuántos fumadores mueren antes.',
      alternatives: '1) El argumento es válido. 2) Es una generalización apresurada a partir de una anécdota. 3) El tío es una excepción estadística.',
      evidence: 'Un caso no representa a la población. Los estudios con muchas personas muestran riesgos mayores en fumadores; que existan excepciones no anula la tendencia.',
      choice: 'La 2 (y en parte la 3): es una generalización apresurada, porque un solo caso no basta para una conclusión general.',
      check: 'Buscar datos de muchas personas (no de una) y ver si los fumadores viven de media menos; ver cuántos casos como el del tío existen.',
    },
  },
  {
    id: 'a05', kind: 'evaluación de argumentos', difficulty: 3, title: 'La app más popular',
    scenario: 'Un anuncio dice: «Esta app es la mejor para aprender idiomas porque millones de personas la han descargado».',
    facts: ['No se menciona cuánta gente sigue usándola.', 'No se compara con otras apps.', 'La app tiene mucha publicidad.'],
    question: '¿Es sólido el argumento del anuncio?',
    keywords: ['descarga', 'millones', 'popular', 'publicidad', 'comparación', 'usar', 'aprender', 'prueba'],
    model: {
      known: 'Millones de descargas; no hay datos de uso continuado ni de comparación; hay mucha publicidad.',
      asked: 'Valorar si «muchas descargas» demuestra que es la mejor para aprender.',
      missing: 'Cuántos usuarios continúan usándola; cuánto aprenden realmente; cómo se compara con otras.',
      alternatives: '1) Es la mejor porque es popular. 2) Es popular por el marketing, no por su calidad. 3) Es buena, pero hace falta más evidencia.',
      evidence: 'Popularidad no equivale a calidad: las descargas pueden deberse a la publicidad. Faltan datos de aprendizaje real.',
      choice: 'La 3: el argumento no es sólido porque confunde popularidad con calidad y no aporta pruebas de aprendizaje.',
      check: 'Buscar estudios o pruebas de nivel antes y después de usarla, y comparar con otras apps con el mismo criterio.',
    },
  },
  {
    id: 'a06', kind: 'decisión', difficulty: 3, title: 'Elegir un curso',
    scenario: 'Quieres aprender programación y dudas entre dos cursos.',
    facts: ['Curso A: 300 €, presencial, 3 meses, tardes de lunes y miércoles.', 'Curso B: 60 €, en línea, a tu ritmo, sin tutor.', 'Tienes tiempo libre irregular y te cuesta mantener hábitos sin una estructura externa.'],
    question: '¿Qué curso elegirías?',
    keywords: ['300', '60', 'ritmo', 'tutor', 'estructura', 'presencial', 'línea', 'precio', 'hábito', 'horario'],
    model: {
      known: 'Dos cursos con precio, formato y estructura diferentes; tu tiempo es irregular y te cuesta mantener hábitos solo.',
      asked: 'Elegir el curso con más probabilidad de que lo termine y aprenda.',
      missing: 'Si los horarios del curso A son compatibles con mi agenda; calidad de ambos; posibilidad de probar el B gratis.',
      alternatives: '1) Curso A. 2) Curso B. 3) Probar B un mes y decidir.',
      evidence: 'A: la estructura externa ayuda con mi problema de constancia, pero cuesta 5 veces más y exige horario fijo. B: es barato y flexible, pero sin tutor ni estructura es más fácil abandonarlo.',
      choice: 'Probar B un mes con un horario fijo propio, porque es barato y reversible; si no logro constancia, ya tendré la evidencia para pagar el A.',
      check: 'Medir cuántas sesiones completo el primer mes; si cumplo menos del 70 % de las sesiones planificadas, cambiar al curso A.',
    },
  },
  {
    id: 'a07', kind: 'interpretación de información', difficulty: 3, title: 'El 90 % de satisfacción',
    scenario: 'Una tienda anuncia: «El 90 % de nuestros clientes están satisfechos».',
    facts: ['En la letra pequeña: la encuesta se hizo a 10 clientes elegidos por la tienda.', 'No se explica qué significa «satisfecho».'],
    question: '¿Qué conclusión puedes sacar de este dato?',
    keywords: ['10', 'muestra', 'encuesta', 'elegidos', 'sesgo', 'pequeña', 'satisfecho', 'clientes'],
    model: {
      known: 'El 90 % de 10 clientes (9 personas), elegidos por la tienda, dicen estar «satisfechos»; la definición es vaga.',
      asked: 'Decidir qué se puede concluir sobre la satisfacción real de los clientes.',
      missing: 'Cómo se eligió a los 10; cuántos clientes totales hay; qué preguntaron exactamente.',
      alternatives: '1) La mayoría de los clientes están satisfechos. 2) El dato no es fiable por la muestra pequeña y sesgada. 3) Puede ser cierto, pero no está demostrado.',
      evidence: 'Con 10 personas escogidas por la propia tienda, la muestra es muy pequeña y probablemente sesgada. «Satisfecho» no está definido.',
      choice: 'La 2 o la 3: no puedo concluir nada fiable porque la muestra es pequeña y la eligió quien tiene interés en el resultado.',
      check: 'Buscar opiniones independientes de muchos clientes o una encuesta grande y aleatoria.',
    },
  },
  {
    id: 'a08', kind: 'organización del tiempo', difficulty: 4, title: 'Llegar siempre tarde',
    scenario: 'Llevas tres semanas llegando tarde al trabajo casi todos los días, entre 10 y 20 minutos.',
    facts: ['Te levantas a las 7:00 y sales a las 8:00.', 'El trayecto dura 40 minutos, pero hay obras desde hace un mes.', 'Los últimos días te acuestas tarde viendo series.'],
    question: '¿Cuál es la causa más probable y qué cambiarías?',
    keywords: ['obras', 'acuestas', 'sueño', 'salir', '8:00', 'trayecto', '40', 'minutos', 'tarde'],
    model: {
      known: 'Sales a las 8:00, el trayecto dura 40 min y hay obras; te acuestas tarde y llegas 10–20 min tarde casi todos los días.',
      asked: 'Identificar la causa más probable de los retrasos y proponer un cambio.',
      missing: 'Cuánto dura realmente el trayecto con las obras; a qué hora debes llegar; si te cuesta levantarte o si tardas más en prepararte.',
      alternatives: '1) Las obras alargan el trayecto. 2) Duermes poco y vas más lento por la mañana. 3) Ambas cosas a la vez.',
      evidence: 'Las obras explican retrasos constantes pero similares cada día. La falta de sueño explicaría retrasos variables. Los retrasos son de 10 a 20 minutos, es decir, variables.',
      choice: 'La 3, con prioridad en salir 20 minutos antes: es lo único que controlo con seguridad, y además adelantaré la hora de acostarme.',
      check: 'Anotar durante una semana la hora de salida y de llegada; si llego a tiempo todos los días, la causa estaba bien identificada.',
    },
  },
];

export interface RubricCriterion {
  id: string;
  label: string;
  hint: string;
}

/** Criterios transparentes: se muestran al usuario antes y después de responder. */
export const RUBRIC: RubricCriterion[] = [
  { id: 'datos', label: 'Distingue lo que sabe de lo que le piden', hint: 'Pasos 1 y 2 rellenados con información del caso.' },
  { id: 'falta', label: 'Identifica información que falta o supuestos', hint: 'Paso 3: qué necesitarías averiguar.' },
  { id: 'alternativas', label: 'Considera al menos dos alternativas', hint: 'Paso 4: dos o más opciones distintas.' },
  { id: 'pruebas', label: 'Apoya las alternativas con datos del caso', hint: 'Paso 5: usa hechos concretos del enunciado.' },
  { id: 'eleccion', label: 'Elige una opción y explica por qué', hint: 'Paso 6: conclusión con «porque…».' },
  { id: 'comprobacion', label: 'Propone cómo comprobar su conclusión', hint: 'Paso 7: un resultado observable que la confirme o la refute.' },
];

export type AnalyticAnswers = Record<'known' | 'asked' | 'missing' | 'alternatives' | 'evidence' | 'choice' | 'check', string>;

const countItems = (s: string) =>
  s.split(/\n|;|\d\)|\d\.|•|-\s/).map((x) => x.trim()).filter((x) => x.length > 3).length;

/**
 * Sugerencia automática basada en estructura (no en "la respuesta correcta", porque no hay una única):
 * el usuario la ve y la confirma o corrige al comparar con la respuesta modelo.
 */
export function suggestRubric(c: AnalyticCase, a: AnalyticAnswers): Record<string, boolean> {
  const long = (s: string, n: number) => s.trim().length >= n;
  const text = normalizeText(a.evidence + ' ' + a.alternatives + ' ' + a.known);
  const usesFacts = c.keywords.filter((k) => text.includes(normalizeText(k))).length >= 1;
  return {
    datos: long(a.known, 15) && long(a.asked, 8),
    falta: long(a.missing, 10),
    alternativas: countItems(a.alternatives) >= 2,
    pruebas: long(a.evidence, 20) && usesFacts,
    eleccion: long(a.choice, 20) && /porque|ya que|puesto que|debido|dado que/i.test(a.choice),
    comprobacion: long(a.check, 15),
  };
}

export const analyticCasesForLevel = (level: Level) => ANALYTIC_CASES.filter((c) => Math.abs(c.difficulty - level) <= 1);
