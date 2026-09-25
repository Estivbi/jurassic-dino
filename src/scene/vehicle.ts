import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export interface VehicleInput {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
}

// Física propia, ligera (sin motor de física): unidades del SI, 1 unidad = 1 m.
const MAX_SPEED_FORWARD = 17
const MAX_SPEED_REVERSE = 6
const ENGINE_ACCEL = 8.5
const REVERSE_ACCEL = 5
const BRAKE_DECEL = 15
const ROLLING_RESISTANCE = 1.2
const AIR_DRAG = 0.008
const GRAVITY = 9.81
const WHEELBASE = 2.42
const TRACK = 1.64
const MAX_STEER = 0.55
const STEER_RATE = 2.6
/** Agarre lateral de los neumáticos (1/s): cuanto más alto, menos derrapa. */
const TIRE_GRIP = 8
const RESTITUTION = 0.3
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
  /** Carrocería (todo menos las ruedas): se mueve sobre la suspensión. */
  body: THREE.Group
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

  // Todo lo que no son las cuatro ruedas va sobre la suspensión.
  const body = new THREE.Group()
  const wheelPivots = new Set<THREE.Object3D>(wheels.map((w) => w.pivot))
  for (const child of [...group.children]) if (!wheelPivots.has(child)) body.add(child)
  group.add(body)

  return { group, body, wheels, frontWheels: [wheels[0], wheels[1]], headlights, lamps: { head: m.headlamp, tail: m.taillamp } }
}

export interface VehicleWorld {
  heightAt: (x: number, z: number) => number
  bounds: number
  /** Corrige la posición deseada si choca con algo (troncos, rocas, agua profunda). */
  resolve: (x: number, z: number, prevX: number, prevZ: number) => { x: number; z: number; blocked: boolean }
}

/** Muelle amortiguado de un grado de libertad (suspensión, cabeceo y balanceo de la carrocería). */
class Spring {
  value = 0
  velocity = 0
  private stiffness: number
  private damping: number
  constructor(stiffness: number, damping: number) {
    this.stiffness = stiffness
    this.damping = damping
  }
  step(target: number, dt: number): number {
    this.velocity += (this.stiffness * (target - this.value) - this.damping * this.velocity) * dt
    this.value += this.velocity * dt
    return this.value
  }
}

export class Vehicle {
  readonly model: JeepModel
  position: THREE.Vector3
  heading: number
  /** Velocidad en el plano XZ (m/s). */
  readonly velocity = new THREE.Vector2()
  private verticalSpeed = 0
  private onGround = true
  private steer = 0
  private yawRate = 0
  private wheelSpin = 0
  private tiltPitch = 0
  private tiltRoll = 0
  private suspension = new Spring(70, 10)
  private bodyPitch = new Spring(55, 9)
  private bodyRoll = new Spring(55, 9)
  private lastForwardAccel = 0
  private tmpForward = new THREE.Vector2()
  private tmpLeft = new THREE.Vector2()

  constructor(startPosition: THREE.Vector3, startHeading = 0) {
    this.model = buildJeep()
    this.position = startPosition.clone()
    this.heading = startHeading
    this.model.group.position.copy(this.position)
    this.model.group.rotation.y = this.heading
  }

  /** Velocidad hacia delante (negativa marcha atrás), en m/s. */
  get speed(): number {
    return this.velocity.dot(this.tmpForward.set(Math.sin(this.heading), Math.cos(this.heading)))
  }

  set speed(value: number) {
    this.velocity.set(Math.sin(this.heading), Math.cos(this.heading)).multiplyScalar(value)
    this.verticalSpeed = 0
    this.yawRate = 0
  }

  /** Dirección hacia la que apunta el morro del jeep (coincide con la geometría del modelo, construida en +Z local). */
  forwardVector(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(Math.sin(this.heading), 0, Math.cos(this.heading))
  }

  update(input: VehicleInput, dt: number, world: VehicleWorld): void {
    const forward = this.tmpForward.set(Math.sin(this.heading), Math.cos(this.heading))
    // Con el morro hacia +Z, el lado izquierdo del jeep es +X.
    const left = this.tmpLeft.set(Math.cos(this.heading), -Math.sin(this.heading))
    let vForward = this.velocity.dot(forward)
    let vSide = this.velocity.dot(left)

    // Dirección progresiva: el volante no gira de golpe y a alta velocidad gira menos.
    const turnInput = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    const speedRatio = THREE.MathUtils.clamp(Math.abs(vForward) / MAX_SPEED_FORWARD, 0, 1)
    const steerTarget = turnInput * MAX_STEER * (1 - 0.55 * speedRatio)
    const maxSteerStep = STEER_RATE * dt
    this.steer += THREE.MathUtils.clamp(steerTarget - this.steer, -maxSteerStep, maxSteerStep)

    let accel = 0
    if (this.onGround) {
      if (input.forward) {
        accel = vForward < -0.3 ? BRAKE_DECEL : ENGINE_ACCEL * Math.max(0, 1 - vForward / MAX_SPEED_FORWARD)
      } else if (input.back) {
        accel = vForward > 0.3 ? -BRAKE_DECEL : -REVERSE_ACCEL * Math.max(0, 1 + vForward / MAX_SPEED_REVERSE)
      } else if (Math.abs(vForward) > 0.01) {
        accel = -Math.sign(vForward) * Math.min(ROLLING_RESISTANCE, Math.abs(vForward) / dt)
      }
      accel -= Math.sign(vForward) * AIR_DRAG * vForward * vForward
      // La pendiente frena al subir y empuja al bajar.
      const hFront = world.heightAt(this.position.x + forward.x, this.position.z + forward.y)
      const hBack = world.heightAt(this.position.x - forward.x, this.position.z - forward.y)
      const grade = THREE.MathUtils.clamp((hFront - hBack) / 2, -0.6, 0.6)
      accel -= GRAVITY * grade * 0.85
      vForward += accel * dt
      if (!input.forward && !input.back && Math.abs(vForward) < 0.05 && Math.abs(grade) < 0.12) vForward = 0

      // Agarre lateral: los neumáticos anulan el deslizamiento de lado. En curvas rápidas
      // agarran algo menos y el jeep derrapa un poco.
      const slipFactor = THREE.MathUtils.clamp((Math.abs(vForward) - 9) / 8, 0, 1) * (Math.abs(this.steer) / MAX_STEER)
      vSide *= Math.exp(-TIRE_GRIP * (1 - 0.6 * slipFactor) * dt)

      // Giro según la geometría de Ackermann simplificada: radio = batalla / tan(dirección).
      const yawTarget = (vForward / WHEELBASE) * Math.tan(this.steer)
      this.yawRate += (yawTarget - this.yawRate) * Math.min(1, dt * 10)
    } else {
      this.yawRate *= Math.exp(-0.5 * dt)
    }
    this.lastForwardAccel = accel
    this.heading += this.yawRate * dt

    // La velocidad se reexpresa con el nuevo rumbo (el jeep "arrastra" su inercia).
    forward.set(Math.sin(this.heading), Math.cos(this.heading))
    left.set(Math.cos(this.heading), -Math.sin(this.heading))
    this.velocity.set(forward.x * vForward + left.x * vSide, forward.y * vForward + left.y * vSide)

    // Desplazamiento y choques: rebote con pérdida de energía contra troncos, rocas y animales.
    const desiredX = THREE.MathUtils.clamp(this.position.x + this.velocity.x * dt, -world.bounds, world.bounds)
    const desiredZ = THREE.MathUtils.clamp(this.position.z + this.velocity.y * dt, -world.bounds, world.bounds)
    const resolved = world.resolve(desiredX, desiredZ, this.position.x, this.position.z)
    if (resolved.blocked) {
      let nx = resolved.x - desiredX
      let nz = resolved.z - desiredZ
      let len = Math.hypot(nx, nz)
      if (len < 1e-4) {
        nx = -this.velocity.x
        nz = -this.velocity.y
        len = Math.hypot(nx, nz) || 1
      }
      nx /= len
      nz /= len
      const vn = this.velocity.x * nx + this.velocity.y * nz
      if (vn < 0) {
        this.velocity.x -= (1 + RESTITUTION) * vn * nx
        this.velocity.y -= (1 + RESTITUTION) * vn * nz
        // El golpe sacude la carrocería.
        const impact = Math.min(-vn, 12)
        this.bodyPitch.velocity += impact * 0.35 * (nx * forward.x + nz * forward.y)
        this.bodyRoll.velocity += impact * 0.35 * (nx * left.x + nz * left.y)
        this.yawRate *= 0.5
      }
    }
    this.position.x = resolved.x
    this.position.z = resolved.z

    // Gravedad: sigue el terreno al subir y, si una cresta cae más rápido que la gravedad,
    // el jeep se despega y vuela un instante.
    const groundY = world.heightAt(this.position.x, this.position.z)
    this.verticalSpeed -= GRAVITY * dt
    this.position.y += this.verticalSpeed * dt
    if (this.position.y <= groundY) {
      const terrainSpeed = (groundY - this.position.y) / dt + this.verticalSpeed
      if (!this.onGround && this.verticalSpeed < -2.5) {
        // Aterrizaje: la suspensión se comprime según la velocidad de caída.
        this.suspension.velocity += this.verticalSpeed * 0.6
        this.velocity.multiplyScalar(0.93)
      }
      this.position.y = groundY
      this.verticalSpeed = Math.max(this.verticalSpeed, Math.min(terrainSpeed, 6))
      this.onGround = true
    } else {
      this.onGround = this.position.y - groundY < 0.08
    }

    // Inclinación del chasis con el terreno (solo con las ruedas en el suelo).
    if (this.onGround) {
      const hFront = world.heightAt(this.position.x + forward.x * WHEELBASE / 2, this.position.z + forward.y * WHEELBASE / 2)
      const hBack = world.heightAt(this.position.x - forward.x * WHEELBASE / 2, this.position.z - forward.y * WHEELBASE / 2)
      const hLeft = world.heightAt(this.position.x + left.x * TRACK / 2, this.position.z + left.y * TRACK / 2)
      const hRight = world.heightAt(this.position.x - left.x * TRACK / 2, this.position.z - left.y * TRACK / 2)
      const k = Math.min(1, dt * 10)
      this.tiltPitch = THREE.MathUtils.lerp(this.tiltPitch, -Math.atan2(hFront - hBack, WHEELBASE), k)
      this.tiltRoll = THREE.MathUtils.lerp(this.tiltRoll, Math.atan2(hLeft - hRight, TRACK), k)
    }

    // Carrocería sobre los muelles: se agacha al acelerar, se hunde al frenar y se inclina
    // hacia fuera en las curvas.
    const lateralAccel = this.yawRate * vForward
    const lift = this.suspension.step(0, dt)
    const bodyPitch = this.bodyPitch.step(THREE.MathUtils.clamp(-this.lastForwardAccel * 0.006, -0.06, 0.06), dt)
    const bodyRoll = this.bodyRoll.step(THREE.MathUtils.clamp(lateralAccel * 0.01, -0.08, 0.08), dt)
    this.model.body.position.y = THREE.MathUtils.clamp(lift, -0.18, 0.12)
    this.model.body.rotation.set(bodyPitch, 0, bodyRoll)

    this.model.group.position.copy(this.position)
    this.model.group.rotation.set(this.tiltPitch, this.heading, this.tiltRoll, 'YXZ')

    this.wheelSpin += (vForward * dt) / WHEEL_RADIUS
    for (const wheel of this.model.wheels) wheel.spin.rotation.x = this.wheelSpin
    for (const wheel of this.model.frontWheels) wheel.pivot.rotation.y = this.steer
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
