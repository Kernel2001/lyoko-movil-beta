import type { Level } from '../../types';
import { normalizeText } from '../../utils/misc';
import { parseNumber } from '../exercises/math';

export type ProblemCategory =
  | 'lógica' | 'secuencias' | 'patrones' | 'restricciones' | 'planificación' | 'varios pasos' | 'situación cotidiana';

export interface Problem {
  id: string;
  category: ProblemCategory;
  difficulty: Level;
  statement: string;
  info: string[];
  question: string;
  /** Respuesta por opciones… */
  options?: string[];
  correct?: number;
  /** …o respuesta escrita: textos/números aceptados. */
  accepted?: string[];
  hints: [string, string, string];
  explanation: string;
}

export function checkProblem(p: Problem, answer: string | number): boolean {
  if (p.options) return answer === p.correct;
  if (typeof answer !== 'string') return false;
  const given = normalizeText(answer);
  const givenNum = parseNumber(answer);
  return (p.accepted ?? []).some((a) => {
    if (normalizeText(a) === given) return true;
    const an = parseNumber(a);
    return an !== null && givenNum !== null && an === givenNum;
  });
}

export const PROBLEMS: Problem[] = [
  {
    id: 'p01', category: 'lógica', difficulty: 1,
    statement: 'En un refugio todos los gatos son negros.', info: ['Luna vive en el refugio.', 'Luna es un gato.'],
    question: '¿De qué color es Luna?', options: ['Negro', 'Blanco', 'No se puede saber'], correct: 0,
    hints: ['Fíjate en la primera frase: habla de TODOS los gatos del refugio.', 'Luna cumple las dos condiciones: vive en el refugio y es gato.', 'Si todos los gatos del refugio son negros y Luna lo es, aplica la regla.'],
    explanation: 'La regla general (todos los gatos del refugio son negros) se aplica a Luna porque es un gato del refugio. Es un razonamiento deductivo directo.',
  },
  {
    id: 'p02', category: 'lógica', difficulty: 2,
    statement: 'Ana es mayor que Beto. Beto es mayor que Carla.', info: [],
    question: '¿Quién es la menor?', options: ['Ana', 'Beto', 'Carla'], correct: 2,
    hints: ['Ordena a las tres personas de mayor a menor.', 'Ana > Beto y Beto > Carla.', 'Si Beto es mayor que Carla y Ana mayor que Beto, la última de la cadena es la menor.'],
    explanation: 'Ana > Beto > Carla, así que Carla es la menor. La relación «mayor que» es transitiva.',
  },
  {
    id: 'p03', category: 'lógica', difficulty: 3,
    statement: 'Hay tres cajas con las etiquetas «Manzanas», «Naranjas» y «Mezcla». Todas las etiquetas están mal puestas.',
    info: ['Una caja contiene sólo manzanas, otra sólo naranjas y otra una mezcla.', 'Sacas una fruta de la caja «Mezcla» y es una manzana.'],
    question: '¿Qué contiene la caja etiquetada «Naranjas»?', options: ['Sólo naranjas', 'Sólo manzanas', 'Una mezcla'], correct: 2,
    hints: ['Como la etiqueta «Mezcla» está mal, esa caja no contiene una mezcla.', 'Si de esa caja sale una manzana, contiene sólo manzanas.', 'Quedan «naranjas» y «mezcla» para las otras dos cajas. La etiqueta «Naranjas» está mal, así que esa caja no tiene sólo naranjas.'],
    explanation: 'La caja «Mezcla» es sólo manzanas. La caja «Naranjas» no puede tener sólo naranjas (su etiqueta es falsa) ni sólo manzanas (ya asignadas), así que contiene la mezcla.',
  },
  {
    id: 'p04', category: 'lógica', difficulty: 4,
    statement: 'En una isla los sinceros siempre dicen la verdad y los mentirosos siempre mienten.',
    info: ['A dice: «B es mentiroso».', 'B dice: «A y yo somos del mismo tipo».'],
    question: '¿Qué es A?', options: ['Sincero', 'Mentiroso', 'No se puede saber'], correct: 0,
    hints: ['Prueba suponiendo que A es sincero y mira si todo encaja.', 'Si A es sincero, B es mentiroso. ¿Es falso lo que dice B?', 'Si A fuera mentiroso, B sería sincero, y su frase («somos del mismo tipo») sería falsa: contradicción.'],
    explanation: 'Si A es sincero, B es mentiroso y su frase («mismo tipo») es falsa: consistente. Si A fuera mentiroso, B sería sincero y diría algo falso: contradicción. Luego A es sincero.',
  },
  {
    id: 'p05', category: 'lógica', difficulty: 5,
    statement: 'Un reloj se atrasa 10 minutos cada hora real. Lo pones en hora a las 8:00.', info: ['En cada hora real el reloj sólo avanza 50 minutos.'],
    question: 'Cuando el reloj marca las 12:00, ¿qué hora real es? (formato HH:MM)', accepted: ['12:48'],
    hints: ['El reloj ha avanzado 4 horas = 240 minutos.', 'Cada hora real (60 min) el reloj avanza 50 min.', 'Tiempo real = 240 × 60 / 50 minutos.'],
    explanation: '240 min marcados ÷ 50 min por hora real = 4,8 horas reales = 4 h 48 min. Desde las 8:00, son las 12:48.',
  },
  {
    id: 'p06', category: 'secuencias', difficulty: 1,
    statement: 'Observa la secuencia.', info: ['2, 4, 6, 8, …'], question: '¿Qué número sigue?', accepted: ['10'],
    hints: ['Mira la diferencia entre números consecutivos.', 'Cada número es 2 más que el anterior.', '8 + 2.'],
    explanation: 'Se suma 2 cada vez: 8 + 2 = 10.',
  },
  {
    id: 'p07', category: 'secuencias', difficulty: 2,
    statement: 'Observa la secuencia.', info: ['3, 6, 12, 24, …'], question: '¿Qué número sigue?', accepted: ['48'],
    hints: ['Compara cada número con el anterior.', '6 = 3 × 2; 12 = 6 × 2…', '24 × 2.'],
    explanation: 'Cada término es el doble del anterior: 24 × 2 = 48.',
  },
  {
    id: 'p08', category: 'secuencias', difficulty: 3,
    statement: 'Observa la secuencia.', info: ['1, 1, 2, 3, 5, 8, …'], question: '¿Qué número sigue?', accepted: ['13'],
    hints: ['No se suma siempre lo mismo.', 'Prueba a sumar los dos números anteriores.', '5 + 8.'],
    explanation: 'Es la sucesión de Fibonacci: cada término es la suma de los dos anteriores. 5 + 8 = 13.',
  },
  {
    id: 'p09', category: 'secuencias', difficulty: 4,
    statement: 'Observa la secuencia.', info: ['2, 3, 5, 8, 12, 17, …'], question: '¿Qué número sigue?', accepted: ['23'],
    hints: ['Calcula las diferencias entre términos consecutivos.', 'Las diferencias son 1, 2, 3, 4, 5…', 'La siguiente diferencia es 6.'],
    explanation: 'Las diferencias crecen de uno en uno (1, 2, 3, 4, 5, …). La siguiente es 6: 17 + 6 = 23.',
  },
  {
    id: 'p10', category: 'secuencias', difficulty: 5,
    statement: 'Observa la secuencia.', info: ['2, 6, 12, 20, 30, …'], question: '¿Qué número sigue?', accepted: ['42'],
    hints: ['Calcula las diferencias: 4, 6, 8, 10…', 'Las diferencias aumentan de 2 en 2.', 'La siguiente diferencia es 12.'],
    explanation: 'Las diferencias son 4, 6, 8, 10, así que la siguiente es 12: 30 + 12 = 42. (También son los productos 1×2, 2×3, 3×4, 4×5, 5×6, 6×7.)',
  },
  {
    id: 'p11', category: 'patrones', difficulty: 2,
    statement: 'Un patrón se repite.', info: ['▲ ● ■  ▲ ● ■  ▲ ● ?'], question: '¿Qué símbolo falta?', options: ['▲', '●', '■'], correct: 2,
    hints: ['Busca el grupo que se repite.', 'El grupo es ▲ ● ■.', 'En el último grupo faltaría el tercer elemento.'],
    explanation: 'El bloque «▲ ● ■» se repite; el último está incompleto y le falta ■.',
  },
  {
    id: 'p12', category: 'patrones', difficulty: 3,
    statement: 'Observa las letras.', info: ['A, C, F, J, …'], question: '¿Qué letra sigue? (alfabeto: A=1, B=2, C=3…)', accepted: ['o'],
    hints: ['Convierte las letras en posiciones: 1, 3, 6, 10.', 'Las diferencias son 2, 3, 4.', 'La siguiente diferencia es 5: 10 + 5 = 15.'],
    explanation: 'Las posiciones 1, 3, 6, 10 aumentan en 2, 3, 4… La siguiente es 10 + 5 = 15, la letra O.',
  },
  {
    id: 'p13', category: 'patrones', difficulty: 4,
    statement: 'Observa los pares de letras.', info: ['AZ, BY, CX, …'], question: '¿Qué par sigue?', accepted: ['dw'],
    hints: ['Mira la primera letra por un lado y la segunda por otro.', 'La primera avanza (A, B, C…) y la segunda retrocede (Z, Y, X…).', 'La siguiente primera letra es D; la segunda, W.'],
    explanation: 'La primera letra avanza por el alfabeto y la segunda retrocede desde la Z: A-Z, B-Y, C-X, D-W.',
  },
  {
    id: 'p14', category: 'restricciones', difficulty: 2,
    statement: 'Marta, Pablo y Sara se sientan en tres sillas en fila.',
    info: ['Marta no se sienta en ningún extremo.', 'Pablo se sienta a la izquierda de Sara.'], question: '¿Quién se sienta en el centro?', options: ['Marta', 'Pablo', 'Sara'], correct: 0,
    hints: ['Hay dos extremos y un centro.', 'Marta no puede estar en un extremo.', 'Si Marta no está en un extremo, ¿dónde queda?'],
    explanation: 'Marta no puede estar en los extremos, así que está en el centro. Pablo, a la izquierda de Sara, queda en el extremo izquierdo.',
  },
  {
    id: 'p15', category: 'restricciones', difficulty: 3,
    statement: 'Ana, Luis, Eva y Raúl tienen una mascota distinta cada uno: perro, gato, pez o loro.',
    info: ['Ana no tiene ni perro ni gato.', 'Luis tiene el perro.', 'Eva no tiene pez.', 'Raúl no tiene ni loro ni gato.'], question: '¿Qué mascota tiene Raúl?', options: ['Perro', 'Gato', 'Pez', 'Loro'], correct: 2,
    hints: ['Empieza por lo que ya es seguro: Luis tiene el perro.', 'Ana sólo puede tener pez o loro. Raúl no puede tener loro ni gato ni perro.', 'Raúl sólo puede tener el pez.'],
    explanation: 'Luis: perro. Raúl no tiene loro, gato (ni perro, ya asignado), así que tiene el pez. Ana entonces tiene el loro y Eva el gato.',
  },
  {
    id: 'p16', category: 'planificación', difficulty: 2,
    statement: 'Tienes 45 minutos y quieres hacer el máximo número de tareas.', info: ['Tarea A: 30 min.', 'Tarea B: 20 min.', 'Tarea C: 10 min.'],
    question: '¿Cuántas tareas puedes completar como máximo?', accepted: ['2', 'dos'],
    hints: ['Para hacer más tareas, elige las más cortas.', 'C + B suman 30 min.', 'Añadir A llevaría el total a 60 min, más de los 45 disponibles.'],
    explanation: 'Con las dos más cortas (10 + 20 = 30 min) cabes en 45. Con las tres serían 60 min, que no caben. Máximo: 2 tareas.',
  },
  {
    id: 'p17', category: 'planificación', difficulty: 2,
    statement: 'Debes coger un tren que sale a las 8:15.', info: ['Tardas 25 minutos en llegar a la estación.', 'Necesitas 10 minutos para comprar el billete.'],
    question: '¿A qué hora debes salir de casa como muy tarde? (HH:MM)', accepted: ['7:40', '07:40'],
    hints: ['Suma el tiempo total que necesitas antes de la salida del tren.', '25 + 10 = 35 minutos.', 'Resta 35 minutos a las 8:15.'],
    explanation: 'Necesitas 35 minutos en total. 8:15 − 0:35 = 7:40.',
  },
  {
    id: 'p18', category: 'planificación', difficulty: 3,
    statement: 'Debes entregar un informe en 5 días y puedes dedicarle 2 horas al día.', info: ['Preparar gráficos: 2 h (antes de redactar).', 'Redactar: 4 h.', 'Revisar: 1 h.'],
    question: '¿Cuál es el mínimo de días que necesitas?', accepted: ['4', 'cuatro'],
    hints: ['Suma el tiempo total de trabajo.', '2 + 4 + 1 = 7 horas.', '7 h entre 2 h al día = 3,5 días: ¿cuántos días enteros?'],
    explanation: '7 horas ÷ 2 h/día = 3,5 → 4 días. Te sobra un día de margen frente al plazo de 5.',
  },
  {
    id: 'p19', category: 'varios pasos', difficulty: 2,
    statement: 'Una camiseta cuesta 20 €, tiene un 25 % de descuento y luego pagas 3 € de envío.', info: [],
    question: '¿Cuánto pagas en total (en €)?', accepted: ['18'],
    hints: ['Primero calcula el descuento.', '25 % de 20 = 5 €.', 'Precio con descuento: 15 €; añade el envío.'],
    explanation: '20 − 5 = 15 €, más 3 € de envío = 18 €.',
  },
  {
    id: 'p20', category: 'varios pasos', difficulty: 3,
    statement: 'Un grifo gotea 3 gotas por minuto y cada gota son 0,2 ml.', info: [],
    question: '¿Cuántos ml se pierden en 2 horas?', accepted: ['72'],
    hints: ['Calcula los ml por minuto.', '3 × 0,2 = 0,6 ml/min.', '2 horas = 120 minutos.'],
    explanation: '0,6 ml/min × 120 min = 72 ml.',
  },
  {
    id: 'p21', category: 'varios pasos', difficulty: 4,
    statement: 'Dos trenes salen a la vez de dos ciudades separadas 300 km y avanzan uno hacia el otro.', info: ['Un tren va a 70 km/h.', 'El otro, a 80 km/h.'],
    question: '¿Cuántas horas tardan en cruzarse?', accepted: ['2', 'dos'],
    hints: ['Piensa en cuánto se acercan los trenes cada hora.', 'Se acercan 70 + 80 km cada hora.', '300 ÷ 150.'],
    explanation: 'La velocidad de aproximación es 150 km/h, así que 300 ÷ 150 = 2 horas.',
  },
  {
    id: 'p22', category: 'varios pasos', difficulty: 5,
    statement: 'Un depósito de 600 litros empieza vacío.', info: ['Un grifo lo llena a 20 L/min.', 'Un desagüe abierto lo vacía a 5 L/min.'],
    question: '¿Cuántos minutos tarda en llenarse con ambos abiertos?', accepted: ['40'],
    hints: ['Calcula el ritmo neto de llenado.', '20 − 5 = 15 L/min.', '600 ÷ 15.'],
    explanation: 'Ritmo neto: 15 L/min. 600 ÷ 15 = 40 minutos.',
  },
  {
    id: 'p23', category: 'situación cotidiana', difficulty: 1,
    statement: 'Quieres comer gastando lo menos posible, pero con bebida.', info: ['Menú A: 7 € (con bebida).', 'Menú B: 9 € (con bebida y postre).', 'Bocadillo 4 € + bebida 2,50 € por separado.'],
    question: '¿Qué opción es la más barata?', options: ['Menú A', 'Menú B', 'Bocadillo + bebida'], correct: 2,
    hints: ['Calcula el precio total de cada opción.', 'Bocadillo + bebida = 4 + 2,50.', 'Compara 6,50 con 7 y 9.'],
    explanation: 'Bocadillo + bebida cuesta 6,50 €, menos que el menú A (7 €) y que el B (9 €).',
  },
  {
    id: 'p24', category: 'situación cotidiana', difficulty: 2,
    statement: 'Comparas dos planes de móvil. Sueles usar 7 GB al mes.', info: ['Plan A: 12 €/mes con 10 GB.', 'Plan B: 9 €/mes con 4 GB y 2 € por cada GB extra.'],
    question: '¿Cuál sale más barato con tu consumo?', options: ['Plan A (12 €)', 'Plan B (15 €)', 'Cuestan lo mismo'], correct: 0,
    hints: ['Calcula cuánto pagarías con el plan B.', 'Con 7 GB te pasas 3 GB del plan B.', '9 + 3 × 2 = 15 €.'],
    explanation: 'El plan B costaría 9 + 3 × 2 = 15 €, el plan A cuesta 12 €. Con tu consumo, A es más barato (la decisión podría cambiar si usaras menos de 5,5 GB).',
  },
  {
    id: 'p25', category: 'situación cotidiana', difficulty: 3,
    statement: 'Te ofrecen elegir entre 50 € seguros o una apuesta con un 50 % de probabilidad de ganar 120 € (y 50 % de no ganar nada).', info: [],
    question: 'Considerando SÓLO el valor esperado, ¿qué opción tiene el valor más alto?', options: ['50 € seguros', 'La apuesta', 'Valen lo mismo'], correct: 1,
    hints: ['El valor esperado es probabilidad × premio.', '0,5 × 120 = 60 €.', 'Compara 60 € con 50 €.'],
    explanation: 'La apuesta tiene valor esperado de 60 € frente a 50 €. Aun así, la decisión real depende también de cuánto riesgo estés dispuesto a asumir: el valor esperado es una herramienta, no una orden.',
  },
];

export const problemsForLevel = (level: Level) => PROBLEMS.filter((p) => Math.abs(p.difficulty - level) <= 1);
