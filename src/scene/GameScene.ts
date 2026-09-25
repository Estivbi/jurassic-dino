import * as THREE from 'three'
import type { DinoData, QualityLevel, ZoneId } from '@ride-types/ride'
import { getQualitySettings, type QualitySettings } from './quality'
import { buildTerrain, heightAtPosition, isUnderwater } from './terrain'
import { applyCelestialLighting, buildLighting, createAtmosphereState, type LightingRig } from './lighting'
import { buildVegetation, NO_REFLECTION_LAYER, type Obstacle, type Vegetation } from './vegetation'
import { buildDinosaurs, type DinoInstance } from './dinosaurs'
import { Vehicle, type VehicleInput, type VehicleWorld } from './vehicle'
import { WORLD_BOUNDS } from './constants'
import { zoneWeights } from './zones'
import { createCelestialClock, type CelestialClock, type LocationSource } from './celestial'
import { SkySystem, type ConstellationLabel } from './sky'
import { buildLake, type Lake } from './water'

const JEEP_RADIUS = 1.3

export interface MinimapSnapshot {
  player: { x: number; z: number; heading: number }
  dinos: { id: string; x: number; z: number; color: string }[]
}

export interface SkyInfo {
  time: string
  hourOffset: number
  sunAltitude: number
  moonPhaseName: string
  moonFraction: number
  moonPhase: number
  moonAltitude: number
  night: number
  locationSource: LocationSource
  lat: number
  lon: number
}

export interface FrameInfo {
  nearbyDinoId: string | null
  /** Zona en la que está claramente el jeep (null en el cruce central, junto a la entrada). */
  zoneId: ZoneId | null
}

/** Rejilla espacial de obstáculos para que la colisión del jeep no recorra cientos de troncos por frame. */
class ObstacleGrid {
  private cells = new Map<string, Obstacle[]>()
  private cellSize: number
  constructor(obstacles: Obstacle[], cellSize = 8) {
    this.cellSize = cellSize
    for (const o of obstacles) {
      const key = this.key(Math.floor(o.x / cellSize), Math.floor(o.z / cellSize))
      const list = this.cells.get(key)
      if (list) list.push(o)
      else this.cells.set(key, [o])
    }
  }
  private key(i: number, j: number): string {
    return `${i},${j}`
  }
  near(x: number, z: number, out: Obstacle[]): Obstacle[] {
    out.length = 0
    const i0 = Math.floor(x / this.cellSize)
    const j0 = Math.floor(z / this.cellSize)
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      for (let j = j0 - 1; j <= j0 + 1; j++) {
        const list = this.cells.get(this.key(i, j))
        if (list) out.push(...list)
      }
    }
    return out
  }
}

export class GameScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private lighting: LightingRig
  private atmosphere = createAtmosphereState()
  private sky: SkySystem
  private clock: CelestialClock
  private lake: Lake
  private vegetation: Vegetation
  private obstacleGrid: ObstacleGrid
  private dinoInstances: DinoInstance[]
  private dinoColors = new Map<string, string>()
  private vehicle: Vehicle
  private vehicleWorld: VehicleWorld
  private quality: QualitySettings
  private frameId: number | null = null
  private timer = new THREE.Timer()
  private nearbyDinoId: string | null = null
  private zoneId: ZoneId | null = null

  private tmpDesiredCam = new THREE.Vector3()
  private tmpLookTarget = new THREE.Vector3()
  private tmpForward = new THREE.Vector3()
  private tmpSunDir = new THREE.Vector3()
  private nearbyObstacles: Obstacle[] = []
  private debugView: { from: THREE.Vector3; to: THREE.Vector3 } | null = null
  private chaseDistance = 7
  private chaseHeight = 3.4

  constructor(canvas: HTMLCanvasElement, dinos: DinoData[], qualityLevel: QualityLevel) {
    this.quality = getQualitySettings(qualityLevel)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality.antialias,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatioCap))
    this.renderer.shadowMap.enabled = this.quality.shadows
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.62

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, this.quality.fogFar * 1.7)
    // La cámara ve también los detalles que el reflejo del lago se salta.
    this.camera.layers.enable(NO_REFLECTION_LAYER)

    this.lighting = buildLighting(this.scene, this.quality)
    this.clock = createCelestialClock()
    this.sky = new SkySystem(this.renderer, this.scene)

    this.scene.add(buildTerrain(this.quality.terrainSegments))
    this.lake = buildLake(this.scene, this.quality.reflectiveWater)
    this.scene.add(this.lake.mesh)
    this.vegetation = buildVegetation(this.scene, this.quality)
    this.obstacleGrid = new ObstacleGrid(this.vegetation.obstacles)
    this.dinoInstances = buildDinosaurs(this.scene, dinos, this.quality.herdScale, (x, z, radius) =>
      this.resolveObstacles(x, z, radius),
    ).instances
    for (const dino of dinos) this.dinoColors.set(dino.id, dino.accent)

    const startY = heightAtPosition(0, 6)
    this.vehicle = new Vehicle(new THREE.Vector3(0, startY, 6), Math.PI)
    this.scene.add(this.vehicle.model.group)
    this.vehicleWorld = {
      heightAt: heightAtPosition,
      bounds: WORLD_BOUNDS,
      resolve: (x, z, prevX, prevZ) => this.resolveVehicle(x, z, prevX, prevZ),
    }

    this.placeCameraBehindVehicle()
    this.resize()
  }

  private resolveVehicle(x: number, z: number, prevX: number, prevZ: number): { x: number; z: number; blocked: boolean } {
    // El jeep no se mete en el lago: si el agua cubriría las ruedas, se queda en la orilla.
    if (isUnderwater(x, z, 0.35)) return { x: prevX, z: prevZ, blocked: true }
    const resolved = this.resolveObstacles(x, z, JEEP_RADIUS)
    // Tampoco se atraviesa a los dinosaurios.
    for (const dino of this.dinoInstances) {
      if (dino.swims) continue
      const dx = resolved.x - dino.group.position.x
      const dz = resolved.z - dino.group.position.z
      const minDist = dino.radius + JEEP_RADIUS
      const distSq = dx * dx + dz * dz
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001
        resolved.x = dino.group.position.x + (dx / dist) * minDist
        resolved.z = dino.group.position.z + (dz / dist) * minDist
        resolved.blocked = true
      }
    }
    return resolved
  }

  private resolveObstacles(x: number, z: number, radius: number): { x: number; z: number; blocked: boolean } {
    let blocked = false
    for (const o of this.obstacleGrid.near(x, z, this.nearbyObstacles)) {
      const dx = x - o.x
      const dz = z - o.z
      const minDist = o.r + radius
      const distSq = dx * dx + dz * dz
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001
        x = o.x + (dx / dist) * minDist
        z = o.z + (dz / dist) * minDist
        blocked = true
      }
    }
    return { x, z, blocked }
  }

  private placeCameraBehindVehicle(): void {
    this.tmpForward.copy(this.vehicle.forwardVector())
    this.camera.position.copy(this.vehicle.position).addScaledVector(this.tmpForward, -this.chaseDistance)
    this.camera.position.y += this.chaseHeight
    this.camera.lookAt(this.vehicle.position)
  }

  resize(): void {
    const canvas = this.renderer.domElement
    const parent = canvas.parentElement
    const width = parent?.clientWidth ?? window.innerWidth
    const height = parent?.clientHeight ?? window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    // En vertical (móvil) se abre el campo de visión y la cámara se aleja un poco.
    this.camera.fov = this.camera.aspect < 1 ? 72 : 60
    this.chaseDistance = this.camera.aspect < 1 ? 8.5 : 7
    this.chaseHeight = this.camera.aspect < 1 ? 4 : 3.4
    this.camera.updateProjectionMatrix()
  }

  getNearbyDinoId(): string | null {
    return this.nearbyDinoId
  }

  /** Expuesto para depuración manual (consola del navegador): teletransporta el jeep (heading opcional, en radianes). */
  teleport(x: number, z: number, heading?: number): void {
    this.vehicle.position.set(x, heightAtPosition(x, z), z)
    this.vehicle.speed = 0
    if (heading !== undefined) this.vehicle.heading = heading
    this.vehicle.model.group.position.copy(this.vehicle.position)
    this.vehicle.model.group.rotation.y = this.vehicle.heading
    this.placeCameraBehindVehicle()
  }

  /** Expuesto para depuración manual: posición actual del primer ejemplar de una especie. */
  getDinoPosition(id: string): { x: number; y: number; z: number } | null {
    const dino = this.dinoInstances.find((d) => d.id === id)
    return dino ? { x: dino.group.position.x, y: dino.group.position.y, z: dino.group.position.z } : null
  }

  /** Expuesto para depuración manual (consola del navegador): posición y rumbo actuales del jeep. */
  getVehicleState(): { x: number; y: number; z: number; heading: number } {
    return {
      x: this.vehicle.position.x,
      y: this.vehicle.position.y,
      z: this.vehicle.position.z,
      heading: this.vehicle.heading,
    }
  }

  /** Snapshot en el plano XZ para el minimapa del HUD: posición del jeep y de cada dinosaurio. */
  getMinimapSnapshot(): MinimapSnapshot {
    return {
      player: { x: this.vehicle.position.x, z: this.vehicle.position.z, heading: this.vehicle.heading },
      dinos: this.dinoInstances.map((dino) => ({
        id: dino.id,
        x: dino.group.position.x,
        z: dino.group.position.z,
        color: this.dinoColors.get(dino.id) ?? '#f3ecd6',
      })),
    }
  }

  /** Expuesto para depuración manual: fija la cámara en un punto (null vuelve a la cámara de persecución). */
  setDebugView(from: [number, number, number] | null, to?: [number, number, number]): void {
    this.debugView = from && to ? { from: new THREE.Vector3(...from), to: new THREE.Vector3(...to) } : null
  }

  getSkyInfo(): SkyInfo {
    const state = this.clock.getState()
    return {
      time: state.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      hourOffset: this.clock.getHourOffset(),
      sunAltitude: state.sunAltitudeDeg,
      moonPhaseName: state.moonPhaseName,
      moonFraction: state.moonFraction,
      moonPhase: state.moonPhase,
      moonAltitude: state.moonAltitudeDeg,
      night: this.atmosphere.night,
      locationSource: state.locationSource,
      lat: state.lat,
      lon: state.lon,
    }
  }

  setHourOffset(hours: number): void {
    this.clock.setHourOffset(hours)
  }

  setConstellationsVisible(visible: boolean): void {
    this.sky.setConstellationsVisible(visible)
  }

  getConstellationLabels(): ConstellationLabel[] {
    return this.sky.getConstellationLabels(this.camera)
  }

  update(input: VehicleInput): void {
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.1)
    const elapsed = this.timer.getElapsed()

    this.vehicle.update(input, dt, this.vehicleWorld)

    // Cámara de persecución que nunca se hunde en el terreno.
    this.tmpForward.copy(this.vehicle.forwardVector())
    this.tmpDesiredCam.copy(this.vehicle.position).addScaledVector(this.tmpForward, -this.chaseDistance)
    this.tmpDesiredCam.y += this.chaseHeight
    const minCamY = heightAtPosition(this.tmpDesiredCam.x, this.tmpDesiredCam.z) + 1.2
    this.tmpDesiredCam.y = Math.max(this.tmpDesiredCam.y, minCamY)
    this.camera.position.lerp(this.tmpDesiredCam, Math.min(1, dt * 5))
    this.tmpLookTarget.copy(this.vehicle.position).addScaledVector(this.tmpForward, 6)
    this.tmpLookTarget.y += 1.4
    this.camera.lookAt(this.tmpLookTarget)
    if (this.debugView) {
      this.camera.position.copy(this.debugView.from)
      this.camera.lookAt(this.debugView.to)
    }

    // Cielo, luces y niebla a partir del Sol y la Luna reales.
    const celestial = this.clock.getState()
    applyCelestialLighting(this.lighting, celestial, this.vehicle.position, this.atmosphere)
    this.sky.update(celestial, this.atmosphere, elapsed)
    this.renderer.toneMappingExposure = this.atmosphere.exposure
    this.scene.environmentIntensity = this.atmosphere.environmentIntensity
    const fog = this.scene.fog as THREE.FogExp2
    fog.color.copy(this.atmosphere.fogColor)
    fog.density = (1.35 / this.quality.fogFar) * this.atmosphere.fogDensityScale
    this.vehicle.setHeadlights(this.atmosphere.night)

    this.tmpSunDir.fromArray(celestial.sunDir)
    this.lake.update(dt, this.tmpSunDir, this.lighting.key.color, this.atmosphere.daylight)
    this.vegetation.update(elapsed)

    let closestId: string | null = null
    let closestScore = 1
    for (const dino of this.dinoInstances) {
      dino.update(dt, elapsed)
      const dist = dino.group.position.distanceTo(this.vehicle.position)
      const score = dist / dino.proximity
      if (score < closestScore) {
        closestScore = score
        closestId = dino.id
      }
    }
    this.nearbyDinoId = closestId
    const weights = zoneWeights(this.vehicle.position.x, this.vehicle.position.z)
    const [bestZone, bestWeight] = (Object.entries(weights) as [ZoneId, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))
    // Histéresis: solo se cambia de zona cuando se está claramente dentro de otra.
    if (bestWeight > 0.55) this.zoneId = bestZone
  }

  render(): void {
    this.sky.followCamera(this.camera)
    this.renderer.render(this.scene, this.camera)
  }

  startLoop(onFrame: (info: FrameInfo) => void, getInput: () => VehicleInput): void {
    const frame: FrameInfo = { nearbyDinoId: null, zoneId: this.zoneId }
    const loop = () => {
      this.update(getInput())
      frame.nearbyDinoId = this.nearbyDinoId
      frame.zoneId = this.zoneId
      onFrame(frame)
      this.render()
      this.frameId = requestAnimationFrame(loop)
    }
    this.frameId = requestAnimationFrame(loop)
  }

  stopLoop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  dispose(): void {
    this.stopLoop()
    this.sky.dispose()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      }
    })
    this.renderer.dispose()
  }
}
