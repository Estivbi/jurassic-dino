/**
 * Smoothstep que admite bordes invertidos (a > b), como el de GLSL en la práctica:
 * `smooth(d, 1.5, 1)` vale 1 cerca y 0 lejos. El de three.js devuelve 0 en ese caso.
 */
export function smooth(x: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
