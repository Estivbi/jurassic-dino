import * as THREE from 'three'
import type { ZoneId } from '@ride-types/ride'
import { WORLD_BOUNDS } from './constants'

export interface Zone {
  id: ZoneId
  label: string
  /** Esquina del mapa que representa esta zona, en unidades de mundo. */
  corner: [number, number]
  /** Densidad relativa de árboles (0 = ninguno). */
  treeDensity: number
  /** Densidad relativa de helechos, cícadas y sotobosque. */
  understoryDensity: number
}

export const zones: Zone[] = [
  { id: 'jungla', label: 'Bosque de coníferas', corner: [-WORLD_BOUNDS, -WORLD_BOUNDS], treeDensity: 1.5, understoryDensity: 1.4 },
  { id: 'llanura', label: 'Llanura de helechos', corner: [WORLD_BOUNDS, -WORLD_BOUNDS], treeDensity: 0.28, understoryDensity: 1.1 },
  { id: 'rocosa', label: 'Cañones rocosos', corner: [-WORLD_BOUNDS, WORLD_BOUNDS], treeDensity: 0.22, understoryDensity: 0.35 },
  { id: 'laguna', label: 'La laguna', corner: [WORLD_BOUNDS, WORLD_BOUNDS], treeDensity: 0.7, understoryDensity: 1.0 },
]

export type ZoneWeights = Record<ZoneId, number>

/** Pesos bilineales (suman 1) de cada zona en un punto del mapa. */
export function zoneWeights(x: number, z: number): ZoneWeights {
  const t = THREE.MathUtils.smoothstep((x / WORLD_BOUNDS + 1) / 2, 0.2, 0.8)
  const s = THREE.MathUtils.smoothstep((z / WORLD_BOUNDS + 1) / 2, 0.2, 0.8)
  return {
    jungla: (1 - t) * (1 - s),
    llanura: t * (1 - s),
    rocosa: (1 - t) * s,
    laguna: t * s,
  }
}

export function blendZoneValue(x: number, z: number, pick: (zone: Zone) => number): number {
  const w = zoneWeights(x, z)
  return zones.reduce((sum, zone) => sum + pick(zone) * w[zone.id], 0)
}

export function dominantZone(x: number, z: number): Zone {
  const w = zoneWeights(x, z)
  return zones.reduce((best, zone) => (w[zone.id] > w[best.id] ? zone : best), zones[0])
}

/** Centro "natural" de cada zona (a medio camino entre el centro del mapa y su esquina). */
export function zoneHome(zone: Zone): THREE.Vector2 {
  return new THREE.Vector2(zone.corner[0] * 0.55, zone.corner[1] * 0.55)
}
