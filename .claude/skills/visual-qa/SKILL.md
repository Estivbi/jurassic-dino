---
name: visual-qa
description: Comprueba visualmente el parque en un navegador sin cabeza (capturas de escritorio y móvil, día/atardecer/noche, cada dinosaurio, la Luna) y prueba la conducción. Úsala después de cualquier cambio en src/scene o en el HUD, antes de abrir o actualizar una PR, o cuando haya que enseñar cómo ha quedado algo.
---

# Revisión visual del parque

No hay tests unitarios: lo que valida un cambio visual son capturas reales del juego.

## 1. Arrancar el servidor

```bash
npx vite --port 5173 --strictPort > /tmp/vite.log 2>&1 &
until curl -s -o /dev/null http://localhost:5173/; do sleep 1; done
```

Si una captura falla con `ERR_CONNECTION_REFUSED`, el servidor se ha caído (el
contenedor se recicla): vuelve a lanzarlo.

## 2. Capturas

Scripts en `.claude/skills/visual-qa/scripts/` (usan el Playwright global del contenedor).

```bash
S=.claude/skills/visual-qa/scripts
# Mediodía, cada dinosaurio con cámara libre
node $S/shots.mjs --time 2026-09-25T12:30:00+02:00 --label mediodia --out /tmp/shots \
  c-t-rex:18 c-triceratops:14 c-brachiosaurus:34 c-spinosaurus:20
# Atardecer y noche con constelaciones y Luna
node $S/shots.mjs --time 2026-09-25T19:52:00+02:00 --label atardecer --out /tmp/shots
node $S/shots.mjs --time 2026-09-25T23:40:00+02:00 --label noche --constelaciones --out /tmp/shots moon
# Móvil en vertical
node $S/shots.mjs --mobile --label movil --out /tmp/shots
# Juntar varias en una sola imagen y mirarla con Read
node $S/contact-sheet.mjs /tmp/shots/hoja.png 2 480 270 /tmp/shots/*.png
```

Vistas: `d-<especie>:<dist>` (jeep mirando al animal), `c-<especie>:<dist>` (cámara
libre), `v-x,y,z,tx,ty,tz` (cámara libre desde/hacia) y `moon`. Las especies son los
`id` de `src/data/dinos.ts`.

## 3. Conducción

```bash
node .claude/skills/visual-qa/scripts/drive-test.mjs
```

Comprueba que el jeep avanza y gira, que no entra en el lago y que rebota al chocar
con un dinosaurio. Tiene que acabar en `sin errores`.

## Cosas a tener en cuenta

- Aquí no hay GPU: todo va a pocos FPS. Usa siempre `--calidad` (por defecto `baja`)
  para que la calidad adaptativa no cambie la escena en mitad de la prueba. Los FPS y
  los tiempos de este entorno no dicen nada del rendimiento real.
- Con pocos FPS la física avanza en pasos de 0,1 s: las distancias recorridas serán
  menores que en un equipo real.
- Mira siempre las capturas con Read antes de dar algo por bueno, y compártelas con
  SendUserFile cuando el cambio sea visible.
