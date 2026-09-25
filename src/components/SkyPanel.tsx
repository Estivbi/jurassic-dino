import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { SkyInfo } from '@scene/GameScene'
import { skyFacts } from '@data/education'
import { MoonPhaseIcon } from './MoonPhaseIcon'

interface Props {
  info: SkyInfo | null
  constellationsOn: boolean
  setConstellationsOn: (on: boolean) => void
  setHourOffset: (hours: number) => void
}

function skyIcon(info: SkyInfo): string {
  if (info.sunAltitude > 8) return '☀️'
  if (info.sunAltitude > -6) return '🌅'
  return '🌙'
}

function sunText(alt: number): string {
  if (alt > 0) return `El Sol está a ${Math.round(alt)}° sobre el horizonte`
  if (alt > -6) return `Crepúsculo civil: el Sol está ${Math.abs(Math.round(alt))}° bajo el horizonte`
  if (alt > -18) return `Crepúsculo: el Sol está ${Math.abs(Math.round(alt))}° bajo el horizonte`
  return `Noche cerrada: el Sol está ${Math.abs(Math.round(alt))}° bajo el horizonte`
}

export function SkyPanel({ info, constellationsOn, setConstellationsOn, setHourOffset }: Props) {
  const [open, setOpen] = useState(false)
  const [factIndex, setFactIndex] = useState(0)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setFactIndex((i) => (i + 1) % skyFacts.length), 12000)
    return () => window.clearInterval(id)
  }, [open])

  if (!info) return null
  const isNight = info.sunAltitude < -6
  const southern = info.lat < 0

  const changeOffset = (value: number) => {
    setOffset(value)
    setHourOffset(value)
  }

  return (
    <div className="pointer-events-auto w-[min(19rem,calc(100vw-10.5rem))] text-[var(--cream)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-full border border-[var(--amber-500)]/40 bg-black/45 px-3 py-1.5 text-left text-sm backdrop-blur-sm active:scale-[0.98]"
      >
        <span aria-hidden>{skyIcon(info)}</span>
        <span className="font-semibold tabular-nums">{info.time}</span>
        {info.hourOffset !== 0 && <span className="text-xs text-[var(--amber-300)]">⏩</span>}
        <MoonPhaseIcon phase={info.moonPhase} southern={southern} size={18} />
        <span className="truncate text-xs text-[var(--cream)]/70">{info.moonPhaseName}</span>
        <span className="ml-auto text-xs text-[var(--cream)]/50" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-3 rounded-2xl border border-[var(--amber-500)]/30 bg-[#08140fe6] p-3 text-sm shadow-xl backdrop-blur-md"
          >
            <p className="text-xs text-[var(--cream)]/80">{sunText(info.sunAltitude)}.</p>

            <div className="flex items-center gap-3">
              <MoonPhaseIcon phase={info.moonPhase} southern={southern} size={40} />
              <div className="text-xs leading-snug">
                <p className="font-semibold text-[var(--cream)]">{info.moonPhaseName}</p>
                <p className="text-[var(--cream)]/70">
                  {Math.round(info.moonFraction * 100)} % iluminada ·{' '}
                  {info.moonAltitude > 0 ? `a ${Math.round(info.moonAltitude)}° de altura` : 'bajo el horizonte'}
                </p>
                {southern && <p className="text-[var(--cream)]/55">Desde el hemisferio sur se ve girada.</p>}
              </div>
            </div>

            <label className="block">
              <span className="flex items-center justify-between text-xs text-[var(--cream)]/80">
                <span>Viajar en el tiempo</span>
                <span className="tabular-nums text-[var(--amber-300)]">
                  {offset === 0 ? 'ahora' : `${offset > 0 ? '+' : ''}${offset} h`}
                </span>
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={offset}
                onChange={(e) => changeOffset(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--amber-400)]"
                aria-label="Adelantar o retrasar la hora del parque"
              />
            </label>
            {offset !== 0 && (
              <button
                type="button"
                onClick={() => changeOffset(0)}
                className="rounded-full border border-[var(--cream)]/30 px-3 py-1 text-xs active:scale-95"
              >
                Volver a la hora real
              </button>
            )}

            <label className={`flex items-center gap-2 text-xs ${isNight ? '' : 'opacity-60'}`}>
              <input
                type="checkbox"
                checked={constellationsOn}
                onChange={(e) => setConstellationsOn(e.target.checked)}
                className="accent-[var(--amber-400)]"
              />
              Mostrar constelaciones {isNight ? '' : '(se ven de noche)'}
            </label>

            <p className="rounded-xl bg-black/30 p-2 text-xs leading-snug text-[var(--cream)]/80">💡 {skyFacts[factIndex]}</p>

            <p className="text-[0.65rem] text-[var(--cream)]/45">
              {info.locationSource === 'gps'
                ? `Cielo calculado para tu ubicación (${info.lat.toFixed(1)}°, ${info.lon.toFixed(1)}°).`
                : 'Sin permiso de ubicación: cielo calculado para Madrid.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
