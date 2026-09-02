export type QualityLevel = 'high' | 'low'

export interface DinoStat {
  label: string
  value: string
}

export interface DinoData {
  id: string
  name: string
  scientificName: string
  emoji: string
  period: string
  yearsAgo: string
  stopT: number
  color: string
  accent: string
  stats: DinoStat[]
  funFacts: string[]
  mythTitle: string
  myth: string
  truth: string
}

/** -1 = puerta de entrada, 0..N-1 = paradas, N = puerta de salida */
export type RideStopIndex = number

export interface RideProgressInfo {
  index: RideStopIndex
  t: number
  isAnimating: boolean
}
