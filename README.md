# Parque Jurásico 3D 🦖

Una web-regalo interactiva: conduces libremente un jeep por un parque
nocturno entre la niebla, con 4 dinosaurios reales patrullando su zona (cada
uno con datos reales y un mito desmontado). Sin backend, sin dependencias de
pago — pensada para desplegarse gratis en Vercel como sitio estático.

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [three.js](https://threejs.org) para la escena 3D (terreno, mundo abierto
  por zonas, niebla, luces, vehículo y dinosaurios low-poly)
- [Framer Motion](https://motion.dev) para las transiciones del HUD (React)
- Tailwind CSS v4 solo para utilidades de layout del HUD; el resto de la
  estética vive en `src/index.css`

## Controles

- **Teclado**: WASD o flechas para conducir.
- **Móvil**: botones en pantalla (aparecen solo en dispositivos táctiles).
- **E** o el botón en pantalla: ver la ficha del dinosaurio más cercano
  cuando aparece el aviso. **Esc** o la ✕ para cerrarla.

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
  scene/        # three.js: terreno, zonas/biomas, niebla, luces, vehículo,
                # dinosaurios low-poly con IA de deambulación, vegetación,
                # input (teclado), calidad por dispositivo
  components/   # HUD en React: valla de entrada, controles táctiles, aviso
                # de proximidad, tarjeta de dino, álbum de descubiertos
  hooks/        # useGame: estado del juego (react <-> three.js)
  data/         # dinos.ts — fichas de los 4 dinosaurios
  types/        # tipos compartidos entre la escena y el HUD
```

### Alias de importación

`@scene`, `@components`, `@data`, `@assets`, `@hooks`, `@ride-types` apuntan a
sus carpetas respectivas dentro de `src/` (configurados en `vite.config.ts` y
`tsconfig.app.json`).

### Cómo funciona el juego

`useGame` (en `src/hooks/useGame.ts`) mantiene el input (teclado + táctil) en
una ref mutable que lee cada frame la clase `GameScene`
(`src/scene/GameScene.ts`), la cual no conoce nada de React: solo actualiza
la física del vehículo (`src/scene/vehicle.ts`), la cámara en tercera
persona y la IA de los dinosaurios (`src/scene/dinosaurs.ts`), y expone el id
del dinosaurio más cercano. El mundo está dividido en 4 zonas/biomas
(`src/scene/zones.ts`) cuyo color de niebla, tono de terreno y densidad de
vegetación se interpolan suavemente según la posición del jeep — de ahí que
el paisaje cambie según por dónde conduzcas. Acercarte a un dinosaurio (radio
definido en `GameScene`) dispara el aviso de proximidad en el HUD; abrir su
ficha pausa la conducción hasta cerrarla.

### Rendimiento y modo de calidad reducida

`src/scene/quality.ts` detecta dispositivos táctiles de pantalla pequeña o con
poca memoria y aplica un preset "low": menos niebla de alcance, sin sombras,
menos vegetación instanciada y un límite de `devicePixelRatio` más bajo. La
vegetación se pinta con `InstancedMesh` y los dinosaurios comparten
geometrías y materiales cacheados para evitar asignar memoria en cada frame.

### Assets

Por ahora todos los modelos (jeep, dinosaurios, árboles, terreno) son
primitivas de three.js generadas por código — no hay modelos ni texturas
externas. Candidatos CC0 para sustituirlos por modelos glTF/GLB reales:
[Kenney Car Kit](https://kenney.nl/assets/car-kit) (jeep),
[Quaternius Animated LowPoly Dinosaurs](https://quaternius.itch.io/animated-lowpoly-dinosaurs)
(dinosaurios con animaciones) y [Kenney Nature Kit](https://kenney.nl/assets/nature-kit)
(vegetación). Al añadirlos, deben ir en `src/assets/` y cargarse vía
`GLTFLoader` desde `src/scene/vehicle.ts` / `src/scene/dinosaurs.ts` /
`src/scene/vegetation.ts`, manteniendo las primitivas actuales como
*fallback* si el asset no está disponible.

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
