import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

export const gltfLoader = new GLTFLoader()
gltfLoader.setMeshoptDecoder(MeshoptDecoder)

export const textureLoader = new THREE.TextureLoader()

export function loadTexture(url: string, options: { srgb?: boolean; repeat?: boolean } = {}): THREE.Texture {
  const tex = textureLoader.load(url)
  tex.colorSpace = options.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  if (options.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/**
 * Los GLB optimizados con meshopt guardan las posiciones cuantizadas (enteros normalizados) y
 * compensan con la escala del nodo. Para hornear transformaciones en la geometría (instancing,
 * deformaciones en shader) hace falta pasarlas antes a Float32.
 */
export function toFloatGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  for (const [name, attr] of Object.entries(source.attributes)) {
    const a = attr as THREE.BufferAttribute
    const array = new Float32Array(a.count * a.itemSize)
    for (let i = 0; i < a.count; i++) {
      for (let c = 0; c < a.itemSize; c++) array[i * a.itemSize + c] = a.getComponent(i, c)
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(array, a.itemSize))
  }
  if (source.index) geometry.setIndex(Array.from(source.index.array))
  return geometry
}

/**
 * Geometría de un mesh del GLB con su transformación de nodo horneada (en el espacio de `root`).
 * Si es un SkinnedMesh se hornea también la pose del esqueleto: muchos modelos exportados desde
 * FBX guardan los vértices en otra escala y es el armazón (con escala 0,01, p. ej.) el que los
 * coloca en su sitio.
 */
export function bakedGeometry(mesh: THREE.Mesh, root: THREE.Object3D): THREE.BufferGeometry {
  root.updateMatrixWorld(true)
  const relative = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld)
  const geometry = toFloatGeometry(mesh.geometry)
  if (mesh instanceof THREE.SkinnedMesh) {
    mesh.skeleton.update()
    const position = geometry.attributes.position as THREE.BufferAttribute
    const v = new THREE.Vector3()
    for (let i = 0; i < position.count; i++) {
      mesh.getVertexPosition(i, v)
      position.setXYZ(i, v.x, v.y, v.z)
    }
    geometry.deleteAttribute('skinIndex')
    geometry.deleteAttribute('skinWeight')
    geometry.applyMatrix4(relative)
    geometry.computeVertexNormals()
    return geometry
  }
  geometry.applyMatrix4(relative)
  return geometry
}

/** RNG determinista (mulberry32) para que el parque salga igual en cada visita. */
export function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function disposeTexture(texture: THREE.Texture): void {
  // Las texturas de un render target (el reflejo del agua, p. ej.) solo se liberan con él.
  const target = (texture as THREE.Texture & { renderTarget?: THREE.RenderTarget | null }).renderTarget
  if (target) target.dispose()
  else texture.dispose()
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) disposeTexture(value)
  }
  if (material instanceof THREE.ShaderMaterial) {
    for (const uniform of Object.values(material.uniforms)) {
      if (uniform.value instanceof THREE.Texture) disposeTexture(uniform.value)
    }
  }
  material.dispose()
}

/** Libera en la GPU geometrías, materiales, texturas y render targets de todo un subárbol. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const renderable = obj as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }
    renderable.geometry?.dispose()
    if (renderable.material) {
      const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
      materials.forEach(disposeMaterial)
    }
    if (obj instanceof THREE.Mesh && obj.customDepthMaterial) disposeMaterial(obj.customDepthMaterial)
  })
}
