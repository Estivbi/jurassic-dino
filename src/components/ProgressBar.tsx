import { dinos } from '@data/dinos'

interface Props {
  progressPercent: number
  currentIndex: number
}

export function ProgressBar({ progressPercent, currentIndex }: Props) {
  return (
    <div className="pointer-events-none absolute top-0 left-0 right-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
      <div className="relative h-2 w-full rounded-full bg-black/40 backdrop-blur-sm ring-1 ring-[var(--amber-500)]/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--amber-600)] to-[var(--amber-300)] transition-[width] duration-150"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
        {dinos.map((dino, i) => (
          <div
            key={dino.id}
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 transition-colors"
            style={{
              left: `${dino.stopT * 100}%`,
              borderColor: i <= currentIndex ? 'var(--amber-300)' : 'rgba(243,236,214,0.35)',
              background: i <= currentIndex ? 'var(--amber-500)' : '#0c2a1c',
            }}
            title={dino.name}
          />
        ))}
      </div>
    </div>
  )
}
