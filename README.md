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

El T-Rex y el Brachiosaurio usan ya modelos glTF reales (piel/escamas
texturizadas con PBR) en `src/assets/models/*.opt.glb`, cargados de forma
asíncrona en `src/scene/dinosaurs.ts` vía `GLTFLoader`. Mientras el modelo
carga (o si `MODEL_CONFIG` no tiene entrada para una especie) se ve la
primitiva de recambio — así el Triceratops, el Velociraptor y el jeep siguen
con primitivas hasta que se sustituyan por assets reales igual de buenos.

**Optimizar un `.glb` nuevo antes de añadirlo** (los modelos de bancos como
Sketchfab suelen venir con texturas de 4K/8K que revientan la VRAM en
móvil):

```bash
npx @gltf-transform/cli optimize entrada.glb salida.opt.glb --texture-size 1024 --compress meshopt
```

Si el resultado usa compresión Meshopt (como aquí), el loader necesita el
decodificador — ya está configurado en `dinosaurs.ts`:

```ts
gltfLoader.setMeshoptDecoder(MeshoptDecoder)
```

Para añadir un modelo a una nueva especie: importa el `.glb` con
`import url from '@assets/models/xxx.opt.glb?url'` y añade una entrada a
`MODEL_CONFIG` en `src/scene/dinosaurs.ts` con `scale`/`rotationY` ajustados
a ojo (compara con el jeep en una captura).

Candidatos pendientes de revisar visualmente antes de integrar (no vale
fiarse del título/descripción del listado — hay que verlos en 3D primero):
generadores texto→3D como [Meshy](https://www.meshy.ai) o
[Tripo3D](https://www.tripo3d.ai), o bancos de pago (Sketchfab Store,
TurboSquid) para más consistencia de calidad que lo gratuito.

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
