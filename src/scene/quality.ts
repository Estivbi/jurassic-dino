import type { QualityLevel } from '@ride-types/ride'

export interface QualitySettings {
  level: QualityLevel
  pixelRatioCap: number
  shadows: boolean
  fogFar: number
  antialias: boolean
  terrainSegments: number
  treeCount: number
  /** Arbustos por cada árbol. */
  bushRatio: number
  fernCount: number
  treeFernCount: number
  cycadCount: number
  rockCount: number
  /** Agua con reflejo real (render extra) o material físico barato. */
  reflectiveWater: boolean
  /** Ejemplares por manada (triceratops, velociraptores...). */
  herdScale: number
}

export function detectQuality(): QualityLevel {
  // Permite forzarla desde la URL (?calidad=baja / ?calidad=alta), útil en equipos justos.
  const forced = new URLSearchParams(window.location.search).get('calidad')
  if (forced === 'baja') return 'low'
  if (forced === 'alta') return 'high'
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches
  const smallScreen = window.innerWidth < 820
  const lowMemory = 'deviceMemory' in navigator && (navigator as unknown as { deviceMemory: number }).deviceMemory <= 4
  return coarsePointer && (smallScreen || lowMemory) ? 'low' : 'high'
}

export function getQualitySettings(level: QualityLevel): QualitySettings {
  if (level === 'low') {
    return {
      level,
      pixelRatioCap: 1.5,
      shadows: false,
      fogFar: 95,
      antialias: false,
      terrainSegments: 150,
      treeCount: 110,
      bushRatio: 0.3,
      fernCount: 700,
      treeFernCount: 45,
      cycadCount: 60,
      rockCount: 80,
      reflectiveWater: false,
      herdScale: 0.6,
    }
  }
  return {
    level,
    pixelRatioCap: 2,
    shadows: true,
    fogFar: 170,
    antialias: true,
    terrainSegments: 230,
    treeCount: 250,
    bushRatio: 0.45,
    fernCount: 1600,
    treeFernCount: 110,
    cycadCount: 140,
    rockCount: 170,
    reflectiveWater: true,
    herdScale: 1,
  }
}
