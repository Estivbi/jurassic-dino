import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ZoneId } from '@ride-types/ride'
import { zoneInfo } from '@data/education'

interface Props {
  zoneId: ZoneId | null
}

/** Cartel educativo que aparece unos segundos al entrar en una zona nueva. */
export function ZoneBanner({ zoneId }: Props) {
  // Zona cuyo cartel ya se ha ocultado (por tiempo o a mano); al cambiar de zona vuelve a salir.
  const [hiddenFor, setHiddenFor] = useState<ZoneId | null>(null)

  useEffect(() => {
    if (!zoneId) return
    const id = window.setTimeout(() => setHiddenFor(zoneId), 9000)
    return () => window.clearTimeout(id)
  }, [zoneId])

  const info = zoneId && hiddenFor !== zoneId ? zoneInfo[zoneId] : null

  return (
    <AnimatePresence>
      {info && (
        <motion.div
          key={info.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-auto mx-auto w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--amber-500)]/40 bg-[#08140fd9] px-4 py-3 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--amber-300)]">{info.subtitle}</p>
              <h3 className="font-display text-lg leading-tight">{info.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setHiddenFor(zoneId)}
              aria-label="Cerrar cartel"
              className="shrink-0 rounded-full px-2 text-sm text-[var(--cream)]/60 active:scale-95"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs leading-snug text-[var(--cream)]/85 sm:text-sm">{info.text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
