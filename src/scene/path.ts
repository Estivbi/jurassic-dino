import * as THREE from 'three'

/**
 * Puntos de control del camino del jeep. Definen una pista serpenteante de
 * ~130 unidades de fondo con curvas suaves para que la cámara tenga cambios
 * de dirección sin resultar mareante.
 */
const CONTROL_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 4),
  new THREE.Vector3(0, 0, -6),
  new THREE.Vector3(6, 0.1, -18),
  new THREE.Vector3(-5, 0.35, -34),
  new THREE.Vector3(9, 0.1, -52),
  new THREE.Vector3(1, -0.2, -70),
  new THREE.Vector3(-9, 0.15, -88),
  new THREE.Vector3(3, 0, -106),
  new THREE.Vector3(0, 0, -122),
  new THREE.Vector3(0, 0, -134),
]

export const rideCurve = new THREE.CatmullRomCurve3(CONTROL_POINTS, false, 'catmullrom', 0.5)

const FRAME_SAMPLES = 400
const frenetFrames = rideCurve.computeFrenetFrames(FRAME_SAMPLES, false)
const framePositions = rideCurve.getSpacedPoints(FRAME_SAMPLES)

/** Interpola linealmente entre los frames precalculados para evitar recomputar Frenet cada frame. */
function sampleFrame(t: number) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1)
  const scaled = clamped * FRAME_SAMPLES
  const i0 = Math.min(Math.floor(scaled), FRAME_SAMPLES - 1)
  const i1 = Math.min(i0 + 1, FRAME_SAMPLES)
  const alpha = scaled - i0

  const position = new THREE.Vector3().lerpVectors(framePositions[i0], framePositions[i1], alpha)
  const tangent = new THREE.Vector3().lerpVectors(frenetFrames.tangents[i0], frenetFrames.tangents[i1], alpha).normalize()
  const normal = new THREE.Vector3().lerpVectors(frenetFrames.normals[i0], frenetFrames.normals[i1], alpha).normalize()

  return { position, tangent, normal }
}

export interface RideFrame {
  position: THREE.Vector3
  tangent: THREE.Vector3
  normal: THREE.Vector3
}

export function getRideFrame(t: number): RideFrame {
  return sampleFrame(t)
}

/** Construye la carretera de tierra como una cinta plana siguiendo la curva. */
export function buildRoadMesh(width = 5): THREE.Mesh {
  const segments = 300
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const { position, tangent } = sampleFrame(t)
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(width / 2)

    const left = new THREE.Vector3().copy(position).add(side)
    const right = new THREE.Vector3().copy(position).sub(side)
    left.y += 0.02
    right.y += 0.02

    positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
    uvs.push(0, i / segments, 1, i / segments)

    if (i < segments) {
      const a = i * 2
      const b = i * 2 + 1
      const c = i * 2 + 2
      const d = i * 2 + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    color: 0x4a3a26,
    roughness: 1,
    metalness: 0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.name = 'road'
  return mesh
}
