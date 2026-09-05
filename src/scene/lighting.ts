import * as THREE from 'three'
import type { QualitySettings } from './quality'

export interface LightingRig {
  moon: THREE.DirectionalLight
}

const FOG_COLOR = new THREE.Color('#1a301f')

export function buildLighting(scene: THREE.Scene, quality: QualitySettings): LightingRig {
  scene.fog = new THREE.FogExp2(FOG_COLOR, 1.35 / quality.fogFar)
  scene.background = FOG_COLOR.clone()

  const hemi = new THREE.HemisphereLight('#2c4a5c', '#1c3524', 1.15)
  scene.add(hemi)

  const moon = new THREE.DirectionalLight('#cfe0ea', 0.9)
  moon.position.set(-30, 60, -20)
  if (quality.shadows) {
    moon.castShadow = true
    moon.shadow.mapSize.set(1024, 1024)
    moon.shadow.camera.near = 10
    moon.shadow.camera.far = 150
    moon.shadow.camera.left = -40
    moon.shadow.camera.right = 40
    moon.shadow.camera.top = 40
    moon.shadow.camera.bottom = -40
    moon.shadow.bias = -0.002
  }
  scene.add(moon)
  scene.add(moon.target)

  return { moon }
}
