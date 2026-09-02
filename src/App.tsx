import { useRide } from '@hooks/useRide'
import { CanvasStage } from '@components/CanvasStage'
import { HUD } from '@components/HUD'
import { GateScreen } from '@components/GateScreen'
import { EndScreen } from '@components/EndScreen'

export default function App() {
  const ride = useRide()

  const showEnd = ride.phase === 'end' && !ride.isAnimating

  return (
    <div className="relative h-full w-full">
      <CanvasStage containerRef={ride.containerRef} canvasRef={ride.canvasRef} />

      {ride.index > -1 && !showEnd && (
        <HUD
          progressPercent={ride.progressPercent}
          index={ride.index}
          phase={ride.phase}
          currentDino={ride.currentDino}
          isAnimating={ride.isAnimating}
          totalStops={ride.totalStops}
          next={ride.next}
          prev={ride.prev}
        />
      )}

      {ride.phase === 'gate' && <GateScreen onStart={ride.start} />}
      {showEnd && <EndScreen onRestart={ride.restart} />}
    </div>
  )
}
