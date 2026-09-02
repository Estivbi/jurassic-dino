export type QualityLevel = 'high' | 'low'

export type ZoneId = 'jungla' | 'llanura' | 'rocosa' | 'laguna'

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
  zoneId: ZoneId
  color: string
  accent: string
  stats: DinoStat[]
  funFacts: string[]
  mythTitle: string
  myth: string
  truth: string
}

export type GamePhase = 'gate' | 'driving'
