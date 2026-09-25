export type QualityLevel = 'high' | 'low'

export type ZoneId = 'jungla' | 'llanura' | 'rocosa' | 'laguna'

export interface DinoStat {
  label: string
  value: string
}

export interface DinoQuiz {
  question: string
  options: string[]
  /** Índice de la respuesta correcta en `options`. */
  answer: number
  explanation: string
}

export interface DinoData {
  id: string
  name: string
  scientificName: string
  emoji: string
  /** Grupo al que pertenece (p. ej. "Terópodo"); deja claro si no es un dinosaurio. */
  group: string
  isDinosaur: boolean
  period: string
  yearsAgo: string
  zoneId: ZoneId
  accent: string
  stats: DinoStat[]
  funFacts: string[]
  mythTitle: string
  myth: string
  truth: string
  quiz: DinoQuiz
}

export type GamePhase = 'gate' | 'driving'
