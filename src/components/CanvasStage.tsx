import type { GameApi } from '@hooks/useGame'

interface Props {
  containerRef: GameApi['containerRef']
  canvasRef: GameApi['canvasRef']
}

export function CanvasStage({ containerRef, canvasRef }: Props) {
  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
