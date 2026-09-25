import { useEffect, useRef } from 'react'
import type { GameApi } from '@hooks/useGame'
import { ZONE_MAP_TINTS } from '@data/zoneMap'
import { LAKE, WORLD_BOUNDS } from '@scene/constants'

interface Props {
  getSnapshot: GameApi['getMinimapSnapshot']
}

const SIZE = 120
const DOT_RADIUS = 3.2
const PLAYER_SIZE = 6

function worldToMap(x: number, z: number): [number, number] {
  const mx = ((x / WORLD_BOUNDS + 1) / 2) * SIZE
  const mz = ((z / WORLD_BOUNDS + 1) / 2) * SIZE
  return [mx, mz]
}

export function MiniMap({ getSnapshot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const draw = () => {
      const snapshot = getSnapshot()
      ctx.clearRect(0, 0, SIZE, SIZE)

      // fondo + tintes de zona por cuadrante, para ubicarse a golpe de vista
      ctx.fillStyle = '#050d09'
      ctx.fillRect(0, 0, SIZE, SIZE)
      for (const zone of ZONE_MAP_TINTS) {
        const left = zone.corner[0] < 0 ? 0 : SIZE / 2
        const top = zone.corner[1] < 0 ? 0 : SIZE / 2
        ctx.fillStyle = zone.color
        ctx.globalAlpha = 0.45
        ctx.fillRect(left, top, SIZE / 2, SIZE / 2)
      }
      ctx.globalAlpha = 1

      // El lago, para orientarse.
      const [lx, lz] = worldToMap(LAKE.x, LAKE.z)
      ctx.fillStyle = '#2f6f8a'
      ctx.beginPath()
      ctx.arc(lx, lz, (LAKE.radius / (WORLD_BOUNDS * 2)) * SIZE, 0, Math.PI * 2)
      ctx.fill()

      if (snapshot) {
        for (const dino of snapshot.dinos) {
          const [dx, dz] = worldToMap(dino.x, dino.z)
          ctx.fillStyle = dino.color
          ctx.beginPath()
          ctx.arc(dx, dz, DOT_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        const [px, pz] = worldToMap(snapshot.player.x, snapshot.player.z)
        const heading = snapshot.player.heading
        ctx.save()
        ctx.translate(px, pz)
        ctx.rotate(Math.atan2(Math.sin(heading), -Math.cos(heading)))
        ctx.fillStyle = '#f3ecd6'
        ctx.beginPath()
        ctx.moveTo(0, -PLAYER_SIZE)
        ctx.lineTo(PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.7)
        ctx.lineTo(-PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.7)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      ctx.strokeStyle = 'rgba(243,236,214,0.35)'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2)
    }

    draw()
    const interval = window.setInterval(draw, 150)
    return () => window.clearInterval(interval)
  }, [getSnapshot])

  return (
    <div className="pointer-events-none overflow-hidden rounded-xl border-2 border-[var(--amber-500)]/40 bg-black/40 shadow-lg backdrop-blur-sm">
      <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE, display: 'block' }} />
    </div>
  )
}
