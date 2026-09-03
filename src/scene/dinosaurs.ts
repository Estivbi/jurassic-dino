import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import type { DinoData } from '@ride-types/ride'
import { heightAtPosition } from './terrain'
import { zones } from './zones'
import trexUrl from '@assets/models/trex.opt.glb?url'
import brachiosaurusUrl from '@assets/models/brachiosaurus.opt.glb?url'

interface ModelConfig {
  url: string
  scale: number
  rotationY: number
}

/** Modelos glTF reales para las especies que ya tienen un asset descargado; el resto sigue con primitivas. */
const MODEL_CONFIG: Partial<Record<string, ModelConfig>> = {
  't-rex': { url: trexUrl, scale: 1, rotationY: 0 },
  brachiosaurus: { url: brachiosaurusUrl, scale: 1, rotationY: 0 },
}

const gltfLoader = new GLTFLoader()
gltfLoader.setMeshoptDecoder(MeshoptDecoder)

/** Geometrías unitarias reutilizadas por todos los dinosaurios: solo cambia el `scale` de cada mesh. */
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
  sphere: new THREE.IcosahedronGeometry(1, 1),
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>()
function materialFor(color: string): THREE.MeshStandardMaterial {
  let mat = materialCache.get(color)
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 })
    materialCache.set(color, mat)
  }
  return mat
}

function block(
  parent: THREE.Object3D,
  color: string,
  size: [number, number, number],
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  geo: THREE.BufferGeometry = GEO.box,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, materialFor(color))
  mesh.scale.set(...size)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

interface DinoRig {
  group: THREE.Group
  animateLimbs: (t: number) => void
}

function buildVelociraptor(color: string): DinoRig {
  const group = new THREE.Group()
  const dark = new THREE.Color(color).multiplyScalar(0.7).getStyle()

  block(group, color, [0.55, 0.6, 1.1], [0, 0.95, 0]) // torso
  const tail = block(group, color, [0.25, 0.25, 1.6], [0, 0.9, -1.2], [0, 0, 0], GEO.cone)
  tail.rotation.x = Math.PI / 2
  const head = block(group, dark, [0.32, 0.32, 0.55], [0, 1.35, 0.75])
  block(group, dark, [0.16, 0.16, 0.4], [0, 1.28, 1.15]) // hocico

  const legL = block(group, color, [0.18, 0.9, 0.18], [-0.22, 0.45, 0.05], [0, 0, 0], GEO.cylinder)
  const legR = block(group, color, [0.18, 0.9, 0.18], [0.22, 0.45, 0.05], [0, 0, 0], GEO.cylinder)
  block(group, color, [0.15, 0.5, 0.15], [-0.16, 0.7, 0.55], [0.5, 0, 0], GEO.cylinder)
  block(group, color, [0.15, 0.5, 0.15], [0.16, 0.7, 0.55], [0.5, 0, 0], GEO.cylinder)

  return {
    group,
    animateLimbs: (t) => {
      tail.rotation.y = Math.sin(t * 2.4) * 0.35
      head.rotation.y = Math.sin(t * 1.6) * 0.25
      legL.rotation.x = Math.sin(t * 6) * 0.5
      legR.rotation.x = Math.sin(t * 6 + Math.PI) * 0.5
    },
  }
}

function buildTriceratops(color: string): DinoRig {
  const group = new THREE.Group()
  const dark = new THREE.Color(color).multiplyScalar(0.75).getStyle()

  block(group, color, [1.1, 1.1, 2.2], [0, 1.1, 0]) // torso
  const head = new THREE.Group()
  head.position.set(0, 1.1, 1.5)
  group.add(head)
  block(head, dark, [0.9, 0.15, 0.9], [0, 0.55, -0.2], [0.3, 0, 0]) // gola
  block(head, dark, [0.55, 0.55, 0.9], [0, 0, 0.2]) // cráneo
  block(head, '#e8dcc0', [0.16, 0.5, 0.16], [-0.25, 0.35, 0.55], [-0.3, 0, 0.1], GEO.cone)
  block(head, '#e8dcc0', [0.16, 0.5, 0.16], [0.25, 0.35, 0.55], [-0.3, 0, -0.1], GEO.cone)
  block(head, '#e8dcc0', [0.14, 0.3, 0.14], [0, 0.05, 0.85], [-0.9, 0, 0], GEO.cone)

  const legs: THREE.Mesh[] = []
  const legPositions: [number, number, number][] = [
    [-0.55, 0.55, 0.75],
    [0.55, 0.55, 0.75],
    [-0.55, 0.55, -0.75],
    [0.55, 0.55, -0.75],
  ]
  for (const p of legPositions) legs.push(block(group, color, [0.3, 1.1, 0.3], p, [0, 0, 0], GEO.cylinder))
  const tail = block(group, color, [0.35, 0.35, 1.1], [0, 1.0, -1.6], [Math.PI / 2, 0, 0], GEO.cone)

  return {
    group,
    animateLimbs: (t) => {
      head.rotation.x = Math.sin(t * 0.8) * 0.05
      tail.rotation.z = Math.sin(t * 1.4) * 0.15
      legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(t * 4 + i * Math.PI) * 0.35
      })
    },
  }
}

function buildBrachiosaurus(color: string): DinoRig {
  const group = new THREE.Group()
  const dark = new THREE.Color(color).multiplyScalar(0.8).getStyle()

  block(group, color, [1.6, 1.7, 3.2], [0, 2.6, 0]) // torso

  const neck = new THREE.Group()
  neck.position.set(0, 3.3, 1.3)
  group.add(neck)
  block(neck, color, [0.7, 3.6, 0.7], [0, 1.6, 0.4], [-0.55, 0, 0], GEO.cylinder)
  const head = block(neck, dark, [0.45, 0.4, 0.7], [0, 3.3, 1.2])

  const tail = block(group, color, [0.5, 0.5, 3], [0, 2.3, -2.4], [Math.PI / 2, 0, 0], GEO.cone)

  const legs: THREE.Mesh[] = []
  const legPositions: [number, number, number][] = [
    [-0.7, 1.3, 1.0],
    [0.7, 1.3, 1.0],
    [-0.7, 1.3, -1.0],
    [0.7, 1.3, -1.0],
  ]
  for (const p of legPositions) legs.push(block(group, dark, [0.45, 2.6, 0.45], p, [0, 0, 0], GEO.cylinder))

  return {
    group,
    animateLimbs: (t) => {
      neck.rotation.x = Math.sin(t * 0.35) * 0.06
      head.rotation.y = Math.sin(t * 0.5) * 0.2
      tail.rotation.y = Math.sin(t * 0.4) * 0.1
      legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(t * 1.5 + i * Math.PI) * 0.12
      })
    },
  }
}

function buildTRex(color: string): DinoRig {
  const group = new THREE.Group()
  const dark = new THREE.Color(color).multiplyScalar(0.7).getStyle()

  const torso = block(group, color, [1.3, 1.5, 2.6], [0, 2.3, 0], [0.25, 0, 0])
  const tail = block(group, color, [0.5, 0.5, 3.2], [0, 2.0, -2.4], [Math.PI / 2 - 0.15, 0, 0], GEO.cone)
  const head = block(group, dark, [0.85, 0.75, 1.3], [0, 3.1, 1.7], [0.1, 0, 0])
  block(group, '#e8dcc0', [0.65, 0.15, 0.4], [0, 2.75, 2.35], [0.1, 0, 0])

  const armL = block(group, color, [0.15, 0.4, 0.15], [-0.55, 2.1, 1.0], [0.4, 0, 0], GEO.cylinder)
  const armR = block(group, color, [0.15, 0.4, 0.15], [0.55, 2.1, 1.0], [0.4, 0, 0], GEO.cylinder)

  const legs: THREE.Mesh[] = []
  const legPositions: [number, number, number][] = [
    [-0.5, 1.05, -0.1],
    [0.5, 1.05, -0.1],
  ]
  for (const p of legPositions) legs.push(block(group, color, [0.45, 2.1, 0.45], p, [0, 0, 0], GEO.cylinder))

  return {
    group,
    animateLimbs: (t) => {
      head.rotation.y = Math.sin(t * 0.7) * 0.3
      tail.rotation.y = Math.sin(t * 1.8) * 0.25
      armL.rotation.x = Math.sin(t * 1.5) * 0.1
      armR.rotation.x = Math.sin(t * 1.5 + 1) * 0.1
      torso.position.y = 2.3 + Math.sin(t * 3.6) * 0.05
      legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(t * 3.6 + i * Math.PI) * 0.3
      })
    },
  }
}

const BUILDERS: Record<string, (color: string) => DinoRig> = {
  velociraptor: buildVelociraptor,
  triceratops: buildTriceratops,
  brachiosaurus: buildBrachiosaurus,
  't-rex': buildTRex,
}

const WANDER_RADIUS = 22
const WANDER_SPEED_RANGE: [number, number] = [1.1, 2.2]

export interface DinoInstance {
  id: string
  group: THREE.Group
  update: (dt: number, elapsed: number) => void
}

function randomPointNear(center: THREE.Vector2, radius: number): THREE.Vector2 {
  const angle = Math.random() * Math.PI * 2
  const dist = Math.random() * radius
  return new THREE.Vector2(center.x + Math.cos(angle) * dist, center.y + Math.sin(angle) * dist)
}

export function buildDinosaurs(scene: THREE.Scene, dinos: DinoData[]): DinoInstance[] {
  const instances: DinoInstance[] = []

  dinos.forEach((dino) => {
    const builder = BUILDERS[dino.id] ?? buildVelociraptor
    const rig = builder(dino.color)

    const zone = zones.find((z) => z.id === dino.zoneId) ?? zones[0]
    const home = new THREE.Vector2(zone.corner[0] * 0.55, zone.corner[1] * 0.55)
    let target = randomPointNear(home, WANDER_RADIUS)
    const speed = WANDER_SPEED_RANGE[0] + Math.random() * (WANDER_SPEED_RANGE[1] - WANDER_SPEED_RANGE[0])
    let heading = 0

    const startY = heightAtPosition(home.x, home.y)
    rig.group.position.set(home.x, startY, home.y)

    // Foco cálido tipo "exhibición nocturna de zoo" para que el dinosaurio destaque entre la niebla.
    const spotlight = new THREE.PointLight(dino.accent, 4, 16, 2)
    spotlight.position.set(0, 3.4, 0.5)
    rig.group.add(spotlight)

    rig.group.userData.dinoId = dino.id
    scene.add(rig.group)

    // Referencia a todo lo que forma la primitiva de recambio (meshes y sub-grupos como el
    // cuello del Brachiosaurio) tomada antes de añadir el foco, para poder retirarla entera
    // y sin colgajos en cuanto llegue el modelo real.
    const fallbackChildren = [...rig.group.children]

    let animateVisual = rig.animateLimbs
    const modelConfig = MODEL_CONFIG[dino.id]
    if (modelConfig) {
      gltfLoader.load(
        modelConfig.url,
        (gltf) => {
          for (const child of fallbackChildren) rig.group.remove(child)
          gltf.scene.scale.setScalar(modelConfig.scale)
          gltf.scene.rotation.y = modelConfig.rotationY
          gltf.scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.castShadow = true
              obj.receiveShadow = true
            }
          })
          rig.group.add(gltf.scene)
          animateVisual = (t) => {
            gltf.scene.position.y = Math.sin(t * 1.2) * 0.05
          }
        },
        undefined,
        (error) => console.error(`No se pudo cargar el modelo de ${dino.id}, se mantiene la primitiva de recambio:`, error),
      )
    }

    const position2D = new THREE.Vector2(home.x, home.y)

    instances.push({
      id: dino.id,
      group: rig.group,
      update: (dt, elapsed) => {
        const toTarget = target.clone().sub(position2D)
        const distance = toTarget.length()
        if (distance < 0.6) {
          target = randomPointNear(home, WANDER_RADIUS)
        } else {
          toTarget.normalize()
          position2D.addScaledVector(toTarget, Math.min(speed * dt, distance))
          const desiredHeading = Math.atan2(toTarget.x, toTarget.y)
          let delta = desiredHeading - heading
          delta = Math.atan2(Math.sin(delta), Math.cos(delta))
          heading += delta * Math.min(1, dt * 3)
        }

        const groundY = heightAtPosition(position2D.x, position2D.y)
        rig.group.position.set(position2D.x, groundY, position2D.y)
        rig.group.rotation.y = heading
        animateVisual(elapsed)
      },
    })
  })

  return instances
}
