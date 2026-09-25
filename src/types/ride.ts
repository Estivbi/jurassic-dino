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

/** Tipo de voz procedural (reconstrucción): ninguna voz de dinosaurio se ha conservado. */
export type DinoVoice = 'boom' | 'bellow' | 'croc' | 'chirp' | 'grunt' | 'splash'

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
  /** Longitud real de hocico a cola, en metros (el modelo 3D se escala a esto). */
  lengthM: number
  /** Altura real hasta lo más alto de la cabeza (o la vela) en postura normal, en metros. */
  heightM: number
  voice: DinoVoice
  /** Qué se sabe (o se supone) de cómo sonaba. */
  soundFact: string
  stats: DinoStat[]
  funFacts: string[]
  mythTitle: string
  myth: string
  truth: string
  quiz: DinoQuiz
}

export type GamePhase = 'gate' | 'driving'
