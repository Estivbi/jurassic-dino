import * as THREE from 'three'
import type { QualitySettings } from './quality'

export interface LightingRig {
  moon: THREE.DirectionalLight
}

const FOG_COLOR = new THREE.Color('#0a1c15')

export function buildLighting(scene: THREE.Scene, quality: QualitySettings): LightingRig {
  scene.fog = new THREE.FogExp2(FOG_COLOR, 1.9 / quality.fogFar)
  scene.background = FOG_COLOR

  const hemi = new THREE.HemisphereLight('#16283a', '#0a1f14', 0.75)
  scene.add(hemi)

  const moon = new THREE.DirectionalLight('#a9c4d8', 0.5)
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
