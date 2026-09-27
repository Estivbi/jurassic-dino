import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGame } from '@hooks/useGame'
import { CanvasStage } from '@components/CanvasStage'
import { HUD } from '@components/HUD'
import { GateScreen } from '@components/GateScreen'
import { CreditsModal } from '@components/CreditsModal'
import { DebugOverlay } from '@components/DebugOverlay'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1'

export default function App() {
  const game = useGame()
  const [showCredits, setShowCredits] = useState(false)

  return (
    <div className="relative h-full w-full">
      <CanvasStage containerRef={game.containerRef} canvasRef={game.canvasRef} />

      {game.phase === 'driving' && (
        <HUD
          nearbyDino={game.nearbyDino}
          cardDino={game.cardDino}
          discovered={game.discovered}
          quizResults={game.quizResults}
          answerQuiz={game.answerQuiz}
          openCard={game.openCard}
          closeCard={game.closeCard}
          pressTouch={game.pressTouch}
          getMinimapSnapshot={game.getMinimapSnapshot}
          zoneId={game.zoneId}
          skyInfo={game.skyInfo}
          constellationsOn={game.constellationsOn}
          setConstellationsOn={game.setConstellationsOn}
          setHourOffset={game.setHourOffset}
          getConstellationLabels={game.getConstellationLabels}
          soundOn={game.soundOn}
          toggleSound={game.toggleSound}
          onShowCredits={() => setShowCredits(true)}
        />
      )}

      {game.phase === 'gate' && <GateScreen onStart={game.start} onShowCredits={() => setShowCredits(true)} />}

      <AnimatePresence>{showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}</AnimatePresence>

      {DEBUG && <DebugOverlay getDebugInfo={game.getDebugInfo} />}
      {/* Estadísticas de Vercel: sin cookies ni datos personales (hay que activarlas en el panel de Vercel). */}
      <Analytics />
      <SpeedInsights />
    </div>
  )
}
