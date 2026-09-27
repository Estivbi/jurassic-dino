import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DinoData } from '@ride-types/ride'
import { JEEP_LENGTH } from '@scene/constants'

interface Props {
  dino: DinoData
  quizResult: boolean | undefined
  onAnswer: (dinoId: string, correct: boolean) => void
  onClose: () => void
  /** Solo se pasa si el sonido está activado. */
  onPlayCall?: () => void
}

const meters = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 })

/** Tamaño real contado en jeeps: la forma más fácil de imaginarlo desde el asiento. */
function SizeComparison({ dino }: { dino: DinoData }) {
  const jeeps = dino.lengthM / JEEP_LENGTH
  const jeepText =
    jeeps < 1 ? `la mitad de largo que el jeep` : `≈ ${jeeps.toLocaleString('es-ES', { maximumFractionDigits: 1 })} jeeps en fila`
  return (
    <p className="rounded-xl bg-white/5 px-3 py-2 text-sm">
      <span aria-hidden>📏 </span>
      Tamaño real: <strong>{meters(dino.lengthM)} m</strong> de largo y <strong>{meters(dino.heightM)} m</strong> de alto ({jeepText}).
    </p>
  )
}

function Quiz({ dino, quizResult, onAnswer }: Pick<Props, 'dino' | 'quizResult' | 'onAnswer'>) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null || quizResult !== undefined
  const { quiz } = dino

  return (
    <div className="rounded-xl border border-[var(--cream)]/15 bg-black/25 p-3">
      <p className="font-display text-sm" style={{ color: dino.accent }}>
        🧠 Pon a prueba lo que sabes
      </p>
      <p className="mt-1 text-sm font-semibold">{quiz.question}</p>
      <div className="mt-2 grid gap-1.5">
        {quiz.options.map((option, i) => {
          const isAnswer = i === quiz.answer
          const isPicked = picked === i
          let style = 'border-[var(--cream)]/20 bg-white/5'
          if (answered && isAnswer) style = 'border-emerald-400/80 bg-emerald-500/20'
          else if (isPicked) style = 'border-rose-400/80 bg-rose-500/20'
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => {
                setPicked(i)
                onAnswer(dino.id, isAnswer)
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition active:scale-[0.98] disabled:active:scale-100 ${style}`}
            >
              {option}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className="mt-2 text-sm text-[var(--cream)]/85">
          {(picked ?? (quizResult ? quiz.answer : -1)) === quiz.answer ? '✅ ¡Correcto! ' : '❌ No era esa. '}
          {quiz.explanation}
        </p>
      )}
    </div>
  )
}

const STEPS = ['Conócelo', 'Mito o realidad', 'Curiosidades', 'Quiz'] as const

export function DinoCard({ dino, quizResult, onAnswer, onClose, onPlayCall }: Props) {
  // La ficha se lee en pasos cortos para que quepa en la pantalla de un móvil sin desplazar.
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(STEPS.length - 1, Math.max(0, next))
      if (clamped === step) return
      setDirection(clamped > step ? 1 : -1)
      setStep(clamped)
    },
    [step],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'ArrowRight') goTo(step + 1)
      else if (event.code === 'ArrowLeft') goTo(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, step])

  return (
    <div
      className="pointer-events-auto mx-auto flex w-full max-w-xl flex-col rounded-t-3xl border-t-2 bg-[#0c2a1cee] px-5 pb-4 pt-4 shadow-2xl backdrop-blur-md sm:rounded-3xl sm:border-2 sm:px-6 sm:pb-5"
      style={{ borderColor: dino.accent, maxHeight: 'min(72vh, 36rem)' }}
      role="dialog"
      aria-label={`Ficha de ${dino.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.2em]" style={{ color: dino.accent }}>
            {dino.period} · {dino.yearsAgo}
          </p>
          <h2 className="font-display text-xl leading-tight sm:text-2xl">
            {dino.emoji} {dino.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.7rem]">
            <span className="italic text-[var(--cream)]/60">{dino.scientificName}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5">{dino.group}</span>
            {!dino.isDinosaur && (
              <span className="rounded-full bg-rose-500/25 px-2 py-0.5 font-semibold text-rose-100">No es un dinosaurio</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ficha"
          className="shrink-0 rounded-full border border-[var(--cream)]/30 px-3 py-1 text-sm text-[var(--cream)]/80 active:scale-95"
        >
          ✕
        </button>
      </div>

      <p className="mt-3 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--cream)]/50">
        {step + 1}/{STEPS.length} · {STEPS[step]}
      </p>

      <div className="relative mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) goTo(step + 1)
              else if (info.offset.x > 60) goTo(step - 1)
            }}
            className="space-y-3"
          >
            {step === 0 && (
              <>
                <SizeComparison dino={dino} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  {dino.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-[0.65rem] uppercase tracking-wide text-[var(--cream)]/50">{stat.label}</dt>
                      <dd className="font-semibold leading-snug">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {step === 1 && (
              <div className="rounded-xl bg-black/25 p-3">
                <p className="font-display text-sm" style={{ color: dino.accent }}>
                  {dino.mythTitle}
                </p>
                <p className="mt-1.5 text-sm text-[var(--cream)]/85">
                  <span className="font-semibold">Lo que se dice: </span>
                  {dino.myth}
                </p>
                <p className="mt-2 text-sm text-[var(--cream)]/85">
                  <span className="font-semibold">La verdad: </span>
                  {dino.truth}
                </p>
              </div>
            )}

            {step === 2 && (
              <>
                <ul className="space-y-1.5 text-sm text-[var(--cream)]/85">
                  {dino.funFacts.map((fact) => (
                    <li key={fact} className="flex gap-2">
                      <span aria-hidden style={{ color: dino.accent }}>
                        ▸
                      </span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl bg-black/25 p-3 text-sm">
                  <p className="text-[var(--cream)]/85">
                    <span className="font-semibold">¿Cómo sonaba? </span>
                    {dino.soundFact}
                  </p>
                  {onPlayCall && (
                    <button
                      type="button"
                      onClick={onPlayCall}
                      className="mt-2 rounded-full border px-3 py-1 text-xs font-semibold active:scale-95"
                      style={{ borderColor: dino.accent, color: dino.accent }}
                    >
                      🔊 Escuchar
                    </button>
                  )}
                </div>
              </>
            )}

            {step === 3 && <Quiz dino={dino} quizResult={quizResult} onAnswer={onAnswer} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className="whitespace-nowrap rounded-full border border-[var(--cream)]/30 px-4 py-1.5 text-sm active:scale-95 disabled:opacity-30"
        >
          ← Anterior
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((label, i) => (
            <span
              key={label}
              className="h-2 w-2 rounded-full transition-all"
              style={{ background: i === step ? dino.accent : 'rgba(243,236,214,0.25)', width: i === step ? 18 : 8 }}
            />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold text-[#1a1206] active:scale-95"
            style={{ background: dino.accent }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold active:scale-95"
            style={{ borderColor: dino.accent, color: dino.accent }}
          >
            ¡A conducir!
          </button>
        )}
      </div>
    </div>
  )
}
