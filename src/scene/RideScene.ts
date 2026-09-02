import * as THREE from 'three'
import type { DinoData, QualityLevel } from '@ride-types/ride'
import { getQualitySettings, type QualitySettings } from './quality'
import { getRideFrame, buildRoadMesh } from './path'
import { buildTerrain } from './terrain'
import { buildLighting, type LightingRig } from './lighting'
import { buildVegetation } from './vegetation'
import { buildDinosaurs, type DinoInstance } from './dinosaurs'

export class RideScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private jeep = new THREE.Group()
  private lighting: LightingRig
  private dinoInstances: DinoInstance[]
  private dinoLookups: { t: number; position: THREE.Vector3 }[]
  private quality: QualitySettings
  private frameId: number | null = null
  private timer = new THREE.Timer()

  // temporales reutilizados para no asignar memoria cada frame
  private tmpLookTarget = new THREE.Vector3()
  private tmpDinoFocus = new THREE.Vector3()
  private tmpUp = new THREE.Vector3(0, 1, 0)

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

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, this.quality.fogFar + 20)
    this.jeep.add(this.camera)
    this.scene.add(this.jeep)

    this.lighting = buildLighting(this.scene, this.quality)
    this.jeep.add(this.lighting.headlights)

    this.scene.add(buildTerrain())
    this.scene.add(buildRoadMesh())
    buildVegetation(this.scene, this.quality.vegetationCount)
    this.dinoInstances = buildDinosaurs(this.scene, dinos)
    this.dinoLookups = dinos.map((dino, i) => ({ t: dino.stopT, position: this.dinoInstances[i].group.position }))

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

  /** Coloca el jeep/cámara en un punto del recorrido (0..1) y anima al resto de la escena. */
  setProgress(t: number): void {
    const { position, tangent } = getRideFrame(t)
    this.timer.update()
    const elapsed = this.timer.getElapsed()

    const bob = Math.sin(elapsed * 5.5) * 0.02
    const sway = Math.sin(elapsed * 1.7) * 0.03

    this.jeep.position.set(position.x + sway, position.y + 1.7 + bob, position.z)

    this.tmpLookTarget.copy(this.jeep.position).addScaledVector(tangent, 10)

    // Al llegar a una parada, la mirada gira suavemente hacia el dinosaurio en vez de seguir mirando al frente.
    let nearestDist = Infinity
    let nearestPos: THREE.Vector3 | null = null
    for (const lookup of this.dinoLookups) {
      const d = Math.abs(lookup.t - t)
      if (d < nearestDist) {
        nearestDist = d
        nearestPos = lookup.position
      }
    }
    const focusRange = 0.045
    if (nearestPos && nearestDist < focusRange) {
      const blend = 1 - nearestDist / focusRange
      this.tmpDinoFocus.copy(nearestPos).y += 1.6
      this.tmpLookTarget.lerp(this.tmpDinoFocus, blend * blend)
    }

    this.camera.up.copy(this.tmpUp)
    this.camera.lookAt(this.tmpLookTarget)

    for (const dino of this.dinoInstances) dino.animate(elapsed)
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  startLoop(onFrame?: () => void): void {
    const loop = () => {
      onFrame?.()
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
