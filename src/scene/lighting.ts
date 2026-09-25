import * as THREE from 'three'
import type { QualitySettings } from './quality'
import type { CelestialState } from './celestial'
import type { SkyLightingState } from './sky'
import { smooth } from './math'

export interface LightingRig {
  hemi: THREE.HemisphereLight
  /** Luz direccional principal: el Sol de día y la Luna de noche. */
  key: THREE.DirectionalLight
}

export function buildLighting(scene: THREE.Scene, quality: QualitySettings): LightingRig {
  scene.fog = new THREE.FogExp2('#b9c9d6', 1.35 / quality.fogFar)

  const hemi = new THREE.HemisphereLight('#9cc3e6', '#5a5238', 0.6)
  scene.add(hemi)

  const key = new THREE.DirectionalLight('#fff6ea', 3)
  if (quality.shadows) {
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 160
    key.shadow.camera.left = -45
    key.shadow.camera.right = 45
    key.shadow.camera.top = 45
    key.shadow.camera.bottom = -45
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.04
  }
  scene.add(key)
  scene.add(key.target)

  return { hemi, key }
}


/** Paletas en sRGB; se interpolan según la altura real del Sol. */
const SUN_COLORS: [number, THREE.Color][] = [
  [-2, new THREE.Color('#ff5e2a')],
  [3, new THREE.Color('#ff8f4d')],
  [10, new THREE.Color('#ffc48a')],
  [22, new THREE.Color('#ffe6c4')],
  [40, new THREE.Color('#fff5e8')],
]

const FOG_COLORS: [number, THREE.Color][] = [
  [-18, new THREE.Color('#070c16')],
  [-8, new THREE.Color('#141d33')],
  [-2, new THREE.Color('#5a4d63')],
  [3, new THREE.Color('#d9a07a')],
  [12, new THREE.Color('#c3cdd3')],
  [30, new THREE.Color('#b7cad8')],
]

function samplePalette(palette: [number, THREE.Color][], x: number, out: THREE.Color): THREE.Color {
  if (x <= palette[0][0]) return out.copy(palette[0][1])
  for (let i = 0; i < palette.length - 1; i++) {
    const [x0, c0] = palette[i]
    const [x1, c1] = palette[i + 1]
    if (x <= x1) return out.copy(c0).lerp(c1, (x - x0) / (x1 - x0))
  }
  return out.copy(palette[palette.length - 1][1])
}

export interface AtmosphereState extends SkyLightingState {
  exposure: number
  fogColor: THREE.Color
  fogDensityScale: number
  environmentIntensity: number
}

const tmpDir = new THREE.Vector3()
const tmpColor = new THREE.Color()
const moonColor = new THREE.Color('#9db4ff')
const nightHemiSky = new THREE.Color('#3a5584')
const nightHemiGround = new THREE.Color('#1b2226')
const dayHemiSky = new THREE.Color('#a8cdea')
const dayHemiGround = new THREE.Color('#5d5738')
const duskHemiSky = new THREE.Color('#e7a27a')

/**
 * Aplica sol/luna reales a las luces y devuelve el estado atmosférico (exposición, niebla…).
 * La noche nunca es negra del todo: la luz de luna (según su fase) y un cielo nocturno
 * azulado mantienen el parque legible, como en una noche despejada real.
 */
export function applyCelestialLighting(
  rig: LightingRig,
  state: CelestialState,
  focus: THREE.Vector3,
  out: AtmosphereState,
): AtmosphereState {
  const sunAlt = state.sunAltitudeDeg
  const daylight = smooth(sunAlt, -6, 12)
  const night = 1 - smooth(sunAlt, -10, -1)
  const twilight = Math.max(0, 1 - Math.abs(sunAlt - 1) / 9)
  const moonUp = smooth(state.moonAltitudeDeg, -1, 8)
  const moonStrength = moonUp * (0.25 + 0.75 * state.moonFraction)

  // Luz principal: el Sol mientras está sobre (o casi sobre) el horizonte; luego, la Luna.
  const sunKey = smooth(sunAlt, -3, 4)
  if (sunKey > 0.02) {
    tmpDir.fromArray(state.sunDir)
    // Evita sombras infinitamente largas con el Sol rasante.
    tmpDir.y = Math.max(tmpDir.y, 0.12)
    samplePalette(SUN_COLORS, sunAlt, rig.key.color)
    rig.key.intensity = 2.8 * sunKey * (0.55 + 0.45 * smooth(sunAlt, 2, 25))
  } else {
    tmpDir.fromArray(state.moonAltitudeDeg > 0 ? state.moonDir : [0.3, 1, 0.2])
    tmpDir.y = Math.max(tmpDir.y, 0.25)
    rig.key.color.copy(moonColor)
    rig.key.intensity = 0.25 + 0.9 * moonStrength
  }
  tmpDir.normalize()
  rig.key.position.copy(focus).addScaledVector(tmpDir, 80)
  rig.key.target.position.copy(focus)

  // Hemisférica: azul de día, cálida en el crepúsculo, azul luna de noche.
  rig.hemi.color.copy(nightHemiSky).lerp(dayHemiSky, daylight).lerp(duskHemiSky, twilight * 0.45)
  rig.hemi.groundColor.copy(nightHemiGround).lerp(dayHemiGround, daylight)
  rig.hemi.intensity = THREE.MathUtils.lerp(0.9 + 0.5 * moonStrength, 0.3, daylight)

  out.daylight = daylight
  out.night = night
  out.exposure = THREE.MathUtils.lerp(1.25, 0.5, daylight)
  samplePalette(FOG_COLORS, sunAlt, out.fogColor)
  // Con luna llena la niebla nocturna se aclara un poco.
  out.fogColor.lerp(tmpColor.set('#26344f'), night * moonStrength * 0.6)
  out.fogDensityScale = THREE.MathUtils.lerp(1.15, 0.6, daylight)
  out.environmentIntensity = THREE.MathUtils.lerp(1.6, 0.4, daylight)
  return out
}

export function createAtmosphereState(): AtmosphereState {
  return {
    daylight: 1,
    night: 0,
    exposure: 0.62,
    fogColor: new THREE.Color('#b7cad8'),
    fogDensityScale: 0.6,
    environmentIntensity: 1,
  }
}
