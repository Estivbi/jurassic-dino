import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import waterNormalsUrl from '@assets/textures/water_normals.webp?url'
import { LAKE, WATER_LEVEL } from './constants'

export interface Lake {
  mesh: THREE.Mesh
  update: (dt: number, sunDir: THREE.Vector3, sunColor: THREE.Color, daylight: number) => void
}

function loadNormals(): THREE.Texture {
  const normals = new THREE.TextureLoader().load(waterNormalsUrl)
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping
  return normals
}

/**
 * Lago con agua reflectante. En calidad alta usa `Water` de three.js (reflejo real del cielo,
 * los árboles y los dinosaurios); en móviles modestos, un material físico con el mapa de
 * entorno del cielo, que cuesta una fracción.
 */
export function buildLake(scene: THREE.Scene, highQuality: boolean): Lake {
  // Un poco más grande que la cuenca: lo que sobra queda enterrado bajo la orilla.
  const geometry = new THREE.CircleGeometry(LAKE.radius * 1.35, 64)
  geometry.rotateX(-Math.PI / 2)

  if (highQuality) {
    const water = new Water(geometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: loadNormals(),
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x0f2e2a,
      distortionScale: 2.2,
      fog: scene.fog !== undefined,
      alpha: 1,
    })
    water.position.set(LAKE.x, WATER_LEVEL, LAKE.z)
    water.name = 'lake'
    const uniforms = water.material.uniforms
    uniforms.size.value = 2.2
    return {
      mesh: water,
      update: (dt, sunDir, sunColor, daylight) => {
        uniforms.time.value += dt * 0.6
        uniforms.sunDirection.value.copy(sunDir)
        uniforms.sunColor.value.copy(sunColor).multiplyScalar(0.25 + 0.75 * daylight)
      },
    }
  }

  const normals = loadNormals()
  normals.repeat.set(6, 6)
  const material = new THREE.MeshPhysicalMaterial({
    color: '#123b36',
    roughness: 0.08,
    metalness: 0,
    transmission: 0,
    normalMap: normals,
    normalScale: new THREE.Vector2(0.35, 0.35),
    envMapIntensity: 1.2,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(LAKE.x, WATER_LEVEL, LAKE.z)
  mesh.name = 'lake'
  return {
    mesh,
    update: (dt) => {
      normals.offset.x += dt * 0.012
      normals.offset.y += dt * 0.007
    },
  }
}
