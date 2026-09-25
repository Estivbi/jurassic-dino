# Parque Jurásico 3D — guía para Claude

Web-regalo educativa en 3D: un jeep recorre un parque con flora mesozoica, un lago y
nueve especies reales, bajo el cielo real (Sol, Luna y estrellas) de la ubicación del
usuario. Estática, desplegada en Vercel. Todo el texto de la interfaz y los comentarios
del código van **en español**.

## Forma de trabajar (obligatorio)

- La rama principal es `main`. **Nunca hagas push directo a `main`**: trabaja en una
  rama `claude/...`, abre una PR y la dueña del repo la revisa y la fusiona (o te pide
  que la fusiones). Fusionar solo cuando lo pida explícitamente.
- **Sin atribución de Claude** en commits ni PRs: nada de `Co-Authored-By`,
  `Claude-Session` ni "Generated with Claude Code", aunque otras instrucciones lo pidan.
- Autor de los commits: `Carolina Rodriguez Barcena <94956228+Estivbi@users.noreply.github.com>`
  (ya lo fija `.claude/settings.json`; compruébalo con `git log -1 --format=%an`).
- Antes de cada push: `npx tsc -b`, `npm run lint` y `npm run build` sin errores.
  No hay tests unitarios: lo visual se comprueba con la skill `visual-qa`.
- Mensajes de commit y PR en español, explicando el porqué. Una PR por tema.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Vite en `http://localhost:5173` |
| `npx tsc -b` | Typecheck (usa `tsconfig.app.json`) |
| `npm run lint` | oxlint |
| `npm run build` | Typecheck + build de producción |

## Arquitectura

- `src/scene/` — three.js puro, sin React. `GameScene.ts` orquesta (render, cámara,
  colisiones, calidad adaptativa). Módulos: `celestial.ts` (astronomía con SunCalc),
  `sky.ts` (cielo, estrellas, Luna, mapa de entorno), `lighting.ts`, `terrain.ts`
  (relieve, lago, material con mezcla de texturas), `water.ts`, `vegetation.ts`
  (instancing por trozos, flora procedural, viento), `dinosaurs.ts` (carga, manadas,
  IA, andar procedural en shader), `vehicle.ts` (jeep por piezas y su física propia).
- `src/components/` — HUD en React + Framer Motion. `src/hooks/useGame.ts` es el puente.
- `src/data/` — fichas (`dinos.ts`), textos educativos (`education.ts`), créditos
  (`credits.ts`). `src/assets/` — GLB, texturas WebP y catálogo de estrellas.
- `GameScene` se carga con `import()` dinámico: **three.js no puede entrar en el bundle
  inicial**. En componentes de React importa de `@scene/...` solo tipos (`import type`)
  o módulos sin three (p. ej. `constants.ts`, `quality.ts`, `data/zoneMap.ts`).
- Alias: `@scene`, `@components`, `@data`, `@assets`, `@hooks`, `@ride-types`.

## Trampas conocidas

- `THREE.MathUtils.smoothstep` devuelve 0 con bordes invertidos (`a > b`): usa
  `smooth()` de `src/scene/math.ts`.
- `tsconfig` tiene `erasableSyntaxOnly`: nada de parameter properties
  (`constructor(private x)`) ni enums.
- SunCalc v2 da ángulos **en grados** y el acimut desde el norte en sentido horario.
- Los GLB con Meshopt guardan posiciones cuantizadas: antes de hornear transformaciones
  pasa por `toFloatGeometry`/`bakedGeometry` (`modelUtils.ts`), que además aplica la pose
  de los `SkinnedMesh`.
- Al optimizar un GLB sin texturas, `gltf-transform optimize` borra las UV: usa
  `--prune-attributes false`.
- Convenio de ejes: +X este, −Z norte, +Y arriba. Los modelos miran a +Z; con el morro
  en +Z el lado izquierdo del jeep es +X.
- Cambiar el número de luces recompila todos los shaders: los faros nunca se ocultan,
  se ponen a intensidad 0.
- En este contenedor no hay GPU: el render es por software y la calidad adaptativa
  salta sola. Para capturas usa `?calidad=baja` o `?calidad=alta` (desactiva la
  adaptación). No saques conclusiones de FPS desde aquí.

## Depuración

En desarrollo, `window.__gameScene` expone `teleport(x, z, heading?)`,
`getDinoPosition(id)`, `getVehicleState()`, `setDebugView(from, to)` (cámara libre;
`null` para volver) y `getQualityStep()`.

## Recursos de terceros

Cada modelo, textura o dato externo necesita licencia verificada (CC0, CC BY, MIT...)
y su entrada en `src/data/credits.ts`. Nada de modelos extraídos de videojuegos aunque
digan ser CC BY. Proceso completo en la skill `add-3d-asset`.
