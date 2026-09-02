interface Props {
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  disabled: boolean
  nextLabel: string
}

export function Controls({ onPrev, onNext, canGoPrev, disabled, nextLabel }: Props) {
  return (
    <div className="pointer-events-auto mx-auto mt-3 flex w-full max-w-xl items-center justify-between gap-3 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-0">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev || disabled}
        className="rounded-full border-2 border-[var(--amber-500)]/50 bg-black/30 px-4 py-2 text-sm font-semibold text-[var(--cream)] backdrop-blur-sm transition disabled:opacity-30 enabled:hover:bg-black/50 enabled:active:scale-95"
      >
        ← Atrás
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="font-display flex-1 rounded-full bg-gradient-to-b from-[var(--amber-400)] to-[var(--amber-600)] px-5 py-2.5 text-center text-sm tracking-wide text-[#1a1206] shadow-lg transition disabled:opacity-40 enabled:hover:brightness-110 enabled:active:scale-95 sm:text-base"
      >
        {nextLabel}
      </button>
    </div>
  )
}
