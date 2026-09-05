import * as THREE from 'three'
import type { QualitySettings } from './quality'

export interface LightingRig {
  hemi: THREE.HemisphereLight
  sun: THREE.DirectionalLight
}

/** Crea las luces y la niebla; los colores/intensidades reales los aplica cada frame el ciclo día-noche. */
export function buildLighting(scene: THREE.Scene, quality: QualitySettings): LightingRig {
  scene.fog = new THREE.FogExp2('#1a301f', 1.35 / quality.fogFar)
  scene.background = new THREE.Color('#1a301f')

  const hemi = new THREE.HemisphereLight('#2c4a5c', '#1c3524', 1.15)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight('#cfe0ea', 0.9)
  sun.position.set(-30, 60, -20)
  if (quality.shadows) {
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 10
    sun.shadow.camera.far = 150
    sun.shadow.camera.left = -40
    sun.shadow.camera.right = 40
    sun.shadow.camera.top = 40
    sun.shadow.camera.bottom = -40
    sun.shadow.bias = -0.002
  }
  scene.add(sun)
  scene.add(sun.target)

  return { hemi, sun }
}
