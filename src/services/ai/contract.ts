/**
 * Contrato para una FUTURA integración opcional de IA (no implementado en la beta).
 * Idea: el usuario elegiría un proveedor y aportaría su propia clave; la app sólo hablaría con
 * este interfaz, así que sustituir el contenido local por IA no tocaría las pantallas.
 * Hoy el contenido sale de reglas locales (data/exercises) y respuestas modelo (data/problems).
 */
export interface AiProvider {
  id: string;
  explainConcept(topic: string): Promise<string>;
  generateProblem(area: string, level: number): Promise<{ statement: string; answer: string; explanation: string }>;
  analyzeAnswer(statement: string, answer: string): Promise<{ feedback: string }>;
  suggestPlan(goal: string): Promise<string[]>;
}

/** Sin proveedor configurado la beta no llama a ningún servicio externo. */
export const activeAiProvider: AiProvider | null = null;
