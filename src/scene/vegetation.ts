import * as THREE from 'three'
import { LAKE, WORLD_BOUNDS } from './constants'
import { fbm, heightAtPosition } from './terrain'
import { blendZoneValue, zoneWeights } from './zones'
import { bakedGeometry, gltfLoader, loadTexture, seededRandom } from './modelUtils'
import type { QualitySettings } from './quality'
import coniferAUrl from '@assets/models/nature/conifer_a.glb?url'
import coniferBUrl from '@assets/models/nature/conifer_b.glb?url'
import coniferCUrl from '@assets/models/nature/conifer_c.glb?url'
import broadleafUrl from '@assets/models/nature/broadleaf.glb?url'
import bushUrl from '@assets/models/nature/bush.glb?url'
import rocksUrl from '@assets/models/nature/rocks.glb?url'
import barkPineUrl from '@assets/textures/bark_pine_color.webp?url'
import barkPineNormalUrl from '@assets/textures/bark_pine_normal.webp?url'
import barkOakUrl from '@assets/textures/bark_oak_color.webp?url'
import barkOakNormalUrl from '@assets/textures/bark_oak_normal.webp?url'
import leafPineUrl from '@assets/textures/leaf_pine.webp?url'
import leafOakUrl from '@assets/textures/leaf_oak.webp?url'
import { smooth } from './math'

/** Obstáculo circular en el plano XZ (troncos y rocas) para que el jeep no los atraviese. */
export interface Obstacle {
  x: number
  z: number
  r: number
}

export interface Vegetation {
  obstacles: Obstacle[]
  update: (elapsed: number) => void
}

const windUniforms = { uTime: { value: 0 } }

/** Balanceo por viento en el vertex shader: más cuanto más alto el vértice, desfasado por instancia. */
function addWind(material: THREE.Material, amplitude: number, height: number): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 windOrigin = instanceMatrix[3].xyz;
        #else
          vec3 windOrigin = vec3(0.0);
        #endif
        float windH = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.5);
        float gust = sin(uTime * 1.1 + windOrigin.x * 0.13 + windOrigin.z * 0.09) * 0.6
          + sin(uTime * 2.9 + windOrigin.x * 0.41 + position.x * 0.6) * 0.25
          + sin(uTime * 5.3 + position.z * 1.7 + windOrigin.z) * 0.1;
        transformed.x += gust * windH * windH * ${amplitude.toFixed(4)};
        transformed.z += gust * 0.55 * windH * windH * ${amplitude.toFixed(4)};`,
      )
  }
}

// --- Frondas de helecho y cícada dibujadas a mano en un canvas ------------------------------

function frondTexture(kind: 'fern' | 'cycad'): THREE.CanvasTexture {
  const w = 256
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(kind === 'fern' ? 7 : 11)
  const cx = w / 2
  const pinnae = kind === 'fern' ? 26 : 34

  ctx.lineCap = 'round'
  for (let i = 0; i < pinnae; i++) {
    const t = i / pinnae
    const y = h - 14 - t * (h - 30)
    // Las pinnas son más largas en el tercio inferior y se afilan hacia la punta.
    const lengthFactor = Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.7) * (1 - 0.55 * t)
    const len = (w / 2 - 8) * (kind === 'fern' ? lengthFactor : 0.35 + 0.65 * lengthFactor)
    for (const side of [-1, 1]) {
      const lift = kind === 'fern' ? 0.45 : 0.7
      const endX = cx + side * len
      const endY = y - len * lift
      const shade = 0.75 + rand() * 0.35
      if (kind === 'fern') {
        // Pinna dividida en pínnulas: un helecho de verdad, no una hoja lisa.
        const pinnules = Math.max(3, Math.round(len / 7))
        for (let k = 0; k < pinnules; k++) {
          const s = (k + 0.5) / pinnules
          const px = cx + side * len * s
          const py = y - len * lift * s
          const size = 6.5 * (1 - s * 0.55) * (0.6 + lengthFactor * 0.5)
          ctx.fillStyle = `rgb(${Math.round(58 * shade)}, ${Math.round(112 * shade)}, ${Math.round(38 * shade)})`
          ctx.beginPath()
          ctx.ellipse(px, py - size * 0.6, size * 0.55, size * 1.2, side * 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(px, py + size * 0.6, size * 0.5, size * 1.05, -side * 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = 'rgb(62, 92, 36)'
        ctx.lineWidth = 1.6
      } else {
        // Folíolos de cícada: rígidos, estrechos y de verde oscuro brillante.
        ctx.strokeStyle = `rgb(${Math.round(34 * shade)}, ${Math.round(78 * shade)}, ${Math.round(40 * shade)})`
        ctx.lineWidth = 4.2
      }
      ctx.beginPath()
      ctx.moveTo(cx, y)
      ctx.quadraticCurveTo(cx + side * len * 0.5, y - len * lift * 0.35, endX, endY)
      ctx.stroke()
    }
  }
  // Raquis central.
  ctx.strokeStyle = kind === 'fern' ? 'rgb(78, 96, 44)' : 'rgb(70, 76, 40)'
  ctx.lineWidth = kind === 'fern' ? 4 : 5
  ctx.beginPath()
  ctx.moveTo(cx, h)
  ctx.lineTo(cx, 8)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

interface FrondClumpOptions {
  fronds: number
  length: number
  width: number
  /** Elevación inicial de cada fronda (radianes). */
  elevation: [number, number]
  droop: number
  baseHeight: number
  seed: number
}

/** Mata de frondas arqueadas (tiras curvadas con la textura de fronda), en una sola geometría. */
function frondClumpGeometry(opts: FrondClumpOptions): THREE.BufferGeometry {
  const rand = seededRandom(opts.seed)
  const segments = 7
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const dir = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const point = new THREE.Vector3()
  const normal = new THREE.Vector3()

  for (let f = 0; f < opts.fronds; f++) {
    const azimuth = (f / opts.fronds) * Math.PI * 2 + rand() * 0.5
    const elevation = opts.elevation[0] + rand() * (opts.elevation[1] - opts.elevation[0])
    const length = opts.length * (0.75 + rand() * 0.4)
    dir.set(Math.cos(azimuth), 0, Math.sin(azimuth))
    side.crossVectors(up, dir).normalize()
    const twist = (rand() - 0.5) * 0.6
    const base = positions.length / 3
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const horizontal = t * length * Math.cos(elevation)
      const vertical = opts.baseHeight + t * length * Math.sin(elevation) - opts.droop * t * t * length
      point.copy(dir).multiplyScalar(horizontal)
      point.y = vertical
      const halfWidth = opts.width * 0.5 * (1 - t * 0.35)
      const tilt = side.clone().applyAxisAngle(dir, twist * t)
      normal.crossVectors(tilt, dir).normalize()
      if (normal.y < 0) normal.negate()
      for (const u of [0, 1]) {
        const offset = (u - 0.5) * 2 * halfWidth
        positions.push(point.x + tilt.x * offset, point.y + tilt.y * offset, point.z + tilt.z * offset)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(u, t)
      }
      if (s < segments) {
        const i = base + s * 2
        indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

function frondMaterial(texture: THREE.Texture, tint: string, windAmp: number, windHeight: number): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: tint,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.75,
    metalness: 0,
  })
  addWind(material, windAmp, windHeight)
  return material
}

// --- Colocación determinista ------------------------------------------------------------------

interface Placement {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
  kind: string
}

function nearLake(x: number, z: number, factor: number): boolean {
  return Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius * factor
}

function scatter(
  count: number,
  seed: number,
  accept: (x: number, z: number, rand: () => number) => string | null,
  minSpacing: number,
  extent = WORLD_BOUNDS + 16,
): Placement[] {
  const rand = seededRandom(seed)
  const placed: Placement[] = []
  const cell = Math.max(minSpacing, 1)
  const grid = new Map<string, Placement[]>()
  let attempts = 0
  while (placed.length < count && attempts < count * 25) {
    attempts++
    const x = (rand() * 2 - 1) * extent
    const z = (rand() * 2 - 1) * extent
    if (Math.hypot(x, z - 6) < 14) continue
    const kind = accept(x, z, rand)
    if (!kind) continue
    const gx = Math.floor(x / cell)
    const gz = Math.floor(z / cell)
    let tooClose = false
    for (let i = -1; i <= 1 && !tooClose; i++) {
      for (let j = -1; j <= 1 && !tooClose; j++) {
        for (const p of grid.get(`${gx + i},${gz + j}`) ?? []) {
          if (Math.hypot(p.x - x, p.z - z) < minSpacing) {
            tooClose = true
            break
          }
        }
      }
    }
    if (tooClose) continue
    const p: Placement = { x, y: heightAtPosition(x, z), z, scale: rand(), rotation: rand() * Math.PI * 2, kind }
    placed.push(p)
    const key = `${gx},${gz}`
    grid.set(key, [...(grid.get(key) ?? []), p])
  }
  return placed
}

/** Capa de los objetos que no se reflejan en el lago (detalles pequeños: ahorra medio render). */
export const NO_REFLECTION_LAYER = 1
const CHUNK_SIZE = 75

/**
 * Crea los InstancedMesh repartidos en trozos de mapa: así cada trozo tiene su propia esfera
 * envolvente y three.js puede descartar los que quedan fuera de la cámara (y de la sombra).
 */
function makeInstanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  items: { matrix: THREE.Matrix4; color?: THREE.Color }[],
  castShadow: boolean,
  reflect = true,
): THREE.Object3D {
  const chunks = new Map<string, typeof items>()
  for (const item of items) {
    const key = `${Math.floor(item.matrix.elements[12] / CHUNK_SIZE)},${Math.floor(item.matrix.elements[14] / CHUNK_SIZE)}`
    const list = chunks.get(key)
    if (list) list.push(item)
    else chunks.set(key, [item])
  }
  const group = new THREE.Group()
  for (const chunk of chunks.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, chunk.length)
    chunk.forEach((item, i) => {
      mesh.setMatrixAt(i, item.matrix)
      if (item.color) mesh.setColorAt(i, item.color)
    })
    mesh.castShadow = castShadow
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    if (!reflect) mesh.layers.set(NO_REFLECTION_LAYER)
    group.add(mesh)
  }
  return group
}

const tmpMatrix = new THREE.Matrix4()
const tmpQuat = new THREE.Quaternion()
const tmpPos = new THREE.Vector3()
const tmpScale = new THREE.Vector3()
const yAxis = new THREE.Vector3(0, 1, 0)

function composeMatrix(x: number, y: number, z: number, rotation: number, scale: number, tilt = 0): THREE.Matrix4 {
  tmpQuat.setFromAxisAngle(yAxis, rotation)
  if (tilt) tmpQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, tilt * 0.6)))
  return tmpMatrix.compose(tmpPos.set(x, y, z), tmpQuat, tmpScale.setScalar(scale)).clone()
}

// --- Árboles horneados con ez-tree ------------------------------------------------------------

interface TreeSpec {
  url: string
  bark: 'pine' | 'oak'
  leaf: 'pine' | 'oak'
  /** Altura final en metros [mín, máx]. */
  height: [number, number]
  /** Radio del tronco a efectos de colisión (m). */
  trunk: number
}

const TREE_SPECS: Record<string, TreeSpec> = {
  conifer_a: { url: coniferAUrl, bark: 'pine', leaf: 'pine', height: [15, 22], trunk: 0.7 },
  conifer_b: { url: coniferBUrl, bark: 'pine', leaf: 'pine', height: [20, 28], trunk: 0.9 },
  conifer_c: { url: coniferCUrl, bark: 'pine', leaf: 'pine', height: [8, 13], trunk: 0.5 },
  broadleaf: { url: broadleafUrl, bark: 'oak', leaf: 'oak', height: [10, 15], trunk: 0.7 },
  bush: { url: bushUrl, bark: 'oak', leaf: 'oak', height: [1.6, 2.8], trunk: 0 },
}

function chooseTreeKind(x: number, z: number, rand: () => number): string | null {
  if (nearLake(x, z, 1.2)) return null
  const w = zoneWeights(x, z)
  const density = blendZoneValue(x, z, (zone) => zone.treeDensity)
  // Arboledas y claros: ruido de baja frecuencia que agrupa los árboles.
  const grove = smooth(fbm(x * 0.022 + 5, z * 0.022 - 9, 3), -0.25, 0.25)
  const edge = Math.max(Math.abs(x), Math.abs(z))
  const onMountains = smooth(edge, WORLD_BOUNDS - 4, WORLD_BOUNDS + 8)
  if (rand() > density * (0.25 + 0.75 * grove) * 0.9 + onMountains * 0.5) return null
  const r = rand()
  if (w.laguna + w.llanura * 0.6 > 0.5 && r < 0.45) return 'broadleaf'
  if (w.rocosa > 0.5) return r < 0.7 ? 'conifer_c' : 'conifer_a'
  return r < 0.4 ? 'conifer_a' : r < 0.7 ? 'conifer_b' : r < 0.9 ? 'conifer_c' : 'broadleaf'
}

function buildTrees(scene: THREE.Scene, quality: QualitySettings, obstacles: Obstacle[]): void {
  const placements = scatter(quality.treeCount, 1337, chooseTreeKind, 5.5)
  const bushes = scatter(
    Math.round(quality.treeCount * quality.bushRatio),
    4242,
    (x, z, rand) => {
      if (nearLake(x, z, 1.1)) return null
      const density = blendZoneValue(x, z, (zone) => zone.understoryDensity)
      return rand() < density * 0.45 ? 'bush' : null
    },
    3,
  )
  const all = [...placements, ...bushes]

  const byKind = new Map<string, Placement[]>()
  for (const p of all) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p])

  for (const p of placements) {
    const spec = TREE_SPECS[p.kind]
    if (spec.trunk > 0) obstacles.push({ x: p.x, z: p.z, r: spec.trunk })
  }

  const barkMaterials = {
    pine: new THREE.MeshStandardMaterial({
      map: loadTexture(barkPineUrl, { srgb: true, repeat: true }),
      normalMap: loadTexture(barkPineNormalUrl, { repeat: true }),
      roughness: 0.95,
    }),
    oak: new THREE.MeshStandardMaterial({
      map: loadTexture(barkOakUrl, { srgb: true, repeat: true }),
      normalMap: loadTexture(barkOakNormalUrl, { repeat: true }),
      roughness: 0.95,
    }),
  }
  const leafTextures = {
    pine: loadTexture(leafPineUrl, { srgb: true }),
    oak: loadTexture(leafOakUrl, { srgb: true }),
  }

  for (const [kind, items] of byKind) {
    const spec = TREE_SPECS[kind]
    gltfLoader.load(
      spec.url,
      (gltf) => {
        const root = gltf.scene
        let branches: THREE.BufferGeometry | null = null
        let leaves: THREE.BufferGeometry | null = null
        root.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return
          const name = (obj.material as THREE.Material).name
          if (name === 'bark') branches = bakedGeometry(obj, root)
          if (name === 'leaves') leaves = bakedGeometry(obj, root)
        })
        const box = new THREE.Box3().setFromObject(root)
        const nativeHeight = Math.max(box.max.y, 1)

        const rand = seededRandom(kind.length * 97)
        const matrices = items.map((p) => {
          const height = spec.height[0] + p.scale * (spec.height[1] - spec.height[0])
          // Hundimos un poco la base para que no "flote" en pendiente.
          return {
            matrix: composeMatrix(p.x, p.y - 0.25, p.z, p.rotation, height / nativeHeight),
            color: new THREE.Color().setHSL(0.2 + rand() * 0.1, 0.35 + rand() * 0.25, 0.72 + rand() * 0.2),
          }
        })

        if (branches) scene.add(makeInstanced(branches, barkMaterials[spec.bark], matrices.map(({ matrix }) => ({ matrix })), true, kind !== 'bush'))
        if (leaves) {
          const leafMaterial = new THREE.MeshStandardMaterial({
            map: leafTextures[spec.leaf],
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            roughness: 0.85,
          })
          addWind(leafMaterial, nativeHeight * 0.012, nativeHeight)
          scene.add(makeInstanced(leaves, leafMaterial, matrices, kind !== 'bush', kind !== 'bush'))
        }
      },
      undefined,
      (error) => console.error(`No se pudo cargar el árbol ${kind}:`, error),
    )
  }
}

// --- Flora mesozoica procedural: helechos, helechos arborescentes y cícadas -------------------

function buildUnderstory(scene: THREE.Scene, quality: QualitySettings, obstacles: Obstacle[]): void {
  const fernTex = frondTexture('fern')
  const cycadTex = frondTexture('cycad')

  // Helechos de suelo: lo que cubría el suelo en el Jurásico (la hierba aún no existía).
  const ferns = scatter(
    quality.fernCount,
    99,
    (x, z, rand) => {
      if (nearLake(x, z, 0.98)) return null
      const density = blendZoneValue(x, z, (zone) => zone.understoryDensity)
      const patch = smooth(fbm(x * 0.05 - 3, z * 0.05 + 8, 2), -0.3, 0.2)
      return rand() < density * (0.3 + 0.7 * patch) * 0.8 ? 'fern' : null
    },
    1.6,
  )
  const fernGeo = frondClumpGeometry({ fronds: 11, length: 1.3, width: 0.42, elevation: [0.5, 1.0], droop: 0.55, baseHeight: 0.02, seed: 3 })
  const fernMat = frondMaterial(fernTex, '#ffffff', 0.12, 1)
  const fernItems = ferns.map((p) => ({
    matrix: composeMatrix(p.x, p.y - 0.05, p.z, p.rotation, 0.6 + p.scale * 1.1),
    color: new THREE.Color().setHSL(0.2 + p.scale * 0.1, 0.4, 0.7 + p.scale * 0.22),
  }))
  scene.add(makeInstanced(fernGeo, fernMat, fernItems, false, false))

  // Helechos arborescentes (tipo Cyathea / Dicksonia) en la jungla y la orilla del lago.
  const treeFerns = scatter(
    quality.treeFernCount,
    777,
    (x, z, rand) => {
      if (nearLake(x, z, 1.02)) return null
      const w = zoneWeights(x, z)
      const shore = nearLake(x, z, 1.7) ? 0.8 : 0
      return rand() < w.jungla * 0.9 + w.laguna * 0.3 + shore ? 'treefern' : null
    },
    4,
  )
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 1, 8, 1)
  trunkGeo.translate(0, 0.5, 0)
  const trunkMat = new THREE.MeshStandardMaterial({
    map: loadTexture(barkPineUrl, { srgb: true, repeat: true }),
    color: '#6b5a44',
    roughness: 1,
  })
  const crownGeo = frondClumpGeometry({ fronds: 13, length: 3.2, width: 0.75, elevation: [0.15, 0.6], droop: 0.7, baseHeight: 0, seed: 5 })
  const crownMat = frondMaterial(fernTex, '#e6f5d2', 0.25, 1.5)
  const trunks: { matrix: THREE.Matrix4 }[] = []
  const crowns: { matrix: THREE.Matrix4; color: THREE.Color }[] = []
  for (const p of treeFerns) {
    const h = 2.2 + p.scale * 3.3
    trunks.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.2, p.z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)) })
    crowns.push({
      matrix: composeMatrix(p.x, p.y - 0.2 + h, p.z, p.rotation, 0.85 + p.scale * 0.3),
      color: new THREE.Color().setHSL(0.24, 0.35, 0.75 + p.scale * 0.15),
    })
    obstacles.push({ x: p.x, z: p.z, r: 0.35 })
  }
  scene.add(makeInstanced(trunkGeo, trunkMat, trunks, true), makeInstanced(crownGeo, crownMat, crowns, true))

  // Cícadas: tronco grueso escamoso y corona de hojas rígidas; abundantes en el Mesozoico.
  const cycads = scatter(
    quality.cycadCount,
    555,
    (x, z, rand) => {
      if (nearLake(x, z, 1.05)) return null
      const w = zoneWeights(x, z)
      return rand() < w.llanura * 0.7 + w.rocosa * 0.35 + w.jungla * 0.25 + w.laguna * 0.3 ? 'cycad' : null
    },
    3,
  )
  const cycadTrunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 1, 10, 1)
  cycadTrunkGeo.translate(0, 0.5, 0)
  const cycadTrunkMat = new THREE.MeshStandardMaterial({
    map: loadTexture(barkOakUrl, { srgb: true, repeat: true }),
    normalMap: loadTexture(barkOakNormalUrl, { repeat: true }),
    color: '#9a8a6c',
    roughness: 0.95,
  })
  const cycadCrownGeo = frondClumpGeometry({ fronds: 16, length: 1.9, width: 0.55, elevation: [0.35, 0.95], droop: 0.25, baseHeight: 0, seed: 8 })
  const cycadCrownMat = frondMaterial(cycadTex, '#ffffff', 0.08, 1)
  const cycadTrunks: { matrix: THREE.Matrix4 }[] = []
  const cycadCrowns: { matrix: THREE.Matrix4; color: THREE.Color }[] = []
  for (const p of cycads) {
    const h = 0.5 + p.scale * 1.6
    const s = 0.8 + p.scale * 0.5
    cycadTrunks.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.15, p.z), new THREE.Quaternion(), new THREE.Vector3(s, h, s)) })
    cycadCrowns.push({
      matrix: composeMatrix(p.x, p.y - 0.15 + h, p.z, p.rotation, s),
      color: new THREE.Color().setHSL(0.27, 0.35, 0.72 + p.scale * 0.2),
    })
    obstacles.push({ x: p.x, z: p.z, r: 0.45 * s })
  }
  scene.add(makeInstanced(cycadTrunkGeo, cycadTrunkMat, cycadTrunks, true, false), makeInstanced(cycadCrownGeo, cycadCrownMat, cycadCrowns, true, false))
}

// --- Rocas ------------------------------------------------------------------------------------

function buildRocks(scene: THREE.Scene, quality: QualitySettings, obstacles: Obstacle[]): void {
  const rocks = scatter(
    quality.rockCount,
    2024,
    (x, z, rand) => {
      if (nearLake(x, z, 0.9)) return null
      const w = zoneWeights(x, z)
      const lakeShore = nearLake(x, z, 1.35) ? 0.25 : 0
      return rand() < w.rocosa * 0.95 + w.jungla * 0.12 + w.llanura * 0.1 + w.laguna * 0.1 + lakeShore ? 'rock' : null
    },
    3.5,
  )
  const sized = rocks.map((p) => {
    const w = zoneWeights(p.x, p.z)
    const size = 0.35 + p.scale * p.scale * (1.2 + w.rocosa * 2.6)
    return { p, size }
  })
  for (const { p, size } of sized) {
    if (size > 0.9) obstacles.push({ x: p.x, z: p.z, r: size * 1.1 })
  }

  gltfLoader.load(
    rocksUrl,
    (gltf) => {
      const geometries: THREE.BufferGeometry[] = []
      let material: THREE.Material | null = null
      for (const sceneRoot of gltf.scenes) {
        sceneRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const geo = bakedGeometry(obj, sceneRoot)
            geo.computeBoundingBox()
            // Base de la roca en y = 0 y centrada en XZ.
            const bb = geo.boundingBox!
            geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)
            // Normaliza a ~2 m de diámetro para que la escala de colocación sea predecible.
            const extent = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z)
            geo.scale(2 / extent, 2 / extent, 2 / extent)
            geometries.push(geo)
            material ??= obj.material as THREE.Material
          }
        })
      }
      if (!material || geometries.length === 0) return
      const buckets: { matrix: THREE.Matrix4; color: THREE.Color }[][] = geometries.map(() => [])
      sized.forEach(({ p, size }, i) => {
        const tint = 0.75 + (p.scale * 7919 % 1) * 0.35
        buckets[i % geometries.length].push({
          // Enterradas un 20 % para que parezcan asentadas en el suelo.
          matrix: composeMatrix(p.x, p.y - size * 0.35, p.z, p.rotation, size, (p.scale - 0.5) * 0.3),
          color: new THREE.Color(tint, tint * 0.97, tint * 0.93),
        })
      })
      geometries.forEach((geo, i) => {
        if (buckets[i].length) scene.add(makeInstanced(geo, material!, buckets[i], true, false))
      })
    },
    undefined,
    (error) => console.error('No se pudieron cargar las rocas:', error),
  )
}

export function buildVegetation(scene: THREE.Scene, quality: QualitySettings): Vegetation {
  const obstacles: Obstacle[] = []
  buildTrees(scene, quality, obstacles)
  buildUnderstory(scene, quality, obstacles)
  buildRocks(scene, quality, obstacles)
  return {
    obstacles,
    update: (elapsed) => {
      windUniforms.uTime.value = elapsed
    },
  }
}
