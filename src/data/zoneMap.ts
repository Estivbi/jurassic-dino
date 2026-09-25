/**
 * Copia ligera (sin depender de three.js) de la disposición de zonas de `src/scene/zones.ts`,
 * solo para pintar el fondo del minimapa sin arrastrar three.js al bundle inicial de React.
 * Si cambias las esquinas de zona allí, actualiza también esto.
 */
export const ZONE_MAP_TINTS: { corner: [number, number]; color: string }[] = [
  { corner: [-1, -1], color: '#1f4a2a' }, // bosque de coníferas
  { corner: [1, -1], color: '#5b7040' }, // llanura de helechos
  { corner: [-1, 1], color: '#7a6448' }, // cañones rocosos
  { corner: [1, 1], color: '#3d6a52' }, // laguna
]
