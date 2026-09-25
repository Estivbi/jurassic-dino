import { useCallback, useEffect, useRef, useState } from 'react'
import { dinos } from '@data/dinos'
import { detectQuality } from '@scene/quality'
import { createInputState, attachKeyboardControls, type InputState } from '@scene/input'
import type { GameScene, MinimapSnapshot, SkyInfo } from '@scene/GameScene'
import type { ConstellationLabel } from '@scene/sky'
import type { GamePhase, ZoneId } from '@ride-types/ride'

const ZERO_INPUT: InputState = { forward: false, back: false, left: false, right: false }

export interface GameApi {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  phase: GamePhase
  nearbyDino: (typeof dinos)[number] | null
  cardDino: (typeof dinos)[number] | null
  discovered: Set<string>
  /** Resultado del quiz de cada especie ya respondida (true = acierto). */
  quizResults: Map<string, boolean>
  totalDinos: number
  zoneId: ZoneId | null
  skyInfo: SkyInfo | null
  constellationsOn: boolean
  start: () => void
  openCard: () => void
  closeCard: () => void
  answerQuiz: (dinoId: string, correct: boolean) => void
  pressTouch: (key: keyof InputState, pressed: boolean) => void
  getMinimapSnapshot: () => MinimapSnapshot | null
  getConstellationLabels: () => ConstellationLabel[]
  setHourOffset: (hours: number) => void
  setConstellationsOn: (on: boolean) => void
}

export function useGame(): GameApi {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const inputRef = useRef<InputState>(createInputState())
  const phaseRef = useRef<GamePhase>('gate')
  const cardOpenIdRef = useRef<string | null>(null)
  const lastNearbyRef = useRef<string | null>(null)
  const lastZoneRef = useRef<ZoneId | null>(null)

  const [phase, setPhase] = useState<GamePhase>('gate')
  const [nearbyDinoId, setNearbyDinoId] = useState<string | null>(null)
  const [cardOpenId, setCardOpenId] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [quizResults, setQuizResults] = useState<Map<string, boolean>>(new Map())
  const [zoneId, setZoneId] = useState<ZoneId | null>(null)
  const [skyInfo, setSkyInfo] = useState<SkyInfo | null>(null)
  const [constellationsOn, setConstellationsOnState] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    let cancelled = false
    let detachKeyboard: (() => void) | null = null
    let skyInterval: number | undefined

    import('@scene/GameScene').then(({ GameScene }) => {
      if (cancelled || !canvasRef.current) return
      const scene = new GameScene(canvasRef.current, dinos, detectQuality())
      sceneRef.current = scene
      detachKeyboard = attachKeyboardControls(inputRef.current)
      if (import.meta.env.DEV) (window as unknown as { __gameScene?: GameScene }).__gameScene = scene

      scene.startLoop(
        (frame) => {
          if (frame.nearbyDinoId !== lastNearbyRef.current) {
            lastNearbyRef.current = frame.nearbyDinoId
            setNearbyDinoId(frame.nearbyDinoId)
          }
          if (frame.zoneId !== lastZoneRef.current) {
            lastZoneRef.current = frame.zoneId
            setZoneId(frame.zoneId)
          }
        },
        () => (phaseRef.current === 'driving' && !cardOpenIdRef.current ? inputRef.current : ZERO_INPUT),
      )
      setSkyInfo(scene.getSkyInfo())
      skyInterval = window.setInterval(() => setSkyInfo(sceneRef.current?.getSkyInfo() ?? null), 1000)
    })

    const resizeObserver = new ResizeObserver(() => sceneRef.current?.resize())
    if (containerRef.current) resizeObserver.observe(containerRef.current)

    return () => {
      cancelled = true
      window.clearInterval(skyInterval)
      resizeObserver.disconnect()
      detachKeyboard?.()
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    phaseRef.current = 'driving'
    setPhase('driving')
  }, [])

  const openCard = useCallback(() => {
    const id = lastNearbyRef.current
    if (!id) return
    cardOpenIdRef.current = id
    setCardOpenId(id)
    setDiscovered((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  const closeCard = useCallback(() => {
    cardOpenIdRef.current = null
    setCardOpenId(null)
  }, [])

  const answerQuiz = useCallback((dinoId: string, correct: boolean) => {
    setQuizResults((prev) => (prev.has(dinoId) ? prev : new Map(prev).set(dinoId, correct)))
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.code === 'KeyE' || event.code === 'Enter') && !cardOpenIdRef.current && lastNearbyRef.current) {
        openCard()
      } else if (event.code === 'Escape' && cardOpenIdRef.current) {
        closeCard()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openCard, closeCard])

  const pressTouch = useCallback((key: keyof InputState, pressed: boolean) => {
    inputRef.current[key] = pressed
  }, [])

  const getMinimapSnapshot = useCallback(() => sceneRef.current?.getMinimapSnapshot() ?? null, [])
  const getConstellationLabels = useCallback(() => sceneRef.current?.getConstellationLabels() ?? [], [])

  const setHourOffset = useCallback((hours: number) => {
    sceneRef.current?.setHourOffset(hours)
    setSkyInfo(sceneRef.current?.getSkyInfo() ?? null)
  }, [])

  const setConstellationsOn = useCallback((on: boolean) => {
    sceneRef.current?.setConstellationsVisible(on)
    setConstellationsOnState(on)
  }, [])

  const nearbyDino = nearbyDinoId ? (dinos.find((d) => d.id === nearbyDinoId) ?? null) : null
  const cardDino = cardOpenId ? (dinos.find((d) => d.id === cardOpenId) ?? null) : null

  return {
    canvasRef,
    containerRef,
    phase,
    nearbyDino,
    cardDino,
    discovered,
    quizResults,
    totalDinos: dinos.length,
    zoneId,
    skyInfo,
    constellationsOn,
    start,
    openCard,
    closeCard,
    answerQuiz,
    pressTouch,
    getMinimapSnapshot,
    getConstellationLabels,
    setHourOffset,
    setConstellationsOn,
  }
}
