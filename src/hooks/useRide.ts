import { useCallback, useEffect, useRef, useState } from 'react'
import { dinos } from '@data/dinos'
import { detectQuality } from '@scene/quality'
import type { RideScene } from '@scene/RideScene'
import type { RideStopIndex } from '@ride-types/ride'

const STOP_TS = [0, ...dinos.map((d) => d.stopT), 1]

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

interface TweenState {
  active: boolean
  from: number
  to: number
  start: number
  duration: number
}

export interface RideApi {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  index: RideStopIndex
  isAnimating: boolean
  progressPercent: number
  phase: 'gate' | 'stop' | 'end'
  currentDino: (typeof dinos)[number] | null
  totalStops: number
  start: () => void
  next: () => void
  prev: () => void
  restart: () => void
}

export function useRide(): RideApi {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<RideScene | null>(null)
  const liveTRef = useRef(0)
  const tweenRef = useRef<TweenState>({ active: false, from: 0, to: 0, start: 0, duration: 0 })

  const [index, setIndex] = useState<RideStopIndex>(-1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)

  useEffect(() => {
    if (!canvasRef.current) return
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    // three.js pesa la mayor parte del bundle: se carga bajo demanda para que la
    // valla de entrada (HTML/CSS/React) pinte de inmediato mientras la escena llega en paralelo.
    import('@scene/RideScene').then(({ RideScene }) => {
      if (cancelled || !canvasRef.current) return
      const scene = new RideScene(canvasRef.current, dinos, detectQuality())
      sceneRef.current = scene

      scene.startLoop(() => {
        const tween = tweenRef.current
        if (tween.active) {
          const elapsed = performance.now() - tween.start
          const raw = Math.min(elapsed / tween.duration, 1)
          const eased = easeInOutCubic(raw)
          liveTRef.current = tween.from + (tween.to - tween.from) * eased
          setProgressPercent(liveTRef.current * 100)
          if (raw >= 1) {
            tween.active = false
            setIsAnimating(false)
          }
        }
        scene.setProgress(liveTRef.current)
      })

      resizeObserver = new ResizeObserver(() => scene.resize())
      if (containerRef.current) resizeObserver.observe(containerRef.current)
    })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  const goTo = useCallback((targetIndex: RideStopIndex) => {
    const clamped = Math.max(-1, Math.min(dinos.length, targetIndex))
    const toT = STOP_TS[clamped + 1]
    const fromT = liveTRef.current
    const distance = Math.abs(toT - fromT)
    tweenRef.current = {
      active: true,
      from: fromT,
      to: toT,
      start: performance.now(),
      duration: 900 + distance * 3200,
    }
    setIsAnimating(true)
    setIndex(clamped)
  }, [])

  const start = useCallback(() => goTo(0), [goTo])
  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const restart = useCallback(() => {
    liveTRef.current = 0
    tweenRef.current = { active: false, from: 0, to: 0, start: 0, duration: 0 }
    setProgressPercent(0)
    setIndex(-1)
  }, [])

  const phase = index === -1 ? 'gate' : index === dinos.length ? 'end' : 'stop'
  const currentDino = phase === 'stop' ? dinos[index] : null

  return {
    canvasRef,
    containerRef,
    index,
    isAnimating,
    progressPercent,
    phase,
    currentDino,
    totalStops: dinos.length,
    start,
    next,
    prev,
    restart,
  }
}
