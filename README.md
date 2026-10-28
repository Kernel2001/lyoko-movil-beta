# Project Lyoko Móvil Beta

Herramienta personal de desarrollo y entrenamiento cognitivo, pensada para usarse desde el móvil. Es una **PWA** (aplicación web instalable): sin cuenta, sin servidor, sin publicidad ni analítica. Todos tus datos se guardan en tu dispositivo (IndexedDB).

> Las puntuaciones de los ejercicios sólo miden tu práctica en esos ejercicios. No son un diagnóstico ni un test de inteligencia, memoria o atención.

## Módulos

1. **Inicio**: saludo, objetivo principal, tareas y hábitos de hoy, acceso rápido al entrenamiento, progreso semanal y una pregunta diaria.
2. **Desarrollo personal**: objetivos con pasos y «próxima acción», filosofía personal (principios, valores y reflexiones editables) y diario de reflexión por fecha.
3. **Organización**: tareas (hoy / próximas / hechas, con historial) y hábitos por días de la semana. Sin «rachas rotas» que penalicen.
4. **Entrenamiento cognitivo**: memoria (secuencias, orden inverso, palabras), concentración (atención selectiva, detección de objetivos, sesión de enfoque con temporizador), cálculo mental (5 niveles generados con reglas), biblioteca de 25 problemas con pistas progresivas y método analítico de 7 pasos con rúbrica transparente. Sesiones de 3, 5 o 10 min, por área o mixtas, con dificultad adaptativa explicada e historial.
5. **Progreso**: últimos 7 y 30 días, con estado vacío honesto (no inventa datos).
6. **Configuración**: perfil, tema, preferencias de entrenamiento, recordatorios, exportar/importar copias JSON, eliminar todo con confirmación y notas de privacidad.

## Requisitos

- Node.js 20 o superior (probado con Node 24) y npm.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Abre la dirección que muestra Vite (por defecto `http://localhost:5173`). Con `--host` (ya incluido) también es accesible desde el móvil en la misma red Wi-Fi, aunque **el service worker y la instalación PWA sólo funcionan en `https://` o `localhost`**.

## Pruebas y compilación

```bash
npm test            # pruebas automatizadas (Vitest)
npm run typecheck   # comprobación de TypeScript
npm run build       # compila a ./dist (incluye service worker y manifest)
npm run preview     # sirve ./dist en http://localhost:4173
```

Los iconos de la PWA se generan con `node scripts/make-icons.mjs` (ya están en `public/`).

## Usarla en el móvil

Para instalarla en el móvil necesitas servir `dist/` por **HTTPS** (la PWA no se instala desde `http://192.168.x.x`). Opciones sencillas y gratuitas: GitHub Pages, Netlify, Cloudflare Pages o Vercel (basta con subir la carpeta `dist`; la app usa rutas relativas y funciona también en subdirectorios).

### Instalar como PWA

- **Android (Chrome):** abre la URL → menú ⋮ → «Instalar aplicación» (o «Añadir a la pantalla de inicio»).
- **iPhone / iPad (Safari):** abre la URL → botón Compartir → «Añadir a pantalla de inicio».
- **Windows / macOS (Chrome o Edge):** icono de instalar en la barra de direcciones.

Tras la primera carga con conexión, la app muestra «Lista para usarse sin conexión». Cuando haya una versión nueva aparecerá un aviso «Actualizar» (no se recarga sola para no interrumpir una sesión).

## Copias de seguridad

Configuración → **Exportar copia** descarga un JSON con todos tus datos. **Importar copia** valida el archivo antes de tocar nada y ofrece dos modos:

- **Combinar** (seguro): añade lo que falte y no sobrescribe nada de lo existente.
- **Reemplazar todo**: sustituye tus datos por los de la copia (pide confirmación). Ambas operaciones son transaccionales: si algo falla, no se modifica nada.

⚠️ Los datos viven en el navegador. Si borras los datos del sitio o desinstalas la app **se pierden**. Exporta copias con regularidad y guárdalas fuera del móvil. La app solicita almacenamiento persistente al navegador, pero el navegador decide.

## Estructura

```
src/
  app/                 App, rutas (hash), preferencias, registro PWA
  components/          UI común (hoja modal, avisos, barras…)
  features/            dashboard, personal-development, tasks (tareas+hábitos),
                       cognitive-training (hub, ejercicios, historial), progress, settings
  services/            storage (IndexedDB + repositorios), export (copias), notifications,
                       tareas, hábitos, objetivos, scoring, difficulty, training, progress, ai (contrato futuro)
  data/                exercises (cálculo, memoria, atención, catálogo), problems (biblioteca y casos analíticos), seed
  hooks/ types/ utils/ tests/
```

La lógica de negocio (generadores, puntuación, dificultad) está separada de los componentes y es pura/testable. El acceso a datos pasa por `services/storage` (un repositorio por colección): migrar a una base remota sólo exigiría otra implementación de `Repo<T>`.

## Cómo funcionan las puntuaciones y la dificultad

- Cada intento guarda `total` (elementos evaluables) y `correct`; **precisión = correct / total**. Detalles: secuencias = posiciones; palabras = palabras de la lista; atención selectiva = objetivos + errores; detección = objetivos + falsas alarmas; analítica = 6 criterios de la rúbrica.
- Sólo se comparan resultados del mismo ejercicio, siempre junto al nivel (1–5).
- **Regla de dificultad** (tras cada sesión con un ejercicio): 3 sesiones seguidas con ≥ 85 % → sube un nivel; 2 seguidas con < 50 % → baja uno; en otro caso se mantiene. Siempre se explica el motivo y puedes fijar el nivel a mano en cada área.
- Si la app pasa a segundo plano durante un ejercicio, ese intento se reinicia y ese tiempo no cuenta. El temporizador de enfoque usa marcas de tiempo, así que es exacto al volver.

## Limitaciones conocidas

- **Recordatorios**: sin servidor push no hay notificaciones programadas fiables con la app cerrada. Sólo se avisa mientras la app está abierta (o recién pasada a segundo plano). En iOS, las notificaciones sólo funcionan con la PWA instalada (iOS 16.4+). Usa también las alarmas del móvil.
- Sin sincronización entre dispositivos: para mover datos, exporta e importa.
- La sesión de entrenamiento en curso no se recupera si cierras la app a mitad (los datos ya guardados sí persisten).
- La sesión de enfoque en curso tampoco se restaura tras cerrar la app.
- El contenido (problemas, casos analíticos, palabras) es una biblioteca local limitada: los problemas se repiten con el tiempo (se priorizan los no vistos).
- La rúbrica analítica sugiere criterios por estructura y palabras clave; la nota final es tu autoevaluación.
- Probado en el navegador integrado (vista móvil 375×812) y con pruebas automatizadas; **no se ha probado en dispositivos iOS reales**.
- No hay IA en esta beta; `src/services/ai/contract.ts` sólo define el contrato para una integración futura opcional.

## Próximos pasos recomendados

- Probar en tu móvil durante una o dos semanas y anotar qué ejercicios usas de verdad.
- Más contenido: problemas y casos analíticos; más tipos de cálculo.
- Restaurar una sesión interrumpida y un recordatorio con ntfy/Push opcional.
- Exportación automática periódica (por ejemplo, recordatorio semanal de copia).
- Proveedor de IA opcional con clave propia (generar problemas y analizar respuestas), tras validar la beta.

## Despliegue gratuito con GitHub Pages

El repositorio incluye `.github/workflows/deploy.yml`: en cada push a `main` ejecuta las pruebas, compila y publica `dist/` por HTTPS.

1. Crea un repositorio en GitHub (puede ser privado en cuentas con Pages privado, o público) y sube el proyecto a la rama `main`.
2. En GitHub: Settings → Pages → Source: **GitHub Actions**.
3. Cuando termine el workflow, la app estará en `https://<tu-usuario>.github.io/<repositorio>/`. Ábrela en el móvil e instálala (ver arriba).

Ojo: el código y la app serán accesibles por URL, pero **tus datos no**: viven sólo en tu navegador.
