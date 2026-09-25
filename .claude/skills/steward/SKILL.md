---
name: steward
description: Normas de este repositorio para llevar una PR de principio a fin (ramas, autoría, comprobaciones antes de cada push, respuesta a revisiones y fusión). Úsala al crear, actualizar, revisar o fusionar PRs de este repo.
---

# Llevar una PR en este repo

## Ramas y autoría

- Trabaja siempre en una rama `claude/<tema>` creada desde `origin/main` actualizado.
  Nunca push directo a `main`.
- Commits a nombre de `Carolina Rodriguez Barcena <94956228+Estivbi@users.noreply.github.com>`.
  Si `git log -1 --format=%an` muestra otra cosa, corrige el autor antes de subir.
- Sin líneas de atribución de Claude en commits ni en la descripción de la PR.
- Un tema por PR. Si la dueña pide "otra PR", abre una rama nueva.

## Antes de cada push

1. `npx tsc -b`
2. `npm run lint`
3. `npm run build` (vigila que el chunk inicial `index-*.js` no crezca: three.js debe
   quedarse en el chunk de `GameScene`)
4. Si el cambio toca la escena o el HUD: skill `visual-qa` (capturas + `drive-test.mjs`).

## Descripción de la PR

En español: qué cambia, por qué y cómo probarlo, más una lista de lo verificado. Si
tras una revisión se aplican cambios, añade una sección "Cambios tras la revisión".

## Revisiones y CI

- Aplica los comentarios pequeños y concretos; propón antes los cambios grandes.
- Los hallazgos de bots (Copilot, etc.) se verifican y, si son ciertos, se arreglan.
- Nunca reescribas historia en una rama compartida sin permiso explícito. Push forzado
  solo en la rama de la propia PR y solo si la dueña lo autoriza.

## Fusionar

Solo cuando la dueña lo pida. Método `merge` (commit de fusión), comprobando antes que
todos los commits tienen su autoría.
