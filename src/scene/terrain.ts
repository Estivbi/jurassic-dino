import * as THREE from 'three'
import { TERRAIN_SIZE } from './constants'
import { blendZoneColor } from './zones'

/** Ruido barato basado en senos, suficiente para ondular el terreno sin depender de librerías externas. */
function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.035) * Math.cos(z * 0.03) * 2.2 +
    Math.sin(x * 0.09 + z * 0.05) * 0.7 +
    Math.sin(z * 0.015) * 1.1
  )
}

function pseudoRandom(x: number, z: number): number {
  const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return v - Math.floor(v)
}

export function buildTerrain(size = TERRAIN_SIZE, segments = 180): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors: number[] = []
  const tmpColor = new THREE.Color()
  const zoneColor = new THREE.Color()

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = heightAt(x, z)
    position.setY(i, y)

    blendZoneColor(x, z, (zone) => zone.groundTint, zoneColor)
    const variation = pseudoRandom(Math.floor(x), Math.floor(z))
    tmpColor.copy(zoneColor).lerp(zoneColor.clone().multiplyScalar(0.75), variation)
    if (variation > 0.9) tmpColor.multiplyScalar(0.6)
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

/** Superficie de agua plana y semitransparente para la zona de la laguna. */
export function buildLagoon(centerX: number, centerZ: number, radius: number): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(radius, 48)
  geometry.rotateX(-Math.PI / 2)
  const material = new THREE.MeshStandardMaterial({
    color: '#12414a',
    transparent: true,
    opacity: 0.82,
    roughness: 0.15,
    metalness: 0.2,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(centerX, heightAt(centerX, centerZ) - 0.6, centerZ)
  mesh.name = 'lagoon'
  return mesh
}
