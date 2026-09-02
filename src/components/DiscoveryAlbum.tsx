import { dinos } from '@data/dinos'

interface Props {
  discovered: Set<string>
}

export function DiscoveryAlbum({ discovered }: Props) {
  return (
    <div className="pointer-events-none flex gap-1.5 rounded-full bg-black/40 px-3 py-2 backdrop-blur-sm">
      {dinos.map((dino) => {
        const found = discovered.has(dino.id)
        return (
          <span
            key={dino.id}
            title={found ? dino.name : '???'}
            className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-all"
            style={{
              background: found ? dino.accent : 'rgba(255,255,255,0.08)',
              filter: found ? 'none' : 'grayscale(1) brightness(0.6)',
              opacity: found ? 1 : 0.5,
            }}
          >
            {dino.emoji}
          </span>
        )
      })}
    </div>
  )
}
