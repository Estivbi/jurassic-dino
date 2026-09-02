import * as THREE from 'three'

/** Ruido barato basado en senos, suficiente para ondular el terreno sin depender de librerías externas. */
function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.05) * Math.cos(z * 0.045) * 1.4 +
    Math.sin(x * 0.13 + z * 0.07) * 0.5 +
    Math.sin(z * 0.02) * 0.8
  )
}

const colorA = new THREE.Color('#0e2f1c')
const colorB = new THREE.Color('#173d24')
const colorC = new THREE.Color('#0a2216')

function pseudoRandom(x: number, z: number): number {
  const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return v - Math.floor(v)
}

export function buildTerrain(size = 320, segments = 100): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors: number[] = []
  const tmpColor = new THREE.Color()

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = heightAt(x, z)
    position.setY(i, y)

    const mix = pseudoRandom(Math.floor(x), Math.floor(z))
    tmpColor.copy(colorA).lerp(colorB, mix)
    if (mix > 0.85) tmpColor.lerp(colorC, 0.6)
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.name = 'terrain'
  return mesh
}

export function heightAtPosition(x: number, z: number): number {
  return heightAt(x, z)
}
