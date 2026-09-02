import * as THREE from 'three'
import { WORLD_BOUNDS } from './constants'
import { heightAtPosition } from './terrain'
import { blendVegetationDensity } from './zones'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildVegetation(scene: THREE.Scene, baseCount: number): void {
  const rand = mulberry32(1337)
  const spawnExclusion = 10

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 6)
  const canopyGeo = new THREE.ConeGeometry(1, 1, 7)
  const fernGeo = new THREE.ConeGeometry(0.5, 1, 5)

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 1 })
  const canopyMat = new THREE.MeshStandardMaterial({ color: '#123d24', roughness: 0.9 })
  const fernMat = new THREE.MeshStandardMaterial({ color: '#1c5230', roughness: 0.9 })

  // baseCount es el máximo posible; la densidad real por punto depende de la zona (jungla >> llanura/rocosa).
  const maxTrees = Math.round(baseCount * 0.55)
  const maxFerns = baseCount - maxTrees

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, maxTrees)
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, maxTrees)
  const ferns = new THREE.InstancedMesh(fernGeo, fernMat, maxFerns)
  trunks.castShadow = true
  canopies.castShadow = true
  trunks.receiveShadow = true

  const dummy = new THREE.Object3D()
  let placedTrees = 0
  let attempts = 0
  while (placedTrees < maxTrees && attempts < maxTrees * 20) {
    attempts++
    const x = (rand() * 2 - 1) * WORLD_BOUNDS
    const z = (rand() * 2 - 1) * WORLD_BOUNDS
    if (Math.hypot(x, z) < spawnExclusion) continue
    if (rand() > blendVegetationDensity(x, z)) continue

    const y = heightAtPosition(x, z)
    const trunkHeight = 2.4 + rand() * 2.2
    dummy.position.set(x, y + trunkHeight / 2, z)
    dummy.scale.set(1, trunkHeight, 1)
    dummy.rotation.y = rand() * Math.PI * 2
    dummy.updateMatrix()
    trunks.setMatrixAt(placedTrees, dummy.matrix)

    const canopySize = 1.6 + rand() * 1.4
    dummy.position.set(x, y + trunkHeight + canopySize * 0.5, z)
    dummy.scale.set(canopySize, canopySize * 1.6, canopySize)
    dummy.updateMatrix()
    canopies.setMatrixAt(placedTrees, dummy.matrix)

    placedTrees++
  }

  let placedFerns = 0
  attempts = 0
  while (placedFerns < maxFerns && attempts < maxFerns * 20) {
    attempts++
    const x = (rand() * 2 - 1) * WORLD_BOUNDS
    const z = (rand() * 2 - 1) * WORLD_BOUNDS
    if (Math.hypot(x, z) < spawnExclusion * 0.6) continue
    if (rand() > blendVegetationDensity(x, z)) continue

    const y = heightAtPosition(x, z)
    const size = 0.5 + rand() * 0.6
    dummy.position.set(x, y + size * 0.5, z)
    dummy.scale.set(size, size, size)
    dummy.rotation.y = rand() * Math.PI * 2
    dummy.updateMatrix()
    ferns.setMatrixAt(placedFerns, dummy.matrix)
    placedFerns++
  }

  trunks.count = placedTrees
  canopies.count = placedTrees
  ferns.count = placedFerns
  trunks.instanceMatrix.needsUpdate = true
  canopies.instanceMatrix.needsUpdate = true
  ferns.instanceMatrix.needsUpdate = true

  scene.add(trunks, canopies, ferns)
}
