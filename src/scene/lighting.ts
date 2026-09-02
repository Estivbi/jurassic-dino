import * as THREE from 'three'
import type { QualitySettings } from './quality'

export interface LightingRig {
  headlights: THREE.Group
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

  const headlights = new THREE.Group()
  headlights.name = 'headlights'

  const leftLight = new THREE.SpotLight('#ffd9a0', 10, quality.fogFar * 0.8, Math.PI / 7, 0.5, 1.4)
  leftLight.position.set(-0.6, 0.6, 0.4)
  const leftTarget = new THREE.Object3D()
  leftTarget.position.set(-0.6, 0.2, -8)
  leftLight.target = leftTarget

  const rightLight = leftLight.clone()
  rightLight.position.set(0.6, 0.6, 0.4)
  const rightTarget = new THREE.Object3D()
  rightTarget.position.set(0.6, 0.2, -8)
  rightLight.target = rightTarget

  headlights.add(leftLight, leftTarget, rightLight, rightTarget)

  return { headlights, moon }
}
