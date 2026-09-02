import { useCallback, useEffect, useRef, useState } from 'react'
import { dinos } from '@data/dinos'
import { detectQuality } from '@scene/quality'
import { createInputState, attachKeyboardControls, type InputState } from '@scene/input'
import type { GameScene } from '@scene/GameScene'
import type { GamePhase } from '@ride-types/ride'

const ZERO_INPUT: InputState = { forward: false, back: false, left: false, right: false }

export interface GameApi {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  phase: GamePhase
  nearbyDino: (typeof dinos)[number] | null
  cardDino: (typeof dinos)[number] | null
  discovered: Set<string>
  totalDinos: number
  start: () => void
  openCard: () => void
  closeCard: () => void
  pressTouch: (key: keyof InputState, pressed: boolean) => void
}

export function useGame(): GameApi {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const inputRef = useRef<InputState>(createInputState())
  const phaseRef = useRef<GamePhase>('gate')
  const cardOpenIdRef = useRef<string | null>(null)
  const lastNearbyRef = useRef<string | null>(null)

  const [phase, setPhase] = useState<GamePhase>('gate')
  const [nearbyDinoId, setNearbyDinoId] = useState<string | null>(null)
  const [cardOpenId, setCardOpenId] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!canvasRef.current) return
    let cancelled = false
    let detachKeyboard: (() => void) | null = null

    import('@scene/GameScene').then(({ GameScene }) => {
      if (cancelled || !canvasRef.current) return
      const scene = new GameScene(canvasRef.current, dinos, detectQuality())
      sceneRef.current = scene
      detachKeyboard = attachKeyboardControls(inputRef.current)

      scene.startLoop(
        (nearbyId) => {
          if (nearbyId !== lastNearbyRef.current) {
            lastNearbyRef.current = nearbyId
            setNearbyDinoId(nearbyId)
          }
        },
        () => (phaseRef.current === 'driving' && !cardOpenIdRef.current ? inputRef.current : ZERO_INPUT),
      )
    })

    const resizeObserver = new ResizeObserver(() => sceneRef.current?.resize())
    if (containerRef.current) resizeObserver.observe(containerRef.current)

    return () => {
      cancelled = true
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

  const nearbyDino = nearbyDinoId ? (dinos.find((d) => d.id === nearbyDinoId) ?? null) : null
  const cardDino = cardOpenId ? (dinos.find((d) => d.id === cardOpenId) ?? null) : null

  return {
    canvasRef,
    containerRef,
    phase,
    nearbyDino,
    cardDino,
    discovered,
    totalDinos: dinos.length,
    start,
    openCard,
    closeCard,
    pressTouch,
  }
}
