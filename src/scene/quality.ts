import type { QualityLevel } from '@ride-types/ride'

export interface QualitySettings {
  level: QualityLevel
  pixelRatioCap: number
  shadows: boolean
  fogFar: number
  vegetationCount: number
  antialias: boolean
}

export function detectQuality(): QualityLevel {
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
      fogFar: 60,
      vegetationCount: 90,
      antialias: false,
    }
  }
  return {
    level,
    pixelRatioCap: 2,
    shadows: true,
    fogFar: 110,
    vegetationCount: 260,
    antialias: true,
  }
}
