# Parque Jurásico 3D 🦖

Una web-regalo interactiva y educativa: conduces libremente un jeep de safari
por un parque con flora del Mesozoico, un lago y nueve especies reales (ocho
dinosaurios y un reptil marino). El cielo es el de verdad: el Sol, la Luna con
su fase y las estrellas se calculan para la ubicación y la hora del usuario.
Sin backend ni dependencias de pago: se despliega gratis en Vercel como sitio
estático.

## Qué hay en el parque

- **Cielo físico**: dispersión atmosférica con nubes (`Sky` de three.js), Sol en
  su posición real, Luna con su fase real (sale sola: se ilumina el hemisferio
  que mira al Sol), ~2.800 estrellas reales hasta magnitud 5,5 y las 88
  constelaciones, que giran con la hora sidérea. El propio cielo genera el mapa
  de entorno con el que se iluminan los materiales PBR.
- **Viajar en el tiempo**: desde el panel del cielo se puede adelantar o
  retrasar la hora ±12 h para ver el atardecer, la noche o el amanecer.
- **Terreno** con mezcla de texturas (musgo, tierra, roca sedimentaria con
  estratos, arena y barro en la orilla), cordillera perimetral y un **lago**
  excavado en el terreno con agua reflectante (en calidad alta refleja cielo,
  árboles y dinosaurios).
- **Flora mesozoica**: coníferas y árboles de hoja ancha generados con EZ-Tree
  y horneados a glTF, más helechos, helechos arborescentes y cícadas diseñados
  de forma procedural (en el Jurásico no había praderas de hierba). Todo se
  mueve con el viento.
- **Dinosaurios**: modelos 3D reales con licencia CC BY, a su tamaño real y en
  manadas. Los que traen esqueleto animado usan su animación; el resto camina
  con un andar procedural en el vertex shader (patas, cola y cuello). Esquivan
  troncos, rocas y a los demás animales.
- **Capa educativa**: ficha de cada especie con datos contrastados, un mito
  desmontado y una pregunta tipo quiz (los aciertos suman estrellas en el
  álbum), carteles de zona sobre flora y fósiles, y curiosidades del cielo.
- **Créditos** de todos los recursos de terceros, accesibles desde la entrada
  y desde el juego.

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [three.js](https://threejs.org) para la escena 3D
- [Framer Motion](https://motion.dev) para las transiciones del HUD
- [SunCalc](https://github.com/mourner/suncalc) para la posición del Sol y de la Luna
- Tailwind CSS v4 para el layout del HUD; la estética vive en `src/index.css`

## Controles

- **Teclado**: WASD o flechas para conducir.
- **Móvil**: botones en pantalla (solo en dispositivos táctiles).
- **E** o el botón en pantalla: ver la ficha del animal más cercano cuando
  aparece el aviso. **Esc** o la ✕ para cerrarla.
- **Panel del cielo** (arriba a la izquierda): hora, fase lunar, viajar en el
  tiempo y mostrar constelaciones.
- `?calidad=baja` / `?calidad=alta` en la URL fuerza el nivel de calidad.

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
  scene/
    GameScene.ts    # orquesta todo: render, cámara, colisiones, bucle
    celestial.ts    # astronomía: Sol, Luna, fase y rotación de la esfera celeste
    sky.ts          # cielo físico, estrellas, constelaciones, Luna y mapa de entorno
    lighting.ts     # luces y niebla a partir de la altura real del Sol y la Luna
    terrain.ts      # relieve, cuenca del lago y material con mezcla de texturas
    water.ts        # lago (Water de three.js o material físico en móvil)
    vegetation.ts   # árboles instanciados, flora procedural, rocas y viento
    dinosaurs.ts    # carga de modelos, manadas, IA, andar procedural
    vehicle.ts      # jeep modelado por piezas y su física
    zones.ts        # las 4 zonas del parque
    quality.ts      # presets de calidad por dispositivo
  components/       # HUD en React (panel del cielo, fichas, quiz, minimapa...)
  hooks/            # useGame: puente React <-> three.js
  data/             # fichas de especies, textos educativos y créditos
  assets/           # modelos glTF, texturas WebP y catálogo de estrellas
```

`@scene`, `@components`, `@data`, `@assets`, `@hooks` y `@ride-types` son
alias de sus carpetas en `src/` (en `vite.config.ts` y `tsconfig.app.json`).

### Cómo funciona

`useGame` guarda el input (teclado + táctil) en una ref que lee cada frame
`GameScene`, que no conoce React. La escena de three.js se carga con un
`import()` dinámico, así que three.js no entra en el bundle inicial.

El reloj astronómico (`celestial.ts`) usa la hora del dispositivo y la
geolocalización del navegador si se concede (si no, calcula el cielo para
Madrid). La ubicación nunca sale del navegador. Con la altura del Sol se
interpolan color e intensidad de la luz principal (que de noche pasa a ser la
luz de la Luna, más intensa cuanto más llena está), la exposición, la niebla y
los faros del jeep.

### Rendimiento

- `quality.ts` detecta móviles o equipos con poca memoria y reduce resolución,
  vegetación, sombras y el tipo de agua.
- La vegetación usa `InstancedMesh` repartidos en trozos de mapa para que la
  cámara y la sombra descarten los que no ven; los detalles pequeños no se
  dibujan en el reflejo del lago.
- Los modelos van comprimidos con Meshopt y texturas WebP de 1024 px o menos.

### Añadir un modelo nuevo

```bash
npx @gltf-transform/cli optimize entrada.glb salida.glb \
  --texture-size 1024 --texture-compress webp --compress meshopt
```

Después, añade la especie a `SPECIES` en `src/scene/dinosaurs.ts` (longitud
real en metros y hacia dónde mira el modelo: se escala y centra solo), su
ficha en `src/data/dinos.ts` y su atribución en `src/data/credits.ts`.
Comprueba siempre la licencia en los metadatos del GLB y evita modelos
extraídos de videojuegos aunque digan ser CC BY.

## Créditos

Todos los recursos de terceros están listados, con autor, licencia y enlace, en
`src/data/credits.ts` y en la pantalla de créditos del juego. Los modelos de
dinosaurios son CC BY 4.0 (Marcel Schanz, MrTomas, wojciechmiedziocha,
IagoMendez, seirogan, kenchoo, Saurus, dinoguy263allo y ricksticky); el cielo y
el agua vienen de three.js (MIT); los árboles, de EZ-Tree (MIT); las estrellas,
de d3-celestial (BSD-3).

## Despliegue en Vercel

Es un build estático de Vite, no requiere configuración adicional:

1. Importa el repositorio en [Vercel](https://vercel.com/new).
2. Vercel detecta el framework "Vite": build `npm run build`, salida `dist`.
3. Despliega. No hay variables de entorno ni backend.

```bash
npm run build
npm run preview
```
