interface Props {
  /** Fase de SunCalc: 0 nueva, 0.25 cuarto creciente, 0.5 llena, 0.75 cuarto menguante. */
  phase: number
  /** En el hemisferio sur la Luna se ve "al revés" (el lado iluminado cambia de lado). */
  southern?: boolean
  size?: number
}

/** Dibujo de la fase lunar: medio disco iluminado más una elipse que hace de terminador. */
export function MoonPhaseIcon({ phase, southern = false, size = 28 }: Props) {
  const r = 10
  const c = 12
  const waxing = phase < 0.5
  const rx = Math.abs(Math.cos(phase * Math.PI * 2)) * r
  const outerSweep = waxing ? 1 : 0
  const innerSweep = waxing ? (phase < 0.25 ? 0 : 1) : phase < 0.75 ? 0 : 1
  const nearlyNew = phase < 0.015 || phase > 0.985
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outerSweep} ${c} ${c + r} A ${rx} ${r} 0 0 ${innerSweep} ${c} ${c - r} Z`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={southern ? { transform: 'scaleX(-1)' } : undefined}>
      <circle cx={c} cy={c} r={r} fill="#2a2f3a" stroke="#f3ecd6" strokeOpacity={0.25} strokeWidth={0.8} />
      {!nearlyNew && <path d={d} fill="#f1ead2" />}
    </svg>
  )
}
