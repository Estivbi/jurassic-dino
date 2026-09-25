import { useEffect, useState } from 'react'
import type { ConstellationLabel } from '@scene/sky'

interface Props {
  enabled: boolean
  getLabels: () => ConstellationLabel[]
}

/** Nombres de las constelaciones superpuestos sobre el cielo (se recalculan unas 5 veces por segundo). */
export function ConstellationLabels({ enabled, getLabels }: Props) {
  const [labels, setLabels] = useState<ConstellationLabel[]>([])

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setLabels(getLabels()), 200)
    return () => window.clearInterval(id)
  }, [enabled, getLabels])

  if (!enabled) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {labels.map((label) => (
        <span
          key={label.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[0.65rem] tracking-wide text-[#9fc8ff]/80 sm:text-xs"
          style={{ left: `${label.x * 100}%`, top: `${label.y * 100}%` }}
        >
          {label.name}
        </span>
      ))}
    </div>
  )
}
