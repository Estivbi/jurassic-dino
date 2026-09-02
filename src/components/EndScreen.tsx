interface Props {
  onRestart: () => void
}

export function EndScreen({ onRestart }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/70 via-black/55 to-black/85 px-6 text-center">
      <p className="font-display text-xs tracking-[0.3em] text-[var(--amber-300)] sm:text-sm">
        FIN DEL RECORRIDO
      </p>
      <h1 className="font-display mt-2 text-3xl leading-tight text-[var(--cream)] sm:text-5xl">
        Gracias por venir
        <br />
        al parque 🦖
      </h1>
      <p className="mt-4 max-w-sm text-sm text-[var(--cream)]/75 sm:max-w-md sm:text-base">
        Cuatro paradas, cuatro dinosaurios y unos cuantos mitos menos. La niebla se cierra detrás del
        jeep... hasta la próxima visita.
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="font-display mt-8 rounded-full border-2 border-[var(--amber-400)] bg-black/30 px-8 py-3.5 text-base tracking-wide text-[var(--amber-300)] shadow-xl transition hover:bg-black/50 active:scale-95 sm:text-lg"
      >
        Repetir el recorrido ↺
      </button>
    </div>
  )
}
