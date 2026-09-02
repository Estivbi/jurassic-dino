import type { DinoData } from '@ride-types/ride'

interface Props {
  dino: DinoData
}

export function DinoCard({ dino }: Props) {
  return (
    <div
      key={dino.id}
      className="pointer-events-auto mx-auto w-full max-w-xl animate-[fadein_0.4s_ease] overflow-y-auto rounded-t-3xl border-t-2 bg-[#0c2a1cee] px-5 pb-4 pt-4 shadow-2xl backdrop-blur-md sm:rounded-3xl sm:border-2 sm:px-6 sm:pb-6"
      style={{ borderColor: dino.accent, maxHeight: '54vh' }}
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
        </div>
      </div>

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
    </div>
  )
}
