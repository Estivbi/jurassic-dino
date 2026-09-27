import { useEffect, useState } from 'react'
import type { GameApi } from '@hooks/useGame'
import type { DebugInfo } from '@scene/GameScene'

interface Props {
  getDebugInfo: GameApi['getDebugInfo']
}

/**
 * Panel de rendimiento, solo con `?debug=1` en la URL. Pensado para abrir la web en un móvil
 * real, dar una vuelta y hacer una captura de pantalla con los números.
 */
export function DebugOverlay({ getDebugInfo }: Props) {
  const [info, setInfo] = useState<DebugInfo | null>(null)
  const [minFps, setMinFps] = useState(Infinity)

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getDebugInfo()
      setInfo(next)
      // Los primeros segundos (carga de modelos) no cuentan para el mínimo.
      if (next && next.fps > 0 && performance.now() > 8000) setMinFps((m) => Math.min(m, next.fps))
    }, 500)
    return () => window.clearInterval(id)
  }, [getDebugInfo])

  if (!info) return null
  const fpsColor = info.fps >= 50 ? '#7ee787' : info.fps >= 30 ? '#f3b93f' : '#ff7b72'
  return (
    <div className="pointer-events-none absolute left-3 top-[6.5rem] z-20 max-w-[calc(100vw-10rem)] sm:top-28 rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[0.65rem] leading-snug text-[var(--cream)]">
      <p>
        <span style={{ color: fpsColor }}>{info.fps.toFixed(0)} FPS</span>
        {Number.isFinite(minFps) && <span className="text-[var(--cream)]/60"> (mín. {minFps.toFixed(0)})</span>}
      </p>
      <p>
        calidad {info.quality} · escalón {info.qualityStep} · px {info.pixelRatio.toFixed(2)}
      </p>
      <p>
        {info.drawCalls} llamadas · {(info.triangles / 1000).toFixed(0)}k triángulos
      </p>
      <p className="truncate text-[var(--cream)]/60">{info.gpu}</p>
      <p className="text-[var(--cream)]/60">{window.devicePixelRatio}x · {window.innerWidth}×{window.innerHeight}</p>
    </div>
  )
}
