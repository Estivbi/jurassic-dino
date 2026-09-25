import * as THREE from 'three'
import { LAKE, TERRAIN_SIZE, WATER_LEVEL, WORLD_BOUNDS } from './constants'
import { zoneWeights } from './zones'
import mossUrl from '@assets/textures/ground_moss_color.webp?url'
import dirtUrl from '@assets/textures/ground_dirt_color.webp?url'
import dirtNormalUrl from '@assets/textures/ground_dirt_normal.webp?url'
import rockUrl from '@assets/textures/rock_color.webp?url'
import { smooth } from './math'

// --- Ruido determinista (value noise con interpolación quíntica + fBm) ---------------------

function hash2(x: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const xf = x - xi
  const zf = z - zi
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
  const v = zf * zf * zf * (zf * (zf * 6 - 15) + 10)
  const a = hash2(xi, zi)
  const b = hash2(xi + 1, zi)
  const c = hash2(xi, zi + 1)
  const d = hash2(xi + 1, zi + 1)
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}

export function fbm(x: number, z: number, octaves = 4): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq) * amp
    freq *= 2.03
    amp *= 0.5
  }
  return sum
}

function ridged(x: number, z: number): number {
  let sum = 0
  let amp = 0.55
  let freq = 1
  for (let i = 0; i < 4; i++) {
    const n = 1 - Math.abs(valueNoise(x * freq + 17.3, z * freq - 4.1))
    sum += n * n * amp
    freq *= 2.1
    amp *= 0.5
  }
  return sum
}


/** Altura media de la tierra firme sobre el nivel del agua. */
const LAND_BASE = 3.5

/** Distancia (con borde irregular) al centro del lago, normalizada por su radio. */
function lakeDistance(x: number, z: number): number {
  const dx = x - LAKE.x
  const dz = z - LAKE.z
  const angle = Math.atan2(dz, dx)
  const wobble = 1 + 0.12 * Math.sin(angle * 3 + 0.7) + 0.07 * Math.sin(angle * 5 - 1.3)
  return Math.hypot(dx, dz) / (LAKE.radius * wobble)
}

function rawHeight(x: number, z: number): number {
  const w = zoneWeights(x, z)
  const rolling = fbm(x * 0.012, z * 0.012) * 7 + fbm(x * 0.05, z * 0.05, 3) * 1.2
  const plains = fbm(x * 0.008 + 40, z * 0.008, 3) * 3
  const rocky = ridged(x * 0.018, z * 0.018) * 13 - 3 + fbm(x * 0.07, z * 0.07, 2) * 1.5
  // El terreno "seco" queda por encima del nivel del agua: solo la cuenca del lago baja de 0.
  let h = rolling * (w.jungla + w.laguna) + plains * w.llanura + rocky * w.rocosa

  // Explanada suave alrededor de la entrada, donde arranca el jeep.
  h *= smooth(Math.hypot(x, z - 6), 6, 26)
  h += LAND_BASE

  // Cuenca del lago: orillas que bajan hasta el agua y un fondo de ~4 m.
  const d = lakeDistance(x, z)
  const bank = smooth(d, 1.6, 0.95)
  const bottom = WATER_LEVEL - 0.6 - 3.4 * smooth(d, 1.0, 0.35)
  h = THREE.MathUtils.lerp(h, Math.min(h, bottom + Math.max(0, (d - 1) * 8)), bank)

  // Cordillera en el perímetro: cierra el parque de forma natural, más allá de los límites.
  const edge = Math.max(Math.abs(x), Math.abs(z))
  h += smooth(edge, WORLD_BOUNDS - 6, WORLD_BOUNDS + 18) * (16 + ridged(x * 0.03, z * 0.03) * 14)
  return h
}

export function heightAtPosition(x: number, z: number): number {
  return rawHeight(x, z)
}

/** Solo hay agua dentro de la cuenca del lago; fuera, aunque el terreno baje, es tierra. */
export function isUnderwater(x: number, z: number, margin = 0): boolean {
  if (lakeDistance(x, z) > 1.6) return false
  return rawHeight(x, z) < WATER_LEVEL - margin
}

// --- Material con mezcla de texturas (splatting) ----------------------------------------------

const loader = new THREE.TextureLoader()
function loadTiled(url: string, srgb: boolean): THREE.Texture {
  const tex = loader.load(url)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.anisotropy = 8
  return tex
}

function buildTerrainMaterial(): THREE.MeshStandardMaterial {
  const moss = loadTiled(mossUrl, true)
  const dirt = loadTiled(dirtUrl, true)
  const rock = loadTiled(rockUrl, true)
  const normal = loadTiled(dirtNormalUrl, false)

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    vertexColors: true,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.tMoss = { value: moss }
    shader.uniforms.tDirt = { value: dirt }
    shader.uniforms.tRock = { value: rock }
    shader.uniforms.uWaterLevel = { value: WATER_LEVEL }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aSplat;
        attribute float aShore;
        varying vec3 vSplat;
        varying vec3 vTerrainPos;
        varying float vShore;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vSplat = aSplat;
        vTerrainPos = position;
        vShore = aShore;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D tMoss;
        uniform sampler2D tDirt;
        uniform sampler2D tRock;
        uniform float uWaterLevel;
        varying vec3 vSplat;
        varying vec3 vTerrainPos;
        varying float vShore;`,
      )
      .replace(
        '#include <map_fragment>',
        `
        vec2 tuv = vTerrainPos.xz / 7.0;
        // Dos escalas por textura para que no se note la repetición.
        vec3 moss = mix(texture2D(tMoss, tuv).rgb, texture2D(tMoss, tuv * 0.21 + 0.37).rgb, 0.45);
        vec3 dirt = mix(texture2D(tDirt, tuv * 0.8).rgb, texture2D(tDirt, tuv * 0.19).rgb, 0.4);
        // Roca sedimentaria: estratos horizontales (como en los cañones con fósiles) con el
        // detalle de la textura de tierra encima.
        float detail = dot(mix(texture2D(tDirt, tuv * 0.35).rgb, texture2D(tRock, tuv * 0.11).rgb, 0.35), vec3(0.33)) * 5.0;
        float strata = sin(vTerrainPos.y * 2.1 + texture2D(tDirt, tuv * 0.05).r * 6.0) * 0.5 + 0.5;
        vec3 rockTint = mix(vec3(0.24, 0.16, 0.1), vec3(0.42, 0.33, 0.22), strata);
        rockTint = mix(rockTint, vec3(0.3, 0.27, 0.23), smoothstep(0.7, 1.0, sin(vTerrainPos.y * 0.7) * 0.5 + 0.5));
        vec3 rock = rockTint * detail;
        vec3 w = vSplat / max(vSplat.x + vSplat.y + vSplat.z, 0.001);
        // Las texturas fotográficas están muy oscuras para un albedo real (hierba ~0,2): se compensan.
        vec3 ground = (moss * vec3(1.0, 1.05, 0.8) * w.x + dirt * w.y) * 2.3 + rock * w.z;
        // Orilla: arena clara y, justo en la línea de agua, barro húmedo y oscuro.
        float above = vTerrainPos.y - uWaterLevel;
        float sand = vShore * (1.0 - smoothstep(0.4, 1.6, above));
        ground = mix(ground, dirt * vec3(1.25, 1.17, 1.0), sand * 0.8);
        float wet = vShore * (1.0 - smoothstep(-0.1, 0.35, above));
        ground *= mix(1.0, 0.55, wet);
        diffuseColor.rgb *= ground;
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.35, wet);
        roughnessFactor = mix(roughnessFactor, 0.8, w.z);`,
      )
  }
  return material
}

export function buildTerrain(segments = 220): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < position.count; i++) {
    position.setY(i, rawHeight(position.getX(i), position.getZ(i)))
  }
  geometry.computeVertexNormals()

  const normals = geometry.attributes.normal as THREE.BufferAttribute
  const splat = new Float32Array(position.count * 3)
  const shore = new Float32Array(position.count)
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = position.getY(i)
    const slope = 1 - normals.getY(i)
    const w = zoneWeights(x, z)
    const patch = fbm(x * 0.045 + 11, z * 0.045 - 7, 3)

    let mossW = 0.25 + w.jungla * 1.1 + w.laguna * 0.8 + w.llanura * 0.7 + w.rocosa * 0.15
    let dirtW = 0.15 + w.llanura * 0.45 + w.rocosa * 0.35 + Math.max(0, patch) * 1.4
    let rockW = w.rocosa * 0.55 + smooth(slope, 0.12, 0.3) * 1.6 + smooth(y, 12.5, 19.5) * 1.2
    // Cordillera del perímetro: roca desnuda.
    const edge = Math.max(Math.abs(x), Math.abs(z))
    rockW += smooth(edge, WORLD_BOUNDS + 2, WORLD_BOUNDS + 14) * 2
    mossW *= 1 - smooth(slope, 0.18, 0.35) * 0.8
    dirtW = Math.max(dirtW, 0)
    splat[i * 3] = mossW
    splat[i * 3 + 1] = dirtW
    splat[i * 3 + 2] = rockW
    shore[i] = smooth(lakeDistance(x, z), 1.45, 1.05)

    // Variación de tono a gran escala (manchas más secas o más verdes).
    const macro = 0.86 + 0.2 * fbm(x * 0.02 - 30, z * 0.02 + 12, 2)
    colors[i * 3] = macro
    colors[i * 3 + 1] = macro
    colors[i * 3 + 2] = macro
  }
  geometry.setAttribute('aSplat', new THREE.BufferAttribute(splat, 3))
  geometry.setAttribute('aShore', new THREE.BufferAttribute(shore, 1))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mesh = new THREE.Mesh(geometry, buildTerrainMaterial())
  mesh.receiveShadow = true
  mesh.name = 'terrain'
  return mesh
}
