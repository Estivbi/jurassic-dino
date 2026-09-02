import * as THREE from 'three'
import type { DinoData } from '@ride-types/ride'
import { getRideFrame } from './path'
import { heightAtPosition } from './terrain'

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

export interface DinoInstance {
  id: string
  group: THREE.Group
  animate: (t: number) => void
}

function buildVelociraptor(color: string): DinoInstance {
  const group = new THREE.Group()
  const dark = new THREE.Color(color).multiplyScalar(0.7).getStyle()

  block(group, color, [0.55, 0.6, 1.1], [0, 0.95, 0]) // torso
  const tail = block(group, color, [0.25, 0.25, 1.6], [0, 0.9, -1.1], [0.15, 0, 0], GEO.cone)
  tail.rotation.z = Math.PI / 2
  tail.rotation.x = Math.PI / 2
  tail.position.set(0, 0.9, -1.2)
  const head = block(group, dark, [0.32, 0.32, 0.55], [0, 1.35, 0.75])
  block(group, dark, [0.16, 0.16, 0.4], [0, 1.28, 1.15]) // hocico

  const legL = block(group, color, [0.18, 0.9, 0.18], [-0.22, 0.45, 0.05], [0, 0, 0], GEO.cylinder)
  const legR = block(group, color, [0.18, 0.9, 0.18], [0.22, 0.45, 0.05], [0, 0, 0], GEO.cylinder)
  block(group, color, [0.15, 0.5, 0.15], [-0.16, 0.7, 0.55], [0.5, 0, 0], GEO.cylinder)
  block(group, color, [0.15, 0.5, 0.15], [0.16, 0.7, 0.55], [0.5, 0, 0], GEO.cylinder)

  group.userData.parts = { tail, head, legL, legR }

  return {
    id: 'velociraptor',
    group,
    animate: (t) => {
      tail.rotation.y = Math.sin(t * 2.4) * 0.35
      head.rotation.y = Math.sin(t * 1.6) * 0.25
      legL.rotation.x = Math.sin(t * 3) * 0.12
      legR.rotation.x = Math.sin(t * 3 + Math.PI) * 0.12
      group.position.y += Math.sin(t * 3) * 0.0015
    },
  }
}

function buildTriceratops(color: string): DinoInstance {
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
    id: 'triceratops',
    group,
    animate: (t) => {
      head.rotation.x = Math.sin(t * 0.8) * 0.05
      tail.rotation.z = Math.sin(t * 1.4) * 0.15
      legs.forEach((leg, i) => {
        leg.scale.y = 1.1 + Math.sin(t * 1.6 + i) * 0.02
      })
    },
  }
}

function buildBrachiosaurus(color: string): DinoInstance {
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
    id: 'brachiosaurus',
    group,
    animate: (t) => {
      neck.rotation.x = Math.sin(t * 0.35) * 0.06
      head.rotation.y = Math.sin(t * 0.5) * 0.2
      tail.rotation.y = Math.sin(t * 0.4) * 0.1
      legs.forEach(() => {})
    },
  }
}

function buildTRex(color: string): DinoInstance {
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
    id: 't-rex',
    group,
    animate: (t) => {
      head.rotation.y = Math.sin(t * 0.7) * 0.3
      tail.rotation.y = Math.sin(t * 0.9) * 0.2
      armL.rotation.x = Math.sin(t * 1.5) * 0.1
      armR.rotation.x = Math.sin(t * 1.5 + 1) * 0.1
      torso.position.y = 2.3 + Math.sin(t * 1.1) * 0.03
      legs.forEach(() => {})
    },
  }
}

const BUILDERS: Record<string, (color: string) => DinoInstance> = {
  velociraptor: buildVelociraptor,
  triceratops: buildTriceratops,
  brachiosaurus: buildBrachiosaurus,
  't-rex': buildTRex,
}

export function buildDinosaurs(scene: THREE.Scene, dinos: DinoData[]): DinoInstance[] {
  const instances: DinoInstance[] = []

  dinos.forEach((dino, i) => {
    const builder = BUILDERS[dino.id] ?? buildVelociraptor
    const instance = builder(dino.color)

    const { position, tangent, normal } = getRideFrame(dino.stopT)
    const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
    const sign = i % 2 === 0 ? 1 : -1
    const offset = side.multiplyScalar(sign * (6 + (i % 3)))

    const finalPos = position.clone().add(offset)
    finalPos.y = heightAtPosition(finalPos.x, finalPos.z)

    instance.group.position.copy(finalPos)
    instance.group.lookAt(position.x, finalPos.y, position.z)
    void normal

    // Foco cálido tipo "exhibición nocturna de zoo" para que el dinosaurio destaque entre la niebla.
    const spotlight = new THREE.PointLight(dino.accent, 4, 14, 2)
    spotlight.position.set(0, 3.2, 0.5)
    instance.group.add(spotlight)

    instance.group.userData.dinoId = dino.id
    scene.add(instance.group)
    instances.push(instance)
  })

  return instances
}
