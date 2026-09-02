import type { RideApi } from '@hooks/useRide'
import { ProgressBar } from './ProgressBar'
import { DinoCard } from './DinoCard'
import { Controls } from './Controls'

type Props = Pick<
  RideApi,
  'progressPercent' | 'index' | 'phase' | 'currentDino' | 'isAnimating' | 'totalStops' | 'next' | 'prev'
>

export function HUD({ progressPercent, index, phase, currentDino, isAnimating, totalStops, next, prev }: Props) {
  const nextLabel = index === totalStops - 1 ? 'Salir del parque →' : isAnimating ? 'En marcha…' : 'Siguiente parada →'

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <ProgressBar progressPercent={progressPercent} currentIndex={index} />

      <div className="pointer-events-none flex flex-col gap-0 px-3 pb-3 sm:px-6 sm:pb-6">
        {phase === 'stop' && currentDino && !isAnimating && <DinoCard dino={currentDino} />}
        <Controls onPrev={prev} onNext={next} canGoPrev={index > -1} disabled={isAnimating} nextLabel={nextLabel} />
      </div>
    </div>
  )
}
