import { useState } from 'react'
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
    <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
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
    <div className="mt-4 rounded-xl border border-[var(--cream)]/15 bg-black/25 p-3">
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

export function DinoCard({ dino, quizResult, onAnswer, onClose, onPlayCall }: Props) {
  return (
    <div
      className="pointer-events-auto mx-auto w-full max-w-xl overflow-y-auto rounded-t-3xl border-t-2 bg-[#0c2a1cee] px-5 pb-4 pt-4 shadow-2xl backdrop-blur-md sm:rounded-3xl sm:border-2 sm:px-6 sm:pb-6"
      style={{ borderColor: dino.accent, maxHeight: '72vh' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: dino.accent }}>
            {dino.period} · {dino.yearsAgo}
          </p>
          <h2 className="font-display text-2xl leading-tight sm:text-3xl">
            {dino.emoji} {dino.name}
          </h2>
          <p className="text-sm italic text-[var(--cream)]/60">{dino.scientificName}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[0.7rem]">
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

      <SizeComparison dino={dino} />

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
        {dino.stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[0.65rem] uppercase tracking-wide text-[var(--cream)]/50">{stat.label}</dt>
            <dd className="font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-xl bg-black/25 p-3">
        <p className="font-display text-sm" style={{ color: dino.accent }}>
          {dino.mythTitle}
        </p>
        <p className="mt-1 text-sm text-[var(--cream)]/85">
          <span className="font-semibold">Lo que se dice: </span>
          {dino.myth}
        </p>
        <p className="mt-1.5 text-sm text-[var(--cream)]/85">
          <span className="font-semibold">La verdad: </span>
          {dino.truth}
        </p>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm text-[var(--cream)]/85">
        {dino.funFacts.map((fact) => (
          <li key={fact} className="flex gap-2">
            <span aria-hidden style={{ color: dino.accent }}>
              ▸
            </span>
            <span>{fact}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-start gap-3 rounded-xl bg-black/25 p-3 text-sm">
        {onPlayCall && (
          <button
            type="button"
            onClick={onPlayCall}
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold active:scale-95"
            style={{ borderColor: dino.accent, color: dino.accent }}
          >
            🔊 Escuchar
          </button>
        )}
        <p className="text-[var(--cream)]/85">
          <span className="font-semibold">¿Cómo sonaba? </span>
          {dino.soundFact}
        </p>
      </div>

      <Quiz key={dino.id} dino={dino} quizResult={quizResult} onAnswer={onAnswer} />
    </div>
  )
}
