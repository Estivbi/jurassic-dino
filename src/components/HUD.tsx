import { AnimatePresence, motion } from 'framer-motion'
import type { GameApi } from '@hooks/useGame'
import { DiscoveryAlbum } from './DiscoveryAlbum'
import { ProximityPrompt } from './ProximityPrompt'
import { DinoCard } from './DinoCard'
import { TouchControls } from './TouchControls'
import { MiniMap } from './MiniMap'
import { SkyPanel } from './SkyPanel'
import { ZoneBanner } from './ZoneBanner'
import { ConstellationLabels } from './ConstellationLabels'

type Props = Pick<
  GameApi,
  | 'nearbyDino'
  | 'cardDino'
  | 'discovered'
  | 'quizResults'
  | 'answerQuiz'
  | 'openCard'
  | 'closeCard'
  | 'pressTouch'
  | 'getMinimapSnapshot'
  | 'zoneId'
  | 'skyInfo'
  | 'constellationsOn'
  | 'setConstellationsOn'
  | 'setHourOffset'
  | 'getConstellationLabels'
> & { onShowCredits: () => void }

export function HUD(props: Props) {
  const { nearbyDino, cardDino, discovered, quizResults, answerQuiz, openCard, closeCard, pressTouch } = props
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <ConstellationLabels enabled={props.constellationsOn} getLabels={props.getConstellationLabels} />

      <div className="relative flex flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-2">
            <SkyPanel
              info={props.skyInfo}
              constellationsOn={props.constellationsOn}
              setConstellationsOn={props.setConstellationsOn}
              setHourOffset={props.setHourOffset}
            />
            <DiscoveryAlbum discovered={discovered} quizResults={quizResults} />
          </div>
          <div className="flex flex-col items-end gap-2">
            <MiniMap getSnapshot={props.getMinimapSnapshot} />
            <button
              type="button"
              onClick={props.onShowCredits}
              className="pointer-events-auto rounded-full bg-black/40 px-3 py-1 text-xs text-[var(--cream)]/75 backdrop-blur-sm active:scale-95"
            >
              ⓘ Créditos
            </button>
          </div>
        </div>
        {!cardDino && <ZoneBanner zoneId={props.zoneId} />}
      </div>

      <div className="pointer-events-none flex flex-col items-center gap-3 px-3 pb-3 sm:px-6 sm:pb-6">
        <AnimatePresence mode="wait">
          {cardDino ? (
            <motion.div
              key={cardDino.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none w-full"
            >
              <DinoCard dino={cardDino} quizResult={quizResults.get(cardDino.id)} onAnswer={answerQuiz} onClose={closeCard} />
            </motion.div>
          ) : (
            <ProximityPrompt dino={nearbyDino} onOpen={openCard} />
          )}
        </AnimatePresence>
      </div>

      {!cardDino && <TouchControls pressTouch={pressTouch} />}
    </div>
  )
}
