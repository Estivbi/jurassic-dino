import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import type { DinoData } from '@ride-types/ride'
import { heightAtPosition, isUnderwater } from './terrain'
import { zoneHome, zones } from './zones'
import { LAKE, WATER_LEVEL, WORLD_BOUNDS } from './constants'
import { bakedGeometry, gltfLoader, seededRandom } from './modelUtils'
import tRexUrl from '@assets/models/t-rex.glb?url'
import velociraptorUrl from '@assets/models/velociraptor.glb?url'
import triceratopsUrl from '@assets/models/triceratops.glb?url'
import brachiosaurusUrl from '@assets/models/brachiosaurus.glb?url'
import spinosaurusUrl from '@assets/models/spinosaurus.glb?url'
import baryonyxUrl from '@assets/models/baryonyx.glb?url'
import argentinosaurusUrl from '@assets/models/argentinosaurus.glb?url'
import megalosaurusUrl from '@assets/models/megalosaurus.glb?url'
import pistosaurusUrl from '@assets/models/pistosaurus.glb?url'

type Habitat = 'land' | 'shore' | 'water'
type Gait = 'biped' | 'quad'

interface SpeciesConfig {
  url: string
  /** Longitud del animal en metros: el modelo se escala para medir esto de hocico a cola. */
  length: number
  /** +1 si el modelo original mira a +Z, -1 si mira a -Z. */
  facing: 1 | -1
  /** Si el GLB trae animación esquelética, se reproduce con un AnimationMixer. */
  skeletal?: { timeScale: number }
  /** Si no la trae, se anima con un andar procedural en el vertex shader. */
  gait?: Gait
  habitat: Habitat
  herd: number
  speed: [number, number]
  /** Proporción del tiempo que pasa parado (pastando, oteando...). */
  idleChance: number
  wanderRadius: number
  /** Radio a partir del cual aparece el aviso de ficha (los gigantes se ven de lejos). */
  proximity: number
}

const SPECIES: Record<string, SpeciesConfig> = {
  velociraptor: { url: velociraptorUrl, length: 3.6, facing: -1, gait: 'biped', habitat: 'land', herd: 3, speed: [2.6, 4.2], idleChance: 0.35, wanderRadius: 26, proximity: 13 },
  megalosaurus: { url: megalosaurusUrl, length: 7, facing: 1, gait: 'biped', habitat: 'land', herd: 1, speed: [1.4, 2.2], idleChance: 0.4, wanderRadius: 26, proximity: 15 },
  triceratops: { url: triceratopsUrl, length: 8.5, facing: 1, gait: 'quad', habitat: 'land', herd: 3, speed: [1.0, 1.6], idleChance: 0.6, wanderRadius: 24, proximity: 16 },
  argentinosaurus: { url: argentinosaurusUrl, length: 33, facing: 1, gait: 'quad', habitat: 'land', herd: 1, speed: [0.9, 1.3], idleChance: 0.5, wanderRadius: 22, proximity: 30 },
  't-rex': { url: tRexUrl, length: 12.3, facing: 1, gait: 'biped', habitat: 'land', herd: 1, speed: [1.5, 2.4], idleChance: 0.35, wanderRadius: 26, proximity: 18 },
  brachiosaurus: { url: brachiosaurusUrl, length: 21, facing: 1, gait: 'quad', habitat: 'shore', herd: 2, speed: [0.8, 1.2], idleChance: 0.55, wanderRadius: 18, proximity: 24 },
  spinosaurus: { url: spinosaurusUrl, length: 14, facing: 1, skeletal: { timeScale: 1 }, habitat: 'shore', herd: 1, speed: [0.5, 0.8], idleChance: 0.85, wanderRadius: 12, proximity: 18 },
  baryonyx: { url: baryonyxUrl, length: 8.5, facing: 1, skeletal: { timeScale: 1 }, habitat: 'shore', herd: 1, speed: [1.1, 1.4], idleChance: 0.2, wanderRadius: 16, proximity: 14 },
  pistosaurus: { url: pistosaurusUrl, length: 3.2, facing: 1, skeletal: { timeScale: 1 }, habitat: 'water', herd: 2, speed: [1.6, 2.2], idleChance: 0, wanderRadius: 0, proximity: 24 },
}

export interface DinoInstance {
  id: string
  index: number
  group: THREE.Group
  proximity: number
  /** Radio aproximado del cuerpo en el plano XZ (para que el jeep no lo atraviese). */
  radius: number
  swims: boolean
  update: (dt: number, elapsed: number) => void
}

// --- Andar procedural para modelos sin esqueleto ---------------------------------------------

interface GaitRig {
  hipZ: number
  shoulderZ: number
  pivotY: number
  reach: number
  halfWidth: number
  minZ: number
  maxZ: number
  tailStart: number
  neckStart: number
  length: number
  quad: boolean
}

/** Analiza la geometría ya normalizada (metros, hocico hacia +Z, pies en y = 0) para situar patas, cola y cuello. */
function analyseRig(geometries: THREE.BufferGeometry[], gait: Gait): GaitRig {
  const box = new THREE.Box3()
  for (const g of geometries) {
    g.computeBoundingBox()
    box.union(g.boundingBox!)
  }
  const height = box.max.y - box.min.y
  const length = box.max.z - box.min.z
  const feet: number[] = []
  for (const g of geometries) {
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i += 3) if (pos.getY(i) < height * 0.05) feet.push(pos.getZ(i))
  }
  feet.sort((a, b) => a - b)
  const mid = feet.length ? (feet[0] + feet[feet.length - 1]) / 2 : 0
  const mean = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0)
  const back = gait === 'quad' ? feet.filter((z) => z < mid) : feet
  const front = gait === 'quad' ? feet.filter((z) => z >= mid) : feet
  const hipZ = mean(back)
  const shoulderZ = gait === 'quad' ? mean(front) : hipZ

  // Altura de la tripa sobre las caderas: por ahí se unen las patas al cuerpo.
  let belly = Infinity
  for (const g of geometries) {
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getZ(i) - hipZ) < length * 0.04 && Math.abs(pos.getX(i)) < (box.max.x - box.min.x) * 0.08) {
        belly = Math.min(belly, pos.getY(i))
      }
    }
  }
  if (!Number.isFinite(belly)) belly = height * 0.4
  return {
    hipZ,
    shoulderZ,
    pivotY: belly * 1.15,
    reach: length * (gait === 'quad' ? 0.1 : 0.12),
    halfWidth: (box.max.x - box.min.x) / 2,
    minZ: box.min.z,
    maxZ: box.max.z,
    tailStart: hipZ - length * 0.08,
    neckStart: (gait === 'quad' ? shoulderZ : hipZ) + length * 0.12,
    length,
    quad: gait === 'quad',
  }
}

interface GaitUniforms {
  uPhase: THREE.IUniform<number>
  uStride: THREE.IUniform<number>
  uTime: THREE.IUniform<number>
  uLook: THREE.IUniform<number>
}

function gaitShaderChunk(rig: GaitRig): string {
  const f = (v: number) => v.toFixed(4)
  return /* glsl */ `
    // --- andar procedural ---
    float legSwing(vec3 p, float legZ, float phase) {
      float side = p.x >= 0.0 ? 1.0 : -1.0;
      float sideW = smoothstep(${f(rig.halfWidth * 0.03)}, ${f(rig.halfWidth * 0.2)}, abs(p.x));
      float along = 1.0 - smoothstep(${f(rig.reach * 0.55)}, ${f(rig.reach)}, abs(p.z - legZ));
      float below = 1.0 - smoothstep(${f(rig.pivotY * 0.7)}, ${f(rig.pivotY)}, p.y);
      return sideW * along * below * side;
    }
    vec3 swingLeg(vec3 p, float legZ, float phase, float weight) {
      if (abs(weight) < 0.001) return p;
      float side = sign(weight);
      float legPhase = phase + (side > 0.0 ? 0.0 : 3.14159);
      float angle = sin(legPhase) * 0.42 * uStride * abs(weight);
      float dz = p.z - legZ;
      float dy = p.y - ${f(rig.pivotY)};
      float c = cos(angle);
      float s = sin(angle);
      vec3 r = p;
      r.z = legZ + dz * c - dy * s;
      r.y = ${f(rig.pivotY)} + dz * s + dy * c;
      // Levanta el pie en la fase de avance.
      r.y += max(0.0, cos(legPhase)) * ${f(rig.pivotY * 0.14)} * uStride * abs(weight) * (1.0 - p.y / ${f(rig.pivotY)});
      return r;
    }
    vec3 gaitDeform(vec3 p) {
      vec3 q = p;
      float wHind = legSwing(p, ${f(rig.hipZ)}, uPhase);
      q = swingLeg(q, ${f(rig.hipZ)}, uPhase, wHind);
      ${
        rig.quad
          ? `float wFore = legSwing(p, ${f(rig.shoulderZ)}, uPhase);
      q = swingLeg(q, ${f(rig.shoulderZ)}, uPhase + 1.5708, wFore);`
          : 'float wFore = 0.0;'
      }
      float legW = max(abs(wHind), abs(wFore));
      // Cola: ondulación que viaja hacia la punta.
      float tailT = clamp((${f(rig.tailStart)} - p.z) / ${f(rig.tailStart - rig.minZ)}, 0.0, 1.0);
      q.x += sin(uTime * 1.6 + uPhase * 0.5 - tailT * 2.6) * ${f(rig.length * 0.045)} * tailT * tailT;
      // Cuello y cabeza: miran alrededor.
      float neckT = clamp((p.z - ${f(rig.neckStart)}) / ${f(rig.maxZ - rig.neckStart)}, 0.0, 1.0);
      q.x += uLook * ${f(rig.length * 0.06)} * neckT * neckT;
      q.y += sin(uTime * 0.8) * ${f(rig.length * 0.012)} * neckT * neckT;
      // Balanceo del cuerpo al andar y respiración.
      q.y += (1.0 - legW) * (abs(sin(uPhase)) * ${f(rig.pivotY * 0.035)} * uStride + sin(uTime * 1.9) * ${f(rig.pivotY * 0.006)});
      return q;
    }
  `
}

function applyGait(material: THREE.Material, rig: GaitRig, uniforms: GaitUniforms): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uPhase;
        uniform float uStride;
        uniform float uTime;
        uniform float uLook;
        ${gaitShaderChunk(rig)}`,
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = gaitDeform(transformed);')
  }
  // Todas las especies comparten el mismo código base; la clave evita mezclar programas de rigs distintos.
  material.customProgramCacheKey = () => `gait-${rig.hipZ.toFixed(3)}-${rig.shoulderZ.toFixed(3)}-${rig.pivotY.toFixed(3)}`
}

// --- Carga de modelos --------------------------------------------------------------------------

interface LoadedSpecies {
  /** Crea un ejemplar listo para añadir a la escena. */
  spawn: () => { object: THREE.Object3D; animate: (dt: number, elapsed: number, stride: number, phase: number, look: number) => void }
  strideLength: number
}

function normalizeTransform(root: THREE.Object3D, config: SpeciesConfig): THREE.Matrix4 {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const scale = config.length / Math.max(size.z, size.x)
  const center = box.getCenter(new THREE.Vector3())
  const rotation = config.facing === -1 ? Math.PI : 0
  // Centra en XZ, apoya los pies en y = 0, escala a metros y gira para mirar a +Z.
  return new THREE.Matrix4()
    .makeRotationY(rotation)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z))
}

function prepareStatic(gltf: { scene: THREE.Object3D }, config: SpeciesConfig): LoadedSpecies {
  const root = gltf.scene
  const normalize = normalizeTransform(root, config)
  const parts: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = []
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const geometry = bakedGeometry(obj, root)
      geometry.applyMatrix4(normalize)
      geometry.computeBoundingSphere()
      parts.push({ geometry, material: obj.material as THREE.Material })
    }
  })
  const rig = analyseRig(
    parts.map((p) => p.geometry),
    config.gait ?? 'biped',
  )

  return {
    strideLength: rig.pivotY * (rig.quad ? 1.5 : 1.8),
    spawn: () => {
      const uniforms: GaitUniforms = {
        uPhase: { value: 0 },
        uStride: { value: 0 },
        uTime: { value: 0 },
        uLook: { value: 0 },
      }
      const group = new THREE.Group()
      for (const part of parts) {
        const material = (part.material as THREE.MeshStandardMaterial).clone()
        applyGait(material, rig, uniforms)
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
        applyGait(depth, rig, uniforms)
        const mesh = new THREE.Mesh(part.geometry, material)
        mesh.customDepthMaterial = depth
        mesh.castShadow = true
        mesh.receiveShadow = true
        // La deformación saca vértices de la esfera de recorte original.
        mesh.frustumCulled = false
        group.add(mesh)
      }
      return {
        object: group,
        animate: (_dt, elapsed, stride, phase, look) => {
          uniforms.uTime.value = elapsed
          uniforms.uStride.value = stride
          uniforms.uPhase.value = phase
          uniforms.uLook.value = look
        },
      }
    },
  }
}

function prepareSkeletal(gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }, config: SpeciesConfig): LoadedSpecies {
  const normalize = normalizeTransform(gltf.scene, config)
  const clip = gltf.animations[0]
  return {
    strideLength: config.length * 0.3,
    spawn: () => {
      const model = cloneSkinned(gltf.scene)
      const holder = new THREE.Group()
      holder.matrixAutoUpdate = false
      holder.matrix.copy(normalize)
      holder.add(model)
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true
          obj.receiveShadow = true
          obj.frustumCulled = false
        }
      })
      const mixer = new THREE.AnimationMixer(model)
      if (clip) {
        const action = mixer.clipAction(clip)
        action.timeScale = config.skeletal?.timeScale ?? 1
        action.play()
        // Desfasa a cada ejemplar para que no se muevan al unísono.
        mixer.setTime(Math.random() * clip.duration)
      }
      const group = new THREE.Group()
      group.add(holder)
      return {
        object: group,
        animate: (dt, _elapsed, stride) => {
          // Si el animal está parado, la animación sigue pero más lenta (respira, mira).
          mixer.update(dt * (config.habitat === 'water' ? 1 : 0.55 + 0.45 * stride))
        },
      }
    },
  }
}

// --- Comportamiento ----------------------------------------------------------------------------

function pickTarget(config: SpeciesConfig, home: THREE.Vector2, rand: () => number, out: THREE.Vector2): THREE.Vector2 {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (config.habitat === 'shore') {
      // Orilla del lago: entre 1,05 y 1,45 radios del centro, en el arco que mira a su "casa".
      const baseAngle = Math.atan2(home.y - LAKE.z, home.x - LAKE.x)
      const angle = baseAngle + (rand() - 0.5) * 1.6
      const dist = LAKE.radius * (1.1 + rand() * 0.4)
      out.set(LAKE.x + Math.cos(angle) * dist, LAKE.z + Math.sin(angle) * dist)
    } else {
      const angle = rand() * Math.PI * 2
      const dist = Math.sqrt(rand()) * config.wanderRadius
      out.set(home.x + Math.cos(angle) * dist, home.y + Math.sin(angle) * dist)
    }
    const limit = WORLD_BOUNDS - 10
    out.set(THREE.MathUtils.clamp(out.x, -limit, limit), THREE.MathUtils.clamp(out.y, -limit, limit))
    if (!isUnderwater(out.x, out.y, -0.4)) return out
  }
  return out.copy(home)
}

export interface DinosaurHerds {
  instances: DinoInstance[]
}

/** Empuja un punto fuera de los obstáculos fijos (troncos, rocas); lo aporta la escena. */
export type ObstacleResolver = (x: number, z: number, radius: number) => { x: number; z: number; blocked: boolean }

interface BodyState {
  position: THREE.Vector2
  radius: number
}

export function buildDinosaurs(scene: THREE.Scene, dinos: DinoData[], herdScale: number, resolveObstacles: ObstacleResolver): DinosaurHerds {
  const instances: DinoInstance[] = []
  const bodies: BodyState[] = []
  const tmpPush = new THREE.Vector2()

  dinos.forEach((dino, speciesIndex) => {
    const config = SPECIES[dino.id]
    if (!config) return
    const zone = zones.find((z) => z.id === dino.zoneId) ?? zones[0]
    const baseHome = zoneHome(zone)
    const herdSize = Math.max(1, Math.round(config.herd * herdScale))

    for (let i = 0; i < herdSize; i++) {
      const rand = seededRandom(speciesIndex * 131 + i * 17 + 3)
      const group = new THREE.Group()
      group.rotation.order = 'YXZ'
      group.userData.dinoId = dino.id
      scene.add(group)

      // Cada especie tiene su propio rincón dentro de la zona para que no se amontonen.
      const home = baseHome.clone().add(new THREE.Vector2(Math.cos(speciesIndex * 2.4) * 16, Math.sin(speciesIndex * 2.4) * 16))
      const position = new THREE.Vector2()
      let heading = rand() * Math.PI * 2
      if (config.habitat === 'water') {
        position.set(LAKE.x + LAKE.radius * 0.5, LAKE.z)
      } else {
        pickTarget(config, home, rand, position)
        position.x += i * 4
      }
      const target = pickTarget(config, home, rand, new THREE.Vector2())
      const body: BodyState = { position, radius: config.length * 0.28 }
      if (config.habitat !== 'water') bodies.push(body)
      const speed = config.speed[0] + rand() * (config.speed[1] - config.speed[0])
      let idleTimer = rand() * 4
      let stride = 0
      let phase = 0
      let look = 0
      let lookTarget = 0
      let lookTimer = 0
      let swimAngle = (i / herdSize) * Math.PI * 2
      const swimRadius = LAKE.radius * (0.45 + i * 0.18)
      let animate: ((dt: number, elapsed: number, stride: number, phase: number, look: number) => void) | null = null
      let strideLength = 2

      loadSpecies(dino.id, config).then((species) => {
        const spawned = species.spawn()
        group.add(spawned.object)
        animate = spawned.animate
        strideLength = species.strideLength
      })

      const toTarget = new THREE.Vector2()
      instances.push({
        id: dino.id,
        index: i,
        group,
        proximity: config.proximity,
        radius: config.length * 0.22,
        swims: config.habitat === 'water',
        update: (dt, elapsed) => {
          let moving = false
          if (config.habitat === 'water') {
            // Nada en círculos amplios por el lago, subiendo y bajando suavemente.
            swimAngle += (speed / swimRadius) * dt
            position.set(LAKE.x + Math.cos(swimAngle) * swimRadius, LAKE.z + Math.sin(swimAngle) * swimRadius * 0.8)
            heading = Math.atan2(-Math.sin(swimAngle), Math.cos(swimAngle) * 0.8)
            group.position.set(position.x, WATER_LEVEL - 0.55 + Math.sin(elapsed * 0.4 + i) * 0.35, position.y)
            group.rotation.set(0, heading, 0)
            animate?.(dt, elapsed, 1, 0, 0)
            return
          }

          if (idleTimer > 0) {
            idleTimer -= dt
          } else {
            toTarget.copy(target).sub(position)
            const distance = toTarget.length()
            if (distance < 0.8) {
              pickTarget(config, home, rand, target)
              if (rand() < config.idleChance) idleTimer = 3 + rand() * 9
            } else {
              toTarget.divideScalar(distance)
              const desired = Math.atan2(toTarget.x, toTarget.y)
              const delta = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading))
              heading += delta * Math.min(1, dt * 1.6)
              // Gira antes de arrancar: nada de andar de lado.
              const alignment = Math.max(0, Math.cos(delta))
              const step = speed * alignment * dt
              const nextX = position.x + Math.sin(heading) * step
              const nextZ = position.y + Math.cos(heading) * step
              if (isUnderwater(nextX, nextZ, -0.3)) {
                pickTarget(config, home, rand, target)
              } else {
                position.set(nextX, nextZ)
                moving = step > 0.0001
              }
              // Los gigantes apartan la vegetación; el resto esquiva troncos y rocas.
              if (config.length < 15) {
                const resolved = resolveObstacles(position.x, position.y, body.radius * 0.6)
                position.set(resolved.x, resolved.z)
                if (resolved.blocked && rand() < 0.02) pickTarget(config, home, rand, target)
              }
            }
          }

          // Ningún animal atraviesa a otro: el que se mueve se aparta.
          for (const other of bodies) {
            if (other === body) continue
            tmpPush.copy(position).sub(other.position)
            const minDist = (body.radius + other.radius) * 0.8
            const dist = tmpPush.length()
            if (dist < minDist && dist > 0.0001) position.addScaledVector(tmpPush, (minDist - dist) / dist)
          }

          stride = THREE.MathUtils.lerp(stride, moving ? 1 : 0, Math.min(1, dt * 3))
          phase += (dt * speed * stride * Math.PI * 2) / strideLength

          // Mira a los lados de vez en cuando.
          lookTimer -= dt
          if (lookTimer <= 0) {
            lookTarget = (rand() - 0.5) * 2 * (moving ? 0.3 : 1)
            lookTimer = 2 + rand() * 4
          }
          look = THREE.MathUtils.lerp(look, lookTarget, Math.min(1, dt * 1.2))

          // Se inclina con la pendiente del terreno.
          const halfLength = config.length * 0.3
          const fx = Math.sin(heading) * halfLength
          const fz = Math.cos(heading) * halfLength
          const hFront = heightAtPosition(position.x + fx, position.y + fz)
          const hBack = heightAtPosition(position.x - fx, position.y - fz)
          const pitch = THREE.MathUtils.clamp(-Math.atan2(hFront - hBack, halfLength * 2), -0.3, 0.3)
          const groundY = Math.min(hFront, hBack, heightAtPosition(position.x, position.y))
          group.position.set(position.x, groundY - 0.05, position.y)
          group.rotation.set(pitch, heading, 0)
          animate?.(dt, elapsed, stride, phase, look)
        },
      })
    }
  })

  return { instances }
}

const speciesCache = new Map<string, Promise<LoadedSpecies>>()

function loadSpecies(id: string, config: SpeciesConfig): Promise<LoadedSpecies> {
  let pending = speciesCache.get(id)
  if (!pending) {
    pending = gltfLoader.loadAsync(config.url).then((gltf) => (config.skeletal ? prepareSkeletal(gltf, config) : prepareStatic(gltf, config)))
    pending.catch((error) => console.error(`No se pudo cargar el modelo de ${id}:`, error))
    speciesCache.set(id, pending)
  }
  return pending
}
