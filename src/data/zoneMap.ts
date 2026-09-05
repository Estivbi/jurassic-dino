/**
 * Copia ligera (sin depender de three.js) de la disposición de zonas de `src/scene/zones.ts`,
 * solo para pintar el fondo del minimapa sin arrastrar three.js al bundle inicial de React.
 * Si cambias las esquinas o los tintes de zona allí, actualiza también esto.
 */
export const ZONE_MAP_TINTS: { corner: [number, number]; color: string }[] = [
  { corner: [-1, -1], color: '#1a4028' }, // jungla
  { corner: [1, -1], color: '#3d6b45' }, // llanura
  { corner: [-1, 1], color: '#665640' }, // rocosa
  { corner: [1, 1], color: '#2a5850' }, // laguna
]
