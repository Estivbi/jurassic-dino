---
name: add-3d-asset
description: Proceso para añadir al parque un modelo 3D, textura o dato de terceros (un dinosaurio nuevo, un árbol, un sonido...) con la licencia verificada, optimizado para móvil e integrado con sus créditos. Úsala siempre que se vaya a meter un recurso externo en src/assets.
---

# Añadir un recurso de terceros

## 1. Licencia antes que nada

- Solo CC0, CC BY, MIT o similares que permitan uso y modificación. Nada de NC/ND
  si algún día se quiere comercializar.
- Mira los metadatos del GLB (los de Sketchfab traen autor, licencia y origen):
  `node .claude/skills/add-3d-asset/scripts/glbinfo.mjs modelo.glb`
- **Rechaza los modelos extraídos de videojuegos** (Jurassic World Evolution/Alive,
  Dino Hunter, Walking with Dinosaurs, DAZ...) aunque el uploader diga CC BY: no son
  suyos. Si el título o la descripción nombran un juego, descártalo.
- Red del contenedor: GitHub, raw.githubusercontent.com y npm funcionan; Sketchfab,
  Poly Haven, ambientCG, Kenney, itch.io, unpkg y jsdelivr suelen estar bloqueados.
  Si hace falta uno, pídeselo a la usuaria (puede subirlo o abrir el dominio en la red
  del entorno).

## 2. Optimizar

```bash
npx @gltf-transform/cli optimize entrada.glb salida.glb \
  --texture-size 1024 --texture-compress webp --compress meshopt
# Mallas pesadas (>40k triángulos): añade --simplify-ratio 0.3 --simplify-error 0.002
# Modelos sin texturas (p. ej. árboles horneados): añade --prune-attributes false
```

Objetivo: menos de ~800 KB y ~30k triángulos por dinosaurio. Texturas sueltas a WebP
(con `sharp`), 1024 px o menos.

## 3. Revisar el modelo

Hay que verlo antes de integrarlo (hacia dónde mira, escala, si trae animación y si esa
animación camina o se queda quieta). Un visor mínimo con three.js + Playwright basta.
Anota:

- `facing`: `1` si el hocico mira a +Z, `-1` si mira a −Z.
- Si es `SkinnedMesh` sin animación: `bakedGeometry` ya aplica la pose del esqueleto.
- Si trae animación de andar: `skeletal`; si no, `gait: 'biped' | 'quad'` (andar
  procedural en shader).

## 4. Integrar

1. Copia el GLB a `src/assets/models/<id>.glb` (el `id` en kebab-case).
2. Añade la especie a `SPECIES` en `src/scene/dinosaurs.ts` con su **longitud real en
   metros** (el modelo se escala a esa longitud), hábitat, manada y velocidades.
3. Añade su ficha a `src/data/dinos.ts` (skill `dino-content`).
4. Añade la atribución a `src/data/credits.ts`: qué es, título exacto, autor, licencia,
   enlace y "Optimizado para web..." en `changes` (CC BY exige indicar cambios).
5. Comprueba con la skill `visual-qa` (`c-<id>:<dist>`) que se ve a su tamaño, bien
   orientado y apoyado en el suelo.
