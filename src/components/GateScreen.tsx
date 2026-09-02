interface Props {
  onStart: () => void
}

export function GateScreen({ onStart }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/70 via-black/50 to-black/80 px-6 text-center">
      <div className="flex items-end gap-0">
        <div className="h-40 w-5 rounded-t-sm bg-gradient-to-b from-[#5a3a1f] to-[#2e1f10] sm:h-52 sm:w-7" />
        <div className="flex -translate-y-6 flex-col items-center sm:-translate-y-8">
          <div className="rounded-md border-2 border-[var(--amber-500)] bg-[#12321f] px-4 py-3 shadow-xl sm:px-8 sm:py-5">
            <p className="font-display text-[0.55rem] tracking-[0.3em] text-[var(--amber-300)] sm:text-xs">
              BIENVENIDO AL
            </p>
            <h1 className="font-display mt-1 text-2xl leading-none text-[var(--cream)] sm:text-5xl">
              PARQUE
              <br />
              JURÁSICO 3D
            </h1>
          </div>
        </div>
        <div className="h-40 w-5 rounded-t-sm bg-gradient-to-b from-[#5a3a1f] to-[#2e1f10] sm:h-52 sm:w-7" />
      </div>

      <p className="mt-6 max-w-sm text-sm text-[var(--cream)]/75 sm:max-w-md sm:text-base">
        Sube al jeep para un recorrido nocturno entre la niebla. Cuatro paradas, cuatro dinosaurios reales
        y algún mito que nos ha durado demasiadas películas.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="font-display mt-8 rounded-full bg-gradient-to-b from-[var(--amber-400)] to-[var(--amber-600)] px-8 py-3.5 text-base tracking-wide text-[#1a1206] shadow-2xl transition hover:brightness-110 active:scale-95 sm:text-lg"
      >
        Arrancar el jeep →
      </button>
    </div>
  )
}
