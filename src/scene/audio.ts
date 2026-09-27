/**
 * Sonido del jeep sintetizado con Web Audio (no descarga ningún archivo): el motor, que
 * cambia con la velocidad y el acelerador, y los golpes al chocar o al aterrizar.
 *
 * Las voces de los dinosaurios se descartaron: sintetizadas no sonaban a animal y ningún
 * sonido de dinosaurio se ha conservado. Para recuperarlas harían falta grabaciones reales
 * de animales actuales (con licencia libre) mezcladas, como se hace en el cine.
 */

export interface EngineState {
  /** Velocidad del jeep en m/s (con signo). */
  speed: number
  /** Si se está pisando el acelerador. */
  throttle: boolean
}

export class Soundscape {
  private ctx: AudioContext
  private master: GainNode
  private noise: AudioBuffer
  private engineOscA: OscillatorNode
  private engineOscB: OscillatorNode
  private engineFilter: BiquadFilterNode
  private engineGain: GainNode
  private lastImpactAt = -Infinity
  private muted = false

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.ratio.value = 4
    compressor.connect(ctx.destination)
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(compressor)

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    // Motor: dos osciladores graves y ruido de rodadura, filtrados según el acelerador.
    this.engineGain = ctx.createGain()
    this.engineGain.gain.value = 0
    this.engineFilter = ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 300
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.master)
    this.engineOscA = ctx.createOscillator()
    this.engineOscA.type = 'sawtooth'
    this.engineOscB = ctx.createOscillator()
    this.engineOscB.type = 'square'
    const oscBGain = ctx.createGain()
    oscBGain.gain.value = 0.5
    this.engineOscA.connect(this.engineFilter)
    this.engineOscB.connect(oscBGain).connect(this.engineFilter)
    const rumble = ctx.createBufferSource()
    rumble.buffer = this.noise
    rumble.loop = true
    const rumbleFilter = ctx.createBiquadFilter()
    rumbleFilter.type = 'bandpass'
    rumbleFilter.frequency.value = 180
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0.5
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(this.engineFilter)
    rumble.start()
    this.engineOscA.start()
    this.engineOscB.start()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.1)
  }

  isMuted(): boolean {
    return this.muted
  }

  update(state: EngineState): void {
    const now = this.ctx.currentTime
    // El motor sube de tono con la velocidad y suena más abierto al acelerar.
    const speed = Math.abs(state.speed)
    const throttle = state.throttle ? 1 : 0
    const rpm = 34 + speed * 3.1 + throttle * 7
    this.engineOscA.frequency.setTargetAtTime(rpm, now, 0.12)
    this.engineOscB.frequency.setTargetAtTime(rpm * 0.5, now, 0.12)
    this.engineFilter.frequency.setTargetAtTime(220 + throttle * 380 + speed * 18, now, 0.15)
    this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05 + (speed / 19) * 0.04, now, 0.2)
  }

  /**
   * Golpe del jeep: un "bum" grave de la carrocería, el crujido del impacto y un tintineo
   * metálico. `strength` es la velocidad del choque en m/s.
   */
  impact(strength: number): void {
    const ctx = this.ctx
    const t = ctx.currentTime + 0.01
    // Evita que un roce continuo contra un tronco suene como una ametralladora.
    if (t - this.lastImpactAt < 0.25) return
    this.lastImpactAt = t
    const level = Math.min(1, 0.25 + strength / 10)

    const thud = ctx.createOscillator()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(95, t)
    thud.frequency.exponentialRampToValueAtTime(38, t + 0.25)
    const thudGain = ctx.createGain()
    thudGain.gain.setValueAtTime(1.4 * level, t)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    thud.connect(thudGain).connect(this.master)
    thud.start(t)
    thud.stop(t + 0.4)

    const crunch = ctx.createBufferSource()
    crunch.buffer = this.noise
    const crunchFilter = ctx.createBiquadFilter()
    crunchFilter.type = 'bandpass'
    crunchFilter.frequency.value = 900
    crunchFilter.Q.value = 0.9
    const crunchGain = ctx.createGain()
    crunchGain.gain.setValueAtTime(1.0 * level, t)
    crunchGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    crunch.connect(crunchFilter).connect(crunchGain).connect(this.master)
    crunch.start(t, Math.random())
    crunch.stop(t + 0.2)

    // Chapa y piezas sueltas: parciales inarmónicos que se apagan rápido.
    if (strength > 3) {
      for (const freq of [1130, 1720, 2610]) {
        const ping = ctx.createOscillator()
        ping.type = 'triangle'
        ping.frequency.value = freq * (0.95 + Math.random() * 0.1)
        const pingGain = ctx.createGain()
        pingGain.gain.setValueAtTime(0.06 * level, t)
        pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
        ping.connect(pingGain).connect(this.master)
        ping.start(t)
        ping.stop(t + 0.32)
      }
    }
  }

  dispose(): void {
    this.engineOscA.stop()
    this.engineOscB.stop()
    void this.ctx.close()
  }
}
