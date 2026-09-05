import { getTimes } from 'suncalc'

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk'

export interface SkyState {
  phase: SkyPhase
  sky: string
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  sunColor: string
  sunIntensity: number
  sunHeight: number
  exposure: number
  fogDensityScale: number
}

type SkyPreset = Omit<SkyState, 'phase'>

const NIGHT: SkyPreset = {
  sky: '#1a301f',
  hemiSky: '#2c4a5c',
  hemiGround: '#1c3524',
  hemiIntensity: 1.15,
  sunColor: '#cfe0ea',
  sunIntensity: 0.9,
  sunHeight: 60,
  exposure: 1.4,
  fogDensityScale: 1.0,
}

const DAWN: SkyPreset = {
  sky: '#e2a06e',
  hemiSky: '#f2b48a',
  hemiGround: '#4a3826',
  hemiIntensity: 1.5,
  sunColor: '#ffcf9e',
  sunIntensity: 1.1,
  sunHeight: 22,
  exposure: 1.3,
  fogDensityScale: 1.0,
}

const DAY: SkyPreset = {
  sky: '#bfe0ee',
  hemiSky: '#8ec9ec',
  hemiGround: '#4a6b3a',
  hemiIntensity: 1.9,
  sunColor: '#fff6e0',
  sunIntensity: 1.7,
  sunHeight: 75,
  exposure: 1.05,
  fogDensityScale: 0.55,
}

const DUSK: SkyPreset = {
  sky: '#c9704a',
  hemiSky: '#d97a52',
  hemiGround: '#3a2418',
  hemiIntensity: 1.35,
  sunColor: '#ff9d5c',
  sunIntensity: 1.0,
  sunHeight: 20,
  exposure: 1.3,
  fogDensityScale: 1.0,
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function lerpPreset(a: SkyPreset, b: SkyPreset, t: number, phase: SkyPhase): SkyState {
  const lerp = (x: number, y: number) => x + (y - x) * t
  return {
    phase,
    sky: lerpColor(a.sky, b.sky, t),
    hemiSky: lerpColor(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpColor(a.hemiGround, b.hemiGround, t),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity),
    sunColor: lerpColor(a.sunColor, b.sunColor, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity),
    sunHeight: lerp(a.sunHeight, b.sunHeight),
    exposure: lerp(a.exposure, b.exposure),
    fogDensityScale: lerp(a.fogDensityScale, b.fogDensityScale),
  }
}

interface SunTimes {
  dawn: Date
  sunrise: Date
  sunset: Date
  dusk: Date
}

function fallbackTimes(date: Date): SunTimes {
  const at = (h: number, m: number) => {
    const d = new Date(date)
    d.setHours(h, m, 0, 0)
    return d
  }
  return { dawn: at(6, 0), sunrise: at(6, 45), sunset: at(19, 30), dusk: at(20, 15) }
}

/** A latitudes muy altas dawn/dusk/etc. pueden no existir (día o noche polar); en ese caso se usa el horario de respaldo. */
function geoTimesOrFallback(
  now: Date,
  coords: { lat: number; lon: number },
  fallback: SunTimes,
): SunTimes {
  const t = getTimes(now, coords.lat, coords.lon)
  return {
    dawn: t.dawn ?? fallback.dawn,
    sunrise: t.sunrise ?? fallback.sunrise,
    sunset: t.sunset ?? fallback.sunset,
    dusk: t.dusk ?? fallback.dusk,
  }
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

function computeSkyState(now: Date, times: SunTimes): SkyState {
  const nowMin = minutesOfDay(now)
  const dawnStart = minutesOfDay(times.dawn)
  const sunriseStart = minutesOfDay(times.sunrise)
  const sunsetStart = minutesOfDay(times.sunset)
  const duskEnd = minutesOfDay(times.dusk)
  const half = Math.max((sunsetStart - sunriseStart) / 2 - 1, 5)
  const ramp = Math.min(40, half)

  const keyframes: [number, SkyPreset, SkyPhase][] = [
    [dawnStart, NIGHT, 'night'],
    [sunriseStart, DAWN, 'dawn'],
    [sunriseStart + ramp, DAY, 'day'],
    [sunsetStart - ramp, DAY, 'day'],
    [sunsetStart, DUSK, 'dusk'],
    [duskEnd, NIGHT, 'night'],
  ]

  if (nowMin < keyframes[0][0] || nowMin >= keyframes[keyframes.length - 1][0]) {
    return { phase: 'night', ...NIGHT }
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [t0, p0] = keyframes[i]
    const [t1, p1, phase1] = keyframes[i + 1]
    if (nowMin >= t0 && nowMin < t1) {
      const progress = (nowMin - t0) / (t1 - t0)
      // La fase "activa" del tramo es la del extremo hacia el que se dirige la transición.
      return lerpPreset(p0, p1, progress, phase1)
    }
  }
  return { phase: 'night', ...NIGHT }
}

export interface DayNightController {
  getSkyState: () => SkyState
}

/**
 * Calcula amanecer/atardecer reales a partir de la geolocalización del navegador (si el
 * usuario la concede); si se deniega, no está disponible o tarda más de 4s, usa unas horas
 * fijas razonables. Nunca bloquea el arranque de la escena.
 */
export function createDayNightController(): DayNightController {
  let coords: { lat: number; lon: number } | null = null
  let cache: { day: string; times: SunTimes } | null = null

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        cache = null
      },
      () => {
        /* sin permiso o sin datos: se mantiene el horario de respaldo */
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 3_600_000 },
    )
  }

  function timesFor(now: Date): SunTimes {
    const day = now.toDateString()
    if (cache && cache.day === day) return cache.times
    const fallback = fallbackTimes(now)
    const times = coords ? geoTimesOrFallback(now, coords, fallback) : fallback
    cache = { day, times }
    return times
  }

  return {
    getSkyState: () => {
      const now = new Date()
      return computeSkyState(now, timesFor(now))
    },
  }
}
