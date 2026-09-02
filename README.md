# Parque Jurásico 3D 🦖

Una web-regalo interactiva: un recorrido nocturno en jeep entre la niebla, con
4 paradas de dinosaurios (cada una con datos reales y un mito desmontado).
Sin backend, sin dependencias de pago — pensada para desplegarse gratis en
Vercel como sitio estático.

## Stack

- [Vite](https://vite.dev) + React 18 + TypeScript
- [three.js](https://threejs.org) para la escena 3D (terreno, curva del
  camino, niebla, luces, dinosaurios low-poly)
- Tailwind CSS v4 solo para utilidades de layout del HUD; el resto de la
  estética vive en `src/index.css`

## Arranque en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Scripts

| Comando           | Qué hace                                  |
| ------------------ | ------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo con HMR             |
| `npm run build`     | `tsc -b` + build de producción con Vite    |
| `npm run preview`   | Sirve el build de `dist/` en local         |
| `npm run lint`      | Lint con [oxlint](https://oxc.rs)          |

## Estructura

```
src/
  scene/        # three.js: terreno, curva Catmull-Rom, niebla, luces,
                # dinosaurios low-poly, vegetación, calidad por dispositivo
  components/   # HUD en React: valla de entrada, tarjeta de dino,
                # controles, pantalla final, barra de progreso
  hooks/        # useRide: máquina de estados del recorrido (react <-> three.js)
  data/         # dinos.ts — fichas de los 4 dinosaurios
  types/        # tipos compartidos entre la escena y el HUD
```

### Alias de importación

`@scene`, `@components`, `@data`, `@assets`, `@hooks`, `@ride-types` apuntan a
sus carpetas respectivas dentro de `src/` (configurados en `vite.config.ts` y
`tsconfig.app.json`).

### Cómo funciona el recorrido

`useRide` (en `src/hooks/useRide.ts`) guarda un índice de parada
(`-1` = puerta de entrada, `0..3` = cada dinosaurio, `4` = puerta de salida) y
anima la posición de la cámara a lo largo de una curva Catmull-Rom
(`src/scene/path.ts`) con un *tween* propio. La clase `RideScene` (en
`src/scene/RideScene.ts`) solo sabe pintar un frame dado un `t` entre 0 y 1 —
no conoce nada de React, lo que mantiene separada la lógica de estado (HUD) de
la lógica de render (three.js).

### Rendimiento y modo de calidad reducida

`src/scene/quality.ts` detecta dispositivos táctiles de pantalla pequeña o con
poca memoria y aplica un preset "low": menos niebla de alcance, sin sombras,
menos vegetación instanciada y un límite de `devicePixelRatio` más bajo. La
vegetación se pinta con `InstancedMesh` y los dinosaurios comparten
geometrías y materiales cacheados para evitar asignar memoria en cada frame.

### Assets

Por ahora todos los modelos (dinosaurios, árboles, terreno) son primitivas de
three.js generadas por código — no hay SVGs ni texturas externas. Si más
adelante se añaden assets reales, deben ir en `src/assets/` y cargarse desde
`src/scene/dinosaurs.ts` / `src/scene/vegetation.ts`, manteniendo las
primitivas actuales como *fallback* si el asset no está disponible.

## Despliegue en Vercel

El proyecto es un build estático de Vite, así que no requiere configuración
adicional:

1. Importa el repositorio en [Vercel](https://vercel.com/new).
2. Vercel detecta automáticamente el framework "Vite" — build command
   `npm run build`, output directory `dist`.
3. Despliega. No hay variables de entorno ni backend que configurar.

Para probar el build de producción en local antes de desplegar:

```bash
npm run build
npm run preview
```
