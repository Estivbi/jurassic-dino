import { dinos } from '@data/dinos'

interface Props {
  discovered: Set<string>
  quizResults: Map<string, boolean>
}

export function DiscoveryAlbum({ discovered, quizResults }: Props) {
  const stars = [...quizResults.values()].filter(Boolean).length
  return (
    <div className="pointer-events-none flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
      {/* En móvil, un contador compacto; en pantallas grandes, la fila completa de cromos. */}
      <span className="px-1 text-xs font-semibold sm:hidden">
        📒 {discovered.size}/{dinos.length} · ⭐ {stars}
      </span>
      <div className="hidden gap-1 sm:flex">
        {dinos.map((dino) => {
          const found = discovered.has(dino.id)
          const star = quizResults.get(dino.id) === true
          return (
            <span
              key={dino.id}
              title={found ? dino.name : '???'}
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-base transition-all"
              style={{
                background: found ? dino.accent : 'rgba(255,255,255,0.08)',
                filter: found ? 'none' : 'grayscale(1) brightness(0.6)',
                opacity: found ? 1 : 0.5,
              }}
            >
              {dino.emoji}
              {star && <span className="absolute -right-1 -top-1 text-[0.6rem]">⭐</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
