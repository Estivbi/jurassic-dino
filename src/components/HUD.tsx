import { AnimatePresence, motion } from 'framer-motion'
import type { GameApi } from '@hooks/useGame'
import { DiscoveryAlbum } from './DiscoveryAlbum'
import { ProximityPrompt } from './ProximityPrompt'
import { DinoCard } from './DinoCard'
import { TouchControls } from './TouchControls'

type Props = Pick<GameApi, 'nearbyDino' | 'cardDino' | 'discovered' | 'openCard' | 'closeCard' | 'pressTouch'>

export function HUD({ nearbyDino, cardDino, discovered, openCard, closeCard, pressTouch }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <div className="flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-6">
        <DiscoveryAlbum discovered={discovered} />
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
              <DinoCard dino={cardDino} onClose={closeCard} />
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
