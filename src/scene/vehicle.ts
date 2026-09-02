import * as THREE from 'three'

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

function buildWheel(): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.32, 14)
  const mat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 })
  const wheel = new THREE.Mesh(geo, mat)
  wheel.rotation.z = Math.PI / 2
  wheel.castShadow = true
  return wheel
}

export interface JeepModel {
  group: THREE.Group
  wheels: THREE.Mesh[]
  frontWheels: THREE.Mesh[]
  headlights: THREE.Group
}

export function buildJeep(): JeepModel {
  const group = new THREE.Group()
  const paint = new THREE.MeshStandardMaterial({ color: '#5b7a4a', roughness: 0.6, metalness: 0.1 })
  const dark = new THREE.MeshStandardMaterial({ color: '#2c3320', roughness: 0.8 })
  const glass = new THREE.MeshStandardMaterial({ color: '#0d1a17', roughness: 0.2, metalness: 0.3 })

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 3.2), paint)
  body.position.y = 0.75
  body.castShadow = true
  group.add(body)

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.6, 1.5), paint)
  cabin.position.set(0, 1.32, 0.15)
  cabin.castShadow = true
  group.add(cabin)

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), glass)
  windshield.position.set(0, 1.32, 0.9)
  windshield.rotation.x = -0.15
  group.add(windshield)

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.0), dark)
  hood.position.set(0, 1.05, 1.6)
  group.add(hood)

  const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.2, 0.2), dark)
  bumperFront.position.set(0, 0.45, 1.65)
  group.add(bumperFront)

  const spareWheel = buildWheel()
  spareWheel.position.set(0, 1.3, -1.65)
  group.add(spareWheel)

  const wheelPositions: [number, number, number][] = [
    [-0.95, 0.4, 1.05],
    [0.95, 0.4, 1.05],
    [-0.95, 0.4, -1.05],
    [0.95, 0.4, -1.05],
  ]
  const wheels = wheelPositions.map((p) => {
    const wheel = buildWheel()
    wheel.position.set(...p)
    group.add(wheel)
    return wheel
  })

  const headlights = new THREE.Group()
  const leftLight = new THREE.SpotLight('#ffd9a0', 9, 40, Math.PI / 6, 0.5, 1.3)
  leftLight.position.set(-0.55, 0.55, 1.6)
  const leftTarget = new THREE.Object3D()
  leftTarget.position.set(-0.55, 0.2, 10)
  leftLight.target = leftTarget
  const rightLight = leftLight.clone()
  rightLight.position.set(0.55, 0.55, 1.6)
  const rightTarget = new THREE.Object3D()
  rightTarget.position.set(0.55, 0.2, 10)
  rightLight.target = rightTarget
  headlights.add(leftLight, leftTarget, rightLight, rightTarget)
  group.add(headlights)

  return { group, wheels, frontWheels: [wheels[0], wheels[1]], headlights }
}

export class Vehicle {
  readonly model: JeepModel
  position: THREE.Vector3
  heading: number
  speed = 0
  private wheelSpin = 0

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

  update(input: VehicleInput, dt: number, heightAt: (x: number, z: number) => number, bounds: number): void {
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
    this.position.x = THREE.MathUtils.clamp(this.position.x + forward.x * this.speed * dt, -bounds, bounds)
    this.position.z = THREE.MathUtils.clamp(this.position.z + forward.z * this.speed * dt, -bounds, bounds)
    const groundY = heightAt(this.position.x, this.position.z)
    this.position.y = THREE.MathUtils.lerp(this.position.y, groundY, Math.min(1, dt * 10))

    this.model.group.position.copy(this.position)
    this.model.group.rotation.y = this.heading

    this.wheelSpin += (this.speed * dt) / WHEEL_RADIUS
    for (const wheel of this.model.wheels) wheel.rotation.x = this.wheelSpin
    const steerAngle = THREE.MathUtils.clamp(turnInput * 0.4, -0.4, 0.4)
    for (const wheel of this.model.frontWheels) wheel.rotation.y = steerAngle
  }
}
