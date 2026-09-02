import type { RideApi } from '@hooks/useRide'

interface Props {
  containerRef: RideApi['containerRef']
  canvasRef: RideApi['canvasRef']
}

export function CanvasStage({ containerRef, canvasRef }: Props) {
  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
