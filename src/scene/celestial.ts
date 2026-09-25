import { getMoonIllumination, getMoonPosition, getPosition } from 'suncalc'

/**
 * Astronomía real del parque: posición del Sol, de la Luna (con su fase) y rotación de la
 * esfera celeste a partir de la hora y de la ubicación del usuario.
 *
 * Convenio de ejes del mundo: +X = este, -Z = norte, +Y = arriba.
 */

/** Madrid: se usa si el usuario no concede la geolocalización (o tarda demasiado). */
const FALLBACK_COORDS = { lat: 40.4168, lon: -3.7038 }

export type LocationSource = 'gps' | 'aproximada'

export interface CelestialState {
  date: Date
  lat: number
  lon: number
  locationSource: LocationSource
  /** Vector unitario hacia el Sol en coordenadas de mundo. */
  sunDir: [number, number, number]
  sunAltitudeDeg: number
  moonDir: [number, number, number]
  moonAltitudeDeg: number
  /** Fracción iluminada del disco lunar (0-1). */
  moonFraction: number
  /** Fase lunar de SunCalc: 0 nueva, 0.25 cuarto creciente, 0.5 llena, 0.75 cuarto menguante. */
  moonPhase: number
  moonPhaseName: string
  /**
   * Matriz 3x3 (column-major, lista para `Matrix3.fromArray`) que lleva un vector en
   * coordenadas ecuatoriales (x hacia AR 0h, z hacia el polo norte celeste) al mundo.
   */
  equatorialToWorld: number[]
}

const DEG = Math.PI / 180

/** SunCalc v2 da altitud y acimut en grados, con el acimut desde el norte en sentido horario. */
function horizontalToWorld(altitudeDeg: number, azimuthDeg: number): [number, number, number] {
  const alt = altitudeDeg * DEG
  const az = azimuthDeg * DEG
  const cosAlt = Math.cos(alt)
  return [Math.sin(az) * cosAlt, Math.sin(alt), -Math.cos(az) * cosAlt]
}

export function moonPhaseName(phase: number): string {
  if (phase < 0.02 || phase > 0.98) return 'Luna nueva'
  if (phase < 0.23) return 'Luna creciente'
  if (phase < 0.27) return 'Cuarto creciente'
  if (phase < 0.48) return 'Gibosa creciente'
  if (phase < 0.52) return 'Luna llena'
  if (phase < 0.73) return 'Gibosa menguante'
  if (phase < 0.77) return 'Cuarto menguante'
  return 'Luna menguante'
}

/** Tiempo sidéreo local en radianes (aproximación estándar de la GMST, error < 1 s en este siglo). */
function localSiderealTime(date: Date, lonDeg: number): number {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5
  const gmstDeg = 280.46061837 + 360.98564736629 * (jd - 2_451_545.0)
  const lstDeg = (((gmstDeg + lonDeg) % 360) + 360) % 360
  return (lstDeg * Math.PI) / 180
}

function equatorialToWorldMatrix(date: Date, latDeg: number, lonDeg: number): number[] {
  const lst = localSiderealTime(date, lonDeg)
  const phi = (latDeg * Math.PI) / 180
  const cL = Math.cos(lst)
  const sL = Math.sin(lst)
  const cP = Math.cos(phi)
  const sP = Math.sin(phi)
  // Rz(-LST): de ascensión recta a ángulo horario.
  const r = [
    [cL, sL, 0],
    [-sL, cL, 0],
    [0, 0, 1],
  ]
  // De marco horario a mundo: x = este, y = cenit, z = sur.
  const h = [
    [0, 1, 0],
    [cP, 0, sP],
    [sP, 0, -cP],
  ]
  const m = [0, 1, 2].map((i) => [0, 1, 2].map((j) => h[i][0] * r[0][j] + h[i][1] * r[1][j] + h[i][2] * r[2][j]))
  // Column-major para three.js.
  return [m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]]
}

export function computeCelestialState(
  date: Date,
  coords: { lat: number; lon: number },
  locationSource: LocationSource,
): CelestialState {
  const sun = getPosition(date, coords.lat, coords.lon)
  const moon = getMoonPosition(date, coords.lat, coords.lon)
  const illumination = getMoonIllumination(date)
  return {
    date,
    lat: coords.lat,
    lon: coords.lon,
    locationSource,
    sunDir: horizontalToWorld(sun.altitude, sun.azimuth),
    sunAltitudeDeg: sun.altitude,
    moonDir: horizontalToWorld(moon.altitude, moon.azimuth),
    moonAltitudeDeg: moon.altitude,
    moonFraction: illumination.fraction,
    moonPhase: illumination.phase,
    moonPhaseName: moonPhaseName(illumination.phase),
    equatorialToWorld: equatorialToWorldMatrix(date, coords.lat, coords.lon),
  }
}

export interface CelestialClock {
  getState: () => CelestialState
  /** Desplaza la hora mostrada (en horas) respecto a la real; 0 vuelve a "ahora". */
  setHourOffset: (hours: number) => void
  getHourOffset: () => number
}

/**
 * Reloj astronómico: usa la hora real del dispositivo más un desplazamiento opcional (el
 * control "viajar en el tiempo" del HUD) y la geolocalización del navegador si se concede.
 * Nunca bloquea el arranque: mientras no hay GPS se usa Madrid como aproximación.
 */
export function createCelestialClock(): CelestialClock {
  let coords = FALLBACK_COORDS
  let source: LocationSource = 'aproximada'
  let hourOffset = 0
  let cached: { at: number; state: CelestialState } | null = null

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        source = 'gps'
        cached = null
      },
      () => {
        /* sin permiso o sin datos: se mantiene la ubicación aproximada */
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 3_600_000 },
    )
  }

  return {
    getState: () => {
      const now = Date.now() + hourOffset * 3_600_000
      // SunCalc es barato, pero no hace falta recalcularlo 60 veces por segundo.
      if (cached && Math.abs(now - cached.at) < 1000) return cached.state
      const state = computeCelestialState(new Date(now), coords, source)
      cached = { at: now, state }
      return state
    },
    setHourOffset: (hours) => {
      hourOffset = hours
      cached = null
    },
    getHourOffset: () => hourOffset,
  }
}
