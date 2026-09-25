import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export interface VehicleInput {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
}

const MAX_SPEED_FORWARD = 15
const MAX_SPEED_REVERSE = 6.5
const ACCEL = 13
const BRAKE_DECEL = 20
const REVERSE_ACCEL = 9
const FRICTION = 9
const TURN_RATE = 1.1
const WHEEL_RADIUS = 0.38
const HEADLIGHT_INTENSITY = 90

const WHEEL_WIDTH = 0.3

function treadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 256, 64)
  // Tacos en chevron del neumático todoterreno (se usa como bumpMap).
  ctx.fillStyle = '#1a1a1a'
  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * 256
    ctx.beginPath()
    ctx.moveTo(x, 4)
    ctx.lineTo(x + 6, 4)
    ctx.lineTo(x + 12, 32)
    ctx.lineTo(x + 6, 60)
    ctx.lineTo(x, 60)
    ctx.lineTo(x + 6, 32)
    ctx.closePath()
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1)
  return texture
}

interface JeepMaterials {
  paint: THREE.MeshPhysicalMaterial
  stripe: THREE.MeshStandardMaterial
  black: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  glass: THREE.MeshPhysicalMaterial
  seat: THREE.MeshStandardMaterial
  headlamp: THREE.MeshStandardMaterial
  taillamp: THREE.MeshStandardMaterial
}

function jeepMaterials(): JeepMaterials {
  return {
    // Pintura de coche: base mate con capa de barniz que refleja el cielo.
    paint: new THREE.MeshPhysicalMaterial({ color: '#3f5a3a', roughness: 0.45, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    stripe: new THREE.MeshStandardMaterial({ color: '#d8b35a', roughness: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: '#1b1c1c', roughness: 0.75, metalness: 0.1 }),
    steel: new THREE.MeshStandardMaterial({ color: '#b9bec2', roughness: 0.28, metalness: 0.9 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95, bumpMap: treadTexture(), bumpScale: 3 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#9fb8c2', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28 }),
    seat: new THREE.MeshStandardMaterial({ color: '#3a2e24', roughness: 0.85 }),
    headlamp: new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.1, metalness: 0.2, emissive: '#ffe7b8', emissiveIntensity: 0 }),
    taillamp: new THREE.MeshStandardMaterial({ color: '#7a0d0d', roughness: 0.3, emissive: '#ff2a1a', emissiveIntensity: 0 }),
  }
}

function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

/** Tubo recto entre dos puntos (arco antivuelco, marco del parabrisas...). */
function tube(parent: THREE.Object3D, material: THREE.Material, a: [number, number, number], b: [number, number, number], radius = 0.035): void {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const length = start.distanceTo(end)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material)
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize())
  mesh.castShadow = true
  parent.add(mesh)
}

export interface Wheel {
  /** Gira en Y para la dirección (solo las delanteras). */
  pivot: THREE.Group
  /** Gira en X al rodar. */
  spin: THREE.Group
}

function buildWheel(materials: JeepMaterials): Wheel {
  const pivot = new THREE.Group()
  const spin = new THREE.Group()
  pivot.add(spin)
  // Perfil del neumático con los flancos redondeados.
  const r = WHEEL_RADIUS
  const w = WHEEL_WIDTH / 2
  const profile = [
    new THREE.Vector2(r * 0.62, -w),
    new THREE.Vector2(r * 0.9, -w),
    new THREE.Vector2(r * 0.98, -w * 0.8),
    new THREE.Vector2(r, -w * 0.45),
    new THREE.Vector2(r, w * 0.45),
    new THREE.Vector2(r * 0.98, w * 0.8),
    new THREE.Vector2(r * 0.9, w),
    new THREE.Vector2(r * 0.62, w),
  ]
  const tire = new THREE.LatheGeometry(profile, 28)
  tire.rotateZ(Math.PI / 2)
  part(spin, tire, materials.rubber, [0, 0, 0])
  // Llanta de acero con cinco radios y buje.
  const rim = new THREE.CylinderGeometry(r * 0.62, r * 0.62, WHEEL_WIDTH * 0.8, 20, 1, true)
  rim.rotateZ(Math.PI / 2)
  part(spin, rim, materials.steel, [0, 0, 0])
  const disc = new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.02, 20)
  disc.rotateZ(Math.PI / 2)
  part(spin, disc, materials.black, [0, 0, 0])
  for (let i = 0; i < 5; i++) {
    const spoke = part(spin, new THREE.BoxGeometry(0.03, r * 0.55, 0.07), materials.steel, [0, 0, 0], [(i / 5) * Math.PI * 2, 0, 0])
    spoke.translateY(r * 0.3)
  }
  const hub = new THREE.CylinderGeometry(0.06, 0.07, WHEEL_WIDTH * 0.7, 12)
  hub.rotateZ(Math.PI / 2)
  part(spin, hub, materials.steel, [0, 0, 0])
  return { pivot, spin }
}

export interface JeepModel {
  group: THREE.Group
  wheels: Wheel[]
  frontWheels: Wheel[]
  headlights: THREE.Group
  lamps: { head: THREE.MeshStandardMaterial; tail: THREE.MeshStandardMaterial }
}

/**
 * Todoterreno de safari modelado por piezas: bañera con cantos redondeados, capó largo,
 * guardabarros, parabrisas abatible, arco antivuelco con barra de focos y rueda de repuesto.
 * Mira hacia +Z; el suelo está en y = 0.
 */
export function buildJeep(): JeepModel {
  const group = new THREE.Group()
  const m = jeepMaterials()

  // Chasis y bajos.
  part(group, new THREE.BoxGeometry(1.1, 0.22, 3.7), m.black, [0, 0.5, 0.05])
  // Bañera trasera y laterales.
  part(group, new RoundedBoxGeometry(1.68, 0.66, 2.35, 3, 0.07), m.paint, [0, 0.98, -0.5])
  // Capó y frontal.
  part(group, new RoundedBoxGeometry(1.46, 0.46, 1.5, 3, 0.06), m.paint, [0, 1.04, 1.28])
  part(group, new THREE.BoxGeometry(1.2, 0.03, 1.3), m.black, [0, 1.275, 1.28]) // junta del capó
  // Franja lateral de la librea del parque.
  for (const side of [-1, 1]) part(group, new THREE.BoxGeometry(0.01, 0.1, 2.3), m.stripe, [side * 0.845, 1.05, -0.5])
  // Guardabarros: aletas negras planas delante, arcos detrás.
  for (const side of [-1, 1]) {
    part(group, new RoundedBoxGeometry(0.32, 0.08, 1.15, 2, 0.03), m.black, [side * 0.83, 1.0, 1.22])
    const arch = new THREE.TorusGeometry(WHEEL_RADIUS + 0.1, 0.06, 6, 16, Math.PI)
    part(group, arch, m.black, [side * 0.86, 0.45, -1.2], [0, Math.PI / 2, 0])
    // Estribo.
    part(group, new THREE.BoxGeometry(0.16, 0.05, 1.1), m.black, [side * 0.9, 0.58, 0.05])
  }
  // Rejilla con barras horizontales, faros redondos e intermitentes.
  part(group, new RoundedBoxGeometry(1.28, 0.44, 0.08, 2, 0.02), m.black, [0, 1.02, 2.03])
  for (let i = 0; i < 4; i++) part(group, new THREE.BoxGeometry(0.62, 0.025, 0.03), m.steel, [0, 0.9 + i * 0.075, 2.075])
  for (const side of [-1, 1]) {
    const bezel = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20)
    bezel.rotateX(Math.PI / 2)
    part(group, bezel, m.steel, [side * 0.47, 1.04, 2.07])
    const lens = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20)
    lens.rotateX(Math.PI / 2)
    part(group, lens, m.headlamp, [side * 0.47, 1.04, 2.1])
    part(group, new THREE.BoxGeometry(0.1, 0.05, 0.03), m.taillamp, [side * 0.47, 0.88, 2.08])
    // Pilotos traseros.
    part(group, new THREE.BoxGeometry(0.08, 0.2, 0.04), m.taillamp, [side * 0.78, 1.02, -1.69])
  }
  // Parachoques con cabrestante y parachoques trasero.
  part(group, new THREE.BoxGeometry(1.86, 0.16, 0.18), m.black, [0, 0.64, 2.1])
  const winch = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12)
  winch.rotateZ(Math.PI / 2)
  part(group, winch, m.steel, [0, 0.77, 2.1])
  part(group, new THREE.BoxGeometry(1.8, 0.16, 0.16), m.black, [0, 0.64, -1.78])
  // Parabrisas inclinado con marco y cristal.
  const windshield = new THREE.Group()
  windshield.position.set(0, 1.28, 0.55)
  windshield.rotation.x = -0.22
  group.add(windshield)
  tube(windshield, m.paint, [-0.74, 0, 0], [-0.74, 0.58, 0], 0.03)
  tube(windshield, m.paint, [0.74, 0, 0], [0.74, 0.58, 0], 0.03)
  tube(windshield, m.paint, [-0.74, 0.58, 0], [0.74, 0.58, 0], 0.03)
  part(windshield, new THREE.PlaneGeometry(1.46, 0.54), m.glass, [0, 0.29, 0])
  // Interior: salpicadero, volante (a la izquierda) y asientos.
  part(group, new THREE.BoxGeometry(1.5, 0.18, 0.25), m.black, [0, 1.25, 0.38])
  const wheel = new THREE.TorusGeometry(0.15, 0.018, 8, 20)
  part(group, wheel, m.black, [-0.38, 1.4, 0.22], [-0.9, 0, 0])
  for (const side of [-1, 1]) {
    part(group, new RoundedBoxGeometry(0.5, 0.12, 0.5, 2, 0.04), m.seat, [side * 0.38, 1.12, -0.05])
    part(group, new RoundedBoxGeometry(0.5, 0.55, 0.12, 2, 0.04), m.seat, [side * 0.38, 1.4, -0.33], [-0.12, 0, 0])
  }
  part(group, new RoundedBoxGeometry(1.35, 0.12, 0.5, 2, 0.04), m.seat, [0, 1.12, -1.05])
  part(group, new RoundedBoxGeometry(1.35, 0.5, 0.12, 2, 0.04), m.seat, [0, 1.38, -1.32], [-0.1, 0, 0])
  // Arco antivuelco con barra de focos.
  for (const z of [-0.45, -1.45]) {
    tube(group, m.black, [-0.72, 1.28, z], [-0.72, 2.05, z], 0.04)
    tube(group, m.black, [0.72, 1.28, z], [0.72, 2.05, z], 0.04)
    tube(group, m.black, [-0.72, 2.05, z], [0.72, 2.05, z], 0.04)
  }
  tube(group, m.black, [-0.72, 2.05, -0.45], [-0.72, 2.05, -1.45], 0.04)
  tube(group, m.black, [0.72, 2.05, -0.45], [0.72, 2.05, -1.45], 0.04)
  for (let i = 0; i < 4; i++) {
    const lamp = new THREE.CylinderGeometry(0.075, 0.06, 0.1, 14)
    lamp.rotateX(Math.PI / 2)
    part(group, lamp, m.black, [-0.45 + i * 0.3, 2.13, -0.42])
    const lampLens = new THREE.CylinderGeometry(0.065, 0.065, 0.01, 14)
    lampLens.rotateX(Math.PI / 2)
    part(group, lampLens, m.headlamp, [-0.45 + i * 0.3, 2.13, -0.36])
  }
  // Retrovisor.
  tube(group, m.black, [-0.8, 1.3, 0.5], [-0.95, 1.42, 0.45], 0.012)
  part(group, new RoundedBoxGeometry(0.14, 0.1, 0.03, 2, 0.01), m.black, [-0.98, 1.44, 0.45])

  const wheelPositions: [number, number, number][] = [
    [-0.82, WHEEL_RADIUS, 1.22],
    [0.82, WHEEL_RADIUS, 1.22],
    [-0.82, WHEEL_RADIUS, -1.2],
    [0.82, WHEEL_RADIUS, -1.2],
  ]
  const wheels = wheelPositions.map((p) => {
    const w = buildWheel(m)
    w.pivot.position.set(...p)
    group.add(w.pivot)
    return w
  })
  // Rueda de repuesto en el portón.
  const spare = buildWheel(m)
  spare.pivot.position.set(0, 1.08, -1.88)
  spare.pivot.rotation.y = Math.PI / 2
  group.add(spare.pivot)

  const headlights = new THREE.Group()
  const leftLight = new THREE.SpotLight('#ffe2b0', 0, 55, Math.PI / 5.5, 0.45, 1.4)
  leftLight.position.set(-0.47, 1.04, 2.1)
  const leftTarget = new THREE.Object3D()
  leftTarget.position.set(-0.6, 0.2, 12)
  leftLight.target = leftTarget
  const rightLight = leftLight.clone()
  rightLight.position.set(0.47, 1.04, 2.1)
  const rightTarget = new THREE.Object3D()
  rightTarget.position.set(0.6, 0.2, 12)
  rightLight.target = rightTarget
  headlights.add(leftLight, leftTarget, rightLight, rightTarget)
  group.add(headlights)

  return { group, wheels, frontWheels: [wheels[0], wheels[1]], headlights, lamps: { head: m.headlamp, tail: m.taillamp } }
}

export interface VehicleWorld {
  heightAt: (x: number, z: number) => number
  bounds: number
  /** Corrige la posición deseada si choca con algo (troncos, rocas, agua profunda). */
  resolve: (x: number, z: number, prevX: number, prevZ: number) => { x: number; z: number; blocked: boolean }
}

export class Vehicle {
  readonly model: JeepModel
  position: THREE.Vector3
  heading: number
  speed = 0
  private wheelSpin = 0
  private pitch = 0
  private roll = 0
  private tmpRight = new THREE.Vector3()

  constructor(startPosition: THREE.Vector3, startHeading = 0) {
    this.model = buildJeep()
    this.position = startPosition.clone()
    this.heading = startHeading
    this.model.group.position.copy(this.position)
    this.model.group.rotation.y = this.heading
  }

  /** Dirección hacia la que apunta el morro del jeep (coincide con la geometría del modelo, construida en +Z local). */
  forwardVector(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(Math.sin(this.heading), 0, Math.cos(this.heading))
  }

  update(input: VehicleInput, dt: number, world: VehicleWorld): void {
    if (input.forward) {
      this.speed = Math.min(MAX_SPEED_FORWARD, this.speed + ACCEL * dt)
    } else if (input.back) {
      if (this.speed > 0.1) this.speed = Math.max(0, this.speed - BRAKE_DECEL * dt)
      else this.speed = Math.max(-MAX_SPEED_REVERSE, this.speed - REVERSE_ACCEL * dt)
    } else if (this.speed > 0) {
      this.speed = Math.max(0, this.speed - FRICTION * dt)
    } else if (this.speed < 0) {
      this.speed = Math.min(0, this.speed + FRICTION * dt)
    }

    const turnInput = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    if (turnInput !== 0 && Math.abs(this.speed) > 0.15) {
      const direction = this.speed < 0 ? -1 : 1
      const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / 4, 0.4, 1)
      this.heading += turnInput * TURN_RATE * speedFactor * direction * dt
    }

    const forward = this.forwardVector()
    const nextX = THREE.MathUtils.clamp(this.position.x + forward.x * this.speed * dt, -world.bounds, world.bounds)
    const nextZ = THREE.MathUtils.clamp(this.position.z + forward.z * this.speed * dt, -world.bounds, world.bounds)
    const resolved = world.resolve(nextX, nextZ, this.position.x, this.position.z)
    if (resolved.blocked) this.speed *= 0.4
    this.position.x = resolved.x
    this.position.z = resolved.z
    const groundY = world.heightAt(this.position.x, this.position.z)
    this.position.y = THREE.MathUtils.lerp(this.position.y, groundY, Math.min(1, dt * 10))

    // Carrocería apoyada en el terreno: cabeceo y balanceo según la altura bajo las ruedas.
    const right = this.tmpRight.set(Math.cos(this.heading), 0, -Math.sin(this.heading))
    const hFront = world.heightAt(this.position.x + forward.x * 1.1, this.position.z + forward.z * 1.1)
    const hBack = world.heightAt(this.position.x - forward.x * 1.1, this.position.z - forward.z * 1.1)
    const hRight = world.heightAt(this.position.x + right.x * 0.95, this.position.z + right.z * 0.95)
    const hLeft = world.heightAt(this.position.x - right.x * 0.95, this.position.z - right.z * 0.95)
    const targetPitch = -Math.atan2(hFront - hBack, 2.2)
    const targetRoll = Math.atan2(hRight - hLeft, 1.9)
    const k = Math.min(1, dt * 8)
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, k)
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, k)

    this.model.group.position.copy(this.position)
    this.model.group.rotation.set(this.pitch, this.heading, this.roll, 'YXZ')

    this.wheelSpin += (this.speed * dt) / WHEEL_RADIUS
    for (const wheel of this.model.wheels) wheel.spin.rotation.x = this.wheelSpin
    const steerAngle = THREE.MathUtils.clamp(turnInput * 0.4, -0.4, 0.4)
    for (const wheel of this.model.frontWheels) wheel.pivot.rotation.y = steerAngle
  }

  setHeadlights(strength: number): void {
    // Nunca se ocultan: cambiar el número de luces obligaría a recompilar todos los shaders.
    this.model.lamps.head.emissiveIntensity = strength * 4
    this.model.lamps.tail.emissiveIntensity = strength * 2.5
    for (const light of this.model.headlights.children) {
      if (light instanceof THREE.SpotLight) light.intensity = HEADLIGHT_INTENSITY * strength
    }
  }
}
