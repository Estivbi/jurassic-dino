import * as THREE from 'three'
import { WORLD_BOUNDS } from './constants'

export interface Zone {
  id: string
  label: string
  /** Esquina del mapa que representa esta zona, en unidades de mundo. */
  corner: [number, number]
  fogColor: THREE.Color
  groundTint: THREE.Color
  vegetationDensity: number
}

export const zones: Zone[] = [
  {
    id: 'jungla',
    label: 'Jungla densa',
    corner: [-WORLD_BOUNDS, -WORLD_BOUNDS],
    fogColor: new THREE.Color('#08160f'),
    groundTint: new THREE.Color('#0c2a1c'),
    vegetationDensity: 1.4,
  },
  {
    id: 'llanura',
    label: 'La llanura del paddock',
    corner: [WORLD_BOUNDS, -WORLD_BOUNDS],
    fogColor: new THREE.Color('#16241a'),
    groundTint: new THREE.Color('#284d2e'),
    vegetationDensity: 0.4,
  },
  {
    id: 'rocosa',
    label: 'Tierras rocosas',
    corner: [-WORLD_BOUNDS, WORLD_BOUNDS],
    fogColor: new THREE.Color('#1c1a14'),
    groundTint: new THREE.Color('#4a4030'),
    vegetationDensity: 0.25,
  },
  {
    id: 'laguna',
    label: 'La laguna',
    corner: [WORLD_BOUNDS, WORLD_BOUNDS],
    fogColor: new THREE.Color('#0a1f22'),
    groundTint: new THREE.Color('#163530'),
    vegetationDensity: 0.7,
  },
]

function blendFactors(x: number, z: number): [number, number] {
  const t = THREE.MathUtils.clamp((x / WORLD_BOUNDS + 1) / 2, 0, 1)
  const s = THREE.MathUtils.clamp((z / WORLD_BOUNDS + 1) / 2, 0, 1)
  return [t, s]
}

/** Interpola bilinealmente una propiedad de color de las 4 zonas según la posición en el mundo. */
export function blendZoneColor(x: number, z: number, pick: (zone: Zone) => THREE.Color, out = new THREE.Color()): THREE.Color {
  const [t, s] = blendFactors(x, z)
  const [jungla, llanura, rocosa, laguna] = zones
  const top = pick(jungla).clone().lerp(pick(llanura), t)
  const bottom = pick(rocosa).clone().lerp(pick(laguna), t)
  return out.copy(top.lerp(bottom, s))
}

export function blendVegetationDensity(x: number, z: number): number {
  const [t, s] = blendFactors(x, z)
  const [jungla, llanura, rocosa, laguna] = zones
  const top = THREE.MathUtils.lerp(jungla.vegetationDensity, llanura.vegetationDensity, t)
  const bottom = THREE.MathUtils.lerp(rocosa.vegetationDensity, laguna.vegetationDensity, t)
  return THREE.MathUtils.lerp(top, bottom, s)
}
