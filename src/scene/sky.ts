import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import moonUrl from '@assets/textures/moon.webp?url'
import skyCatalogUrl from '@assets/sky/sky-catalog.json?url'
import type { CelestialState } from './celestial'

/** Radio al que se dibujan estrellas/luna: da igual cuál sea porque se proyectan contra el plano lejano. */
const SKY_RADIUS = 40
/** La Luna real subtiende ~0,52°; se amplía un poco para que se aprecie la fase en pantallas pequeñas. */
const MOON_ANGULAR_DIAMETER_DEG = 3

interface SkyCatalog {
  /** [ar°, dec°, magnitud, índice de color B-V] aplanado. */
  stars: number[]
  constellations: { id: string; name: string; pos: [number, number]; rank: number; lines: [number, number][][] }[]
}

function equatorialVector(raDeg: number, decDeg: number, out = new THREE.Vector3()): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg)
  const dec = THREE.MathUtils.degToRad(decDeg)
  return out.set(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec))
}

/** Color aproximado de una estrella a partir de su índice B-V (azuladas < 0 < blancas < 1 < anaranjadas). */
function starColor(bv: number, out: THREE.Color): THREE.Color {
  const t = THREE.MathUtils.clamp((bv + 0.3) / 2.0, 0, 1)
  if (t < 0.25) return out.setRGB(0.66, 0.78, 1).lerp(new THREE.Color(1, 1, 1), t / 0.25)
  return out.setRGB(1, 1, 1).lerp(new THREE.Color(1, 0.72, 0.45), (t - 0.25) / 0.75)
}

// Proyecta en el plano lejano como hace Sky.js, para que cualquier cosa del mundo tape el cielo.
const FAR_PLANE_VERTEX = /* glsl */ `
  uniform mat3 uEqToWorld;
  vec4 skyProject(vec3 eqDir, float radius) {
    vec3 worldDir = normalize(uEqToWorld * eqDir);
    vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + worldDir * radius, 1.0);
    p.z = p.w;
    return p;
  }
`

function buildStars(catalog: SkyCatalog, uniforms: Record<string, THREE.IUniform>): THREE.Points {
  const count = catalog.stars.length / 4
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const seeds = new Float32Array(count)
  const v = new THREE.Vector3()
  const c = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const [ra, dec, mag, bv] = catalog.stars.slice(i * 4, i * 4 + 4)
    equatorialVector(ra, dec, v).toArray(positions, i * 3)
    starColor(bv, c).toArray(colors, i * 3)
    // Magnitud → tamaño/brillo: cada 5 magnitudes la estrella es 100 veces más débil.
    sizes[i] = Math.pow(10, -0.4 * (mag - 1.0))
    seeds[i] = Math.random() * 100
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aFlux', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${FAR_PLANE_VERTEX}
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aFlux;
      attribute float aSeed;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_Position = skyProject(position, ${SKY_RADIUS.toFixed(1)});
        vec3 worldDir = normalize(uEqToWorld * position);
        // Extinción atmosférica: cerca del horizonte las estrellas se apagan y centellean más.
        float altitude = worldDir.y;
        float extinction = smoothstep(-0.02, 0.25, altitude);
        float twinkle = 0.75 + 0.25 * sin(uTime * (2.0 + mod(aSeed, 3.0)) + aSeed) * (1.0 - extinction * 0.6);
        float flux = clamp(aFlux, 0.0, 6.0);
        gl_PointSize = (2.0 + sqrt(flux) * 3.4) * uPixelRatio;
        vAlpha = clamp(0.35 + flux * 1.2, 0.0, 1.0) * extinction * twinkle;
        vColor = color;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uVisibility;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float glow = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(vColor * (glow * glow * 1.6 + (1.0 - smoothstep(0.0, 0.35, d)) * 1.4) * vAlpha * uVisibility * 2.4, 1.0);
        #include <colorspace_fragment>
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 1
  return points
}

function buildConstellationLines(catalog: SkyCatalog, uniforms: Record<string, THREE.IUniform>): THREE.LineSegments {
  const verts: number[] = []
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (const con of catalog.constellations) {
    for (const line of con.lines) {
      for (let i = 0; i < line.length - 1; i++) {
        equatorialVector(line[i][0], line[i][1], a)
        equatorialVector(line[i + 1][0], line[i + 1][1], b)
        verts.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      ${FAR_PLANE_VERTEX}
      varying float vAlt;
      void main() {
        gl_Position = skyProject(position, ${(SKY_RADIUS * 0.99).toFixed(2)});
        vAlt = normalize(uEqToWorld * position).y;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLinesOpacity;
      varying float vAlt;
      void main() {
        gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * uLinesOpacity * smoothstep(-0.02, 0.08, vAlt), 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const lines = new THREE.LineSegments(geometry, material)
  lines.frustumCulled = false
  lines.renderOrder = 1
  lines.visible = false
  return lines
}

/** Cúpula aditiva con el azul del cielo nocturno y el resplandor del crepúsculo (Sky.js se queda en negro). */
function buildNightDome(uniforms: Record<string, THREE.IUniform>): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + position, 1.0);
        p.z = p.w;
        gl_Position = p;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      uniform float uMoonLight;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 zenith = vec3(0.004, 0.009, 0.028);
        vec3 horizon = vec3(0.018, 0.03, 0.06);
        vec3 col = mix(horizon, zenith, pow(h, 0.5)) * (1.0 + uMoonLight * 2.5);
        gl_FragColor = vec4(col * uNight, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS * 0.9, 24, 12), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 0
  return mesh
}

function buildMoon(uniforms: Record<string, THREE.IUniform>): THREE.Mesh {
  const texture = new THREE.TextureLoader().load(moonUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uMap: { value: texture } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      void main() {
        vUv = uv;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        p.z = p.w;
        gl_Position = p;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSunDir;
      uniform float uMoonDaylight;
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      void main() {
        // Más contraste para que los mares lunares se distingan de las tierras altas.
        vec3 albedo = pow(texture2D(uMap, vUv).rgb, vec3(1.7)) * 1.8;
        // La fase sale sola: el hemisferio lunar iluminado es el que mira al Sol real.
        float lit = smoothstep(-0.03, 0.12, dot(normalize(vNormalWorld), uSunDir));
        float earthshine = 0.035;
        vec3 col = albedo * (lit * 0.8 + earthshine);
        // La parte iluminada tapa el cielo; la cara oscura deja verlo (con un leve brillo
        // de la Tierra). De día la Luna se ve pálida, medio fundida con el azul.
        float alpha = max(lit, 0.05) * uMoonDaylight;
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    fog: false,
  })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material)
  moon.frustumCulled = false
  moon.renderOrder = 2
  return moon
}

export interface ConstellationLabel {
  id: string
  name: string
  /** Posición en pantalla normalizada (0-1), solo si está por encima del horizonte y a la vista. */
  x: number
  y: number
}

export interface SkyLightingState {
  /** 0 = noche cerrada, 1 = pleno día. */
  daylight: number
  /** 0 = de día, 1 = noche (para faros, estrellas...). */
  night: number
}

/**
 * Cielo físico (dispersión atmosférica de Sky.js con nubes), cúpula nocturna, estrellas y
 * constelaciones reales del catálogo Yale/Hipparcos, y la Luna en su posición y fase reales.
 * También genera el mapa de entorno (IBL) a partir del propio cielo cada vez que cambia.
 */
export class SkySystem {
  readonly group = new THREE.Group()
  private sky = new Sky()
  private envSky = new Sky()
  private envScene = new THREE.Scene()
  private pmrem: THREE.PMREMGenerator
  private envTarget: THREE.WebGLRenderTarget | null = null
  private lastEnvSunAlt = Number.NaN
  private lastEnvAt = -Infinity
  private moon: THREE.Mesh
  private stars: THREE.Points | null = null
  private constellationLines: THREE.LineSegments | null = null
  private catalog: SkyCatalog | null = null
  private eqToWorld = new THREE.Matrix3()
  private tmpVec = new THREE.Vector3()
  private tmpVec2 = new THREE.Vector3()
  private showConstellations = false

  private uniforms: Record<string, THREE.IUniform> = {
    uEqToWorld: { value: new THREE.Matrix3() },
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uVisibility: { value: 0 },
    uLinesOpacity: { value: 0 },
    uNight: { value: 0 },
    uMoonLight: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDaylight: { value: 1 },
  }

  private scene: THREE.Scene

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.scene = scene
    this.pmrem = new THREE.PMREMGenerator(renderer)
    this.uniforms.uPixelRatio.value = renderer.getPixelRatio()

    const skyUniforms = this.sky.material.uniforms
    skyUniforms.turbidity.value = 4
    skyUniforms.rayleigh.value = 1.6
    skyUniforms.mieCoefficient.value = 0.004
    skyUniforms.mieDirectionalG.value = 0.8
    skyUniforms.cloudCoverage.value = 0.38
    skyUniforms.cloudDensity.value = 0.55
    skyUniforms.cloudElevation.value = 0.55
    skyUniforms.cloudScale.value = 0.00022
    skyUniforms.cloudSpeed.value = 0.00012
    this.sky.scale.setScalar(SKY_RADIUS)
    this.sky.frustumCulled = false
    this.sky.renderOrder = -10
    this.group.add(this.sky)

    // El cielo del mapa de entorno comparte uniforms con el visible, pero sin disco solar
    // (el sol ya lo pone la luz direccional; un punto de 700 unidades daría brillos raros).
    this.envSky.material.uniforms = { ...skyUniforms, showSunDisc: { value: 0 } }
    this.envSky.scale.setScalar(SKY_RADIUS)
    this.envScene.add(this.envSky)
    const envNight = buildNightDome(this.uniforms)
    this.envScene.add(envNight)

    this.group.add(buildNightDome(this.uniforms))
    this.moon = buildMoon(this.uniforms)
    this.group.add(this.moon)
    scene.add(this.group)

    fetch(skyCatalogUrl)
      .then((r) => r.json() as Promise<SkyCatalog>)
      .then((catalog) => {
        this.catalog = catalog
        this.stars = buildStars(catalog, this.uniforms)
        this.constellationLines = buildConstellationLines(catalog, this.uniforms)
        this.constellationLines.visible = this.showConstellations
        this.group.add(this.stars, this.constellationLines)
      })
      .catch((error) => console.error('No se pudo cargar el catálogo de estrellas:', error))
  }

  setConstellationsVisible(visible: boolean): void {
    this.showConstellations = visible
    if (this.constellationLines) this.constellationLines.visible = visible
  }

  update(state: CelestialState, lighting: SkyLightingState, elapsed: number): void {
    const [sx, sy, sz] = state.sunDir
    const sunVec = this.tmpVec.set(sx, sy, sz)
    this.sky.material.uniforms.sunPosition.value.copy(sunVec)
    this.sky.material.uniforms.time.value = elapsed
    ;(this.uniforms.uSunDir.value as THREE.Vector3).copy(sunVec)
    this.eqToWorld.fromArray(state.equatorialToWorld)
    ;(this.uniforms.uEqToWorld.value as THREE.Matrix3).copy(this.eqToWorld)
    this.uniforms.uTime.value = elapsed
    this.uniforms.uNight.value = lighting.night
    const moonUp = THREE.MathUtils.smoothstep(state.moonAltitudeDeg, -2, 6)
    this.uniforms.uMoonLight.value = moonUp * state.moonFraction
    // Las estrellas empiezan a verse con el Sol ~6° bajo el horizonte (fin del crepúsculo civil).
    this.uniforms.uVisibility.value = THREE.MathUtils.smoothstep(-state.sunAltitudeDeg, 4, 14) * (1 - 0.5 * moonUp * state.moonFraction)
    this.uniforms.uLinesOpacity.value = (this.uniforms.uVisibility.value as number) * 0.55
    // De día la Luna se ve pálida: su brillo se suma a un cielo ya brillante.
    this.uniforms.uMoonDaylight.value = 0.35 + 0.65 * lighting.night

    const [mx, my, mz] = state.moonDir
    this.moon.visible = state.moonAltitudeDeg > -2
    this.moon.userData.dir = this.tmpVec2.set(mx, my, mz)
    this.maybeUpdateEnvironment(state.sunAltitudeDeg, elapsed)
  }

  /** Coloca la Luna respecto a la cámara (tiene que hacerse justo antes de renderizar). */
  followCamera(camera: THREE.Camera): void {
    // Sky.js calcula la dirección de vista desde su centro: tiene que ir pegado a la cámara.
    this.sky.position.copy(camera.position)
    const dir = this.moon.userData.dir as THREE.Vector3 | undefined
    if (!dir) return
    const radius = SKY_RADIUS * 0.95
    this.moon.position.copy(camera.position).addScaledVector(dir, radius)
    this.moon.scale.setScalar(radius * Math.tan(THREE.MathUtils.degToRad(MOON_ANGULAR_DIAMETER_DEG / 2)))
    // La cara visible de la textura (longitud 0) mira a la Tierra.
    this.moon.lookAt(camera.position)
    this.moon.rotateY(-Math.PI / 2)
  }

  /** Etiquetas de constelaciones visibles, en coordenadas de pantalla normalizadas. */
  getConstellationLabels(camera: THREE.PerspectiveCamera): ConstellationLabel[] {
    if (!this.catalog || !this.showConstellations || (this.uniforms.uVisibility.value as number) < 0.2) return []
    const labels: ConstellationLabel[] = []
    const v = new THREE.Vector3()
    const forward = camera.getWorldDirection(new THREE.Vector3())
    for (const con of this.catalog.constellations) {
      if (con.rank > 2) continue
      equatorialVector(con.pos[0], con.pos[1], v).applyMatrix3(this.eqToWorld)
      if (v.y < 0.08 || v.dot(forward) < 0.2) continue
      v.multiplyScalar(SKY_RADIUS).add(camera.position).project(camera)
      if (Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) continue
      labels.push({ id: con.id, name: con.name, x: (v.x + 1) / 2, y: (1 - v.y) / 2 })
    }
    return labels
  }

  private maybeUpdateEnvironment(sunAltitudeDeg: number, elapsed: number): void {
    // Regenerar el PMREM cuesta unos milisegundos: solo cuando el Sol se ha movido algo
    // (o cada minuto, para que las nubes del reflejo no se queden congeladas).
    const changedEnough = Number.isNaN(this.lastEnvSunAlt) || Math.abs(sunAltitudeDeg - this.lastEnvSunAlt) > 0.6
    if (!changedEnough && elapsed - this.lastEnvAt < 60) return
    this.lastEnvSunAlt = sunAltitudeDeg
    this.lastEnvAt = elapsed
    const previous = this.envTarget
    this.envTarget = this.pmrem.fromScene(this.envScene, 0, 0.1, 100)
    this.scene.environment = this.envTarget.texture
    previous?.dispose()
  }

  dispose(): void {
    this.envTarget?.dispose()
    this.pmrem.dispose()
  }
}
