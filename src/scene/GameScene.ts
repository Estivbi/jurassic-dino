import * as THREE from 'three'
import type { DinoData, QualityLevel } from '@ride-types/ride'
import { getQualitySettings, type QualitySettings } from './quality'
import { buildTerrain, buildLagoon, heightAtPosition } from './terrain'
import { buildLighting, type LightingRig } from './lighting'
import { buildVegetation } from './vegetation'
import { buildDinosaurs, type DinoInstance } from './dinosaurs'
import { Vehicle, type VehicleInput } from './vehicle'
import { WORLD_BOUNDS } from './constants'
import { zones } from './zones'
import { createDayNightController, type DayNightController } from './dayNightCycle'

const PROXIMITY_RADIUS = 13

export interface MinimapSnapshot {
  player: { x: number; z: number; heading: number }
  dinos: { id: string; x: number; z: number; color: string }[]
}

export class GameScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private lighting: LightingRig
  private dinoInstances: DinoInstance[]
  private dinoColors = new Map<string, string>()
  private vehicle: Vehicle
  private quality: QualitySettings
  private dayNight: DayNightController
  private frameId: number | null = null
  private timer = new THREE.Timer()
  private nearbyDinoId: string | null = null

  private tmpDesiredCam = new THREE.Vector3()
  private tmpLookTarget = new THREE.Vector3()
  private tmpForward = new THREE.Vector3()
  private tmpSkyColor = new THREE.Color()

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
    this.renderer.toneMappingExposure = 1.4

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, this.quality.fogFar + 20)

    this.lighting = buildLighting(this.scene, this.quality)
    this.dayNight = createDayNightController()

    this.scene.add(buildTerrain())
    const lagunaZone = zones.find((z) => z.id === 'laguna')!
    this.scene.add(buildLagoon(lagunaZone.corner[0] * 0.55, lagunaZone.corner[1] * 0.55, 32))
    buildVegetation(this.scene, this.quality.vegetationCount)
    this.dinoInstances = buildDinosaurs(this.scene, dinos)
    for (const dino of dinos) this.dinoColors.set(dino.id, dino.accent)

    const startY = heightAtPosition(0, 6)
    this.vehicle = new Vehicle(new THREE.Vector3(0, startY, 6), Math.PI)
    this.scene.add(this.vehicle.model.group)

    this.resize()
  }

  resize(): void {
    const canvas = this.renderer.domElement
    const parent = canvas.parentElement
    const width = parent?.clientWidth ?? window.innerWidth
    const height = parent?.clientHeight ?? window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
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
    // Sincroniza el modelo visible de inmediato: si el bucle está en pausa (input a cero
    // porque hay una ficha abierta), vehicle.update() no se ejecutaría hasta el próximo frame.
    this.vehicle.model.group.position.copy(this.vehicle.position)
    this.vehicle.model.group.rotation.y = this.vehicle.heading
  }

  /** Expuesto para depuración manual: posición actual de un dinosaurio por id. */
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

  update(input: VehicleInput): void {
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.1)
    const elapsed = this.timer.getElapsed()

    this.vehicle.update(input, dt, heightAtPosition, WORLD_BOUNDS)

    this.tmpForward.copy(this.vehicle.forwardVector())
    this.tmpDesiredCam.copy(this.vehicle.position).addScaledVector(this.tmpForward, -6.5)
    this.tmpDesiredCam.y += 3.4
    const camLerp = Math.min(1, dt * 5)
    this.camera.position.lerp(this.tmpDesiredCam, camLerp)

    this.tmpLookTarget.copy(this.vehicle.position).addScaledVector(this.tmpForward, 5)
    this.tmpLookTarget.y += 1.1
    this.camera.lookAt(this.tmpLookTarget)

    const sky = this.dayNight.getSkyState()

    this.lighting.sun.position.copy(this.vehicle.position)
    this.lighting.sun.position.x -= 30
    this.lighting.sun.position.z -= 20
    this.lighting.sun.position.y += sky.sunHeight
    this.lighting.sun.target.position.copy(this.vehicle.position)
    this.lighting.sun.color.set(sky.sunColor)
    this.lighting.sun.intensity = sky.sunIntensity

    this.lighting.hemi.color.set(sky.hemiSky)
    this.lighting.hemi.groundColor.set(sky.hemiGround)
    this.lighting.hemi.intensity = sky.hemiIntensity

    this.renderer.toneMappingExposure = sky.exposure

    this.tmpSkyColor.set(sky.sky)
    if (this.scene.fog) {
      const fog = this.scene.fog as THREE.FogExp2
      fog.color.copy(this.tmpSkyColor)
      fog.density = (1.35 / this.quality.fogFar) * sky.fogDensityScale
    }
    ;(this.scene.background as THREE.Color).copy(this.tmpSkyColor)

    let closestId: string | null = null
    let closestDist = PROXIMITY_RADIUS
    for (const dino of this.dinoInstances) {
      dino.update(dt, elapsed)
      const dist = dino.group.position.distanceTo(this.vehicle.position)
      if (dist < closestDist) {
        closestDist = dist
        closestId = dino.id
      }
    }
    this.nearbyDinoId = closestId
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  startLoop(onFrame: (nearbyDinoId: string | null) => void, getInput: () => VehicleInput): void {
    const loop = () => {
      this.update(getInput())
      onFrame(this.nearbyDinoId)
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
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      }
    })
    this.renderer.dispose()
  }
}
