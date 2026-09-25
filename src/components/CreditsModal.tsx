import { motion } from 'framer-motion'
import { credits } from '@data/credits'

interface Props {
  onClose: () => void
}

export function CreditsModal({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Créditos"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-[var(--amber-500)]/50 bg-[#0a1d14f2] p-5 text-[var(--cream)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Créditos</h2>
            <p className="mt-1 text-sm text-[var(--cream)]/70">
              Este parque es posible gracias a artistas y proyectos que comparten su trabajo con licencias libres.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar créditos"
            className="shrink-0 rounded-full border border-[var(--cream)]/30 px-3 py-1 text-sm active:scale-95"
          >
            ✕
          </button>
        </div>
        <ul className="mt-4 space-y-3 text-sm">
          {credits.map((c) => (
            <li key={c.what + c.source} className="rounded-xl bg-black/25 p-3">
              <p className="font-semibold">{c.what}</p>
              <p className="text-[var(--cream)]/80">
                «
                <a href={c.source} target="_blank" rel="noreferrer" className="underline decoration-[var(--amber-400)]/60">
                  {c.title}
                </a>
                » de {c.author} ·{' '}
                <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline decoration-[var(--amber-400)]/60">
                  {c.license}
                </a>
              </p>
              {c.changes && <p className="mt-0.5 text-xs text-[var(--cream)]/55">{c.changes}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--cream)]/55">
          Helechos, helechos arborescentes, cícadas, terreno y cielo nocturno: diseño procedural propio. Las fichas se han
          redactado a partir de divulgación paleontológica contrastada; las masas y tamaños son estimaciones.
        </p>
      </div>
    </motion.div>
  )
}
