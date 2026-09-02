import { AnimatePresence, motion } from 'framer-motion'
import type { DinoData } from '@ride-types/ride'

interface Props {
  dino: DinoData | null
  onOpen: () => void
}

export function ProximityPrompt({ dino, onOpen }: Props) {
  return (
    <AnimatePresence>
      {dino && (
        <motion.button
          key={dino.id}
          type="button"
          onClick={onOpen}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto mx-auto flex items-center gap-2 rounded-full border-2 bg-black/50 px-5 py-2.5 text-sm font-semibold text-[var(--cream)] backdrop-blur-sm sm:text-base"
          style={{ borderColor: dino.accent }}
        >
          <span aria-hidden>{dino.emoji}</span>
          Ver ficha de {dino.name}
          <span className="hidden text-xs text-[var(--cream)]/60 sm:inline">(E)</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
