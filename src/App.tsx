import { useGame } from '@hooks/useGame'
import { CanvasStage } from '@components/CanvasStage'
import { HUD } from '@components/HUD'
import { GateScreen } from '@components/GateScreen'

export default function App() {
  const game = useGame()

  return (
    <div className="relative h-full w-full">
      <CanvasStage containerRef={game.containerRef} canvasRef={game.canvasRef} />

      {game.phase === 'driving' && (
        <HUD
          nearbyDino={game.nearbyDino}
          cardDino={game.cardDino}
          discovered={game.discovered}
          openCard={game.openCard}
          closeCard={game.closeCard}
          pressTouch={game.pressTouch}
        />
      )}

      {game.phase === 'gate' && <GateScreen onStart={game.start} />}
    </div>
  )
}
