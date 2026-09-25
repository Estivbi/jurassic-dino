import type { DinoVoice } from '@ride-types/ride'

/**
 * Paisaje sonoro sintetizado con Web Audio: no descarga ningún archivo.
 *
 * Ningún sonido de dinosaurio se ha conservado, así que las voces son reconstrucciones
 * inspiradas en sus parientes vivos (aves y cocodrilos) y en animales grandes actuales:
 * retumbos graves con la boca cerrada, bramidos, gruñidos de cocodrilo, reclamos de ave...
 */

export interface ListenerPose {
  position: { x: number; y: number; z: number }
  forward: { x: number; y: number; z: number }
}

export interface AmbienceState {
  /** Velocidad del jeep en m/s (con signo). */
  speed: number
  /** Si se está pisando el acelerador. */
  throttle: boolean
  /** 0 de día, 1 de noche. */
  night: number
  /** Distancia del jeep a la orilla del lago en metros (0 dentro). */
  lakeDistance: number
}

const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class Soundscape {
  private ctx: AudioContext
  private master: GainNode
  private sfx: GainNode
  private noise: AudioBuffer
  private engineOscA: OscillatorNode
  private engineOscB: OscillatorNode
  private engineFilter: BiquadFilterNode
  private engineGain: GainNode
  private windFilter: BiquadFilterNode
  private windGain: GainNode
  private waterGain: GainNode
  private nextCricketAt = 0
  private nextGustAt = 0
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
    this.sfx = ctx.createGain()
    this.sfx.connect(this.master)

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
    const rumble = this.loopNoise()
    const rumbleFilter = ctx.createBiquadFilter()
    rumbleFilter.type = 'bandpass'
    rumbleFilter.frequency.value = 180
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0.5
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(this.engineFilter)
    this.engineOscA.start()
    this.engineOscB.start()

    // Viento: ruido grave con ráfagas lentas.
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'lowpass'
    this.windFilter.frequency.value = 500
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0.02
    this.loopNoise().connect(this.windFilter).connect(this.windGain).connect(this.master)

    // Agua junto al lago: ruido de banda media que se oye al acercarse a la orilla.
    const waterFilter = ctx.createBiquadFilter()
    waterFilter.type = 'bandpass'
    waterFilter.frequency.value = 900
    waterFilter.Q.value = 0.6
    this.waterGain = ctx.createGain()
    this.waterGain.gain.value = 0
    this.loopNoise().connect(waterFilter).connect(this.waterGain).connect(this.master)
  }

  private loopNoise(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    src.loopStart = Math.random()
    src.start(0, Math.random() * 2)
    return src
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.1)
  }

  isMuted(): boolean {
    return this.muted
  }

  update(listener: ListenerPose, state: AmbienceState): void {
    const ctx = this.ctx
    const now = ctx.currentTime
    const l = ctx.listener
    if (l.positionX) {
      l.positionX.setTargetAtTime(listener.position.x, now, 0.05)
      l.positionY.setTargetAtTime(listener.position.y, now, 0.05)
      l.positionZ.setTargetAtTime(listener.position.z, now, 0.05)
      l.forwardX.setTargetAtTime(listener.forward.x, now, 0.05)
      l.forwardY.setTargetAtTime(listener.forward.y, now, 0.05)
      l.forwardZ.setTargetAtTime(listener.forward.z, now, 0.05)
      l.upX.value = 0
      l.upY.value = 1
      l.upZ.value = 0
    } else {
      // Safari antiguo: API sin AudioParams.
      l.setPosition(listener.position.x, listener.position.y, listener.position.z)
      l.setOrientation(listener.forward.x, listener.forward.y, listener.forward.z, 0, 1, 0)
    }

    // El motor sube de tono con la velocidad y suena más abierto al acelerar.
    const speed = Math.abs(state.speed)
    const throttle = state.throttle ? 1 : 0
    const rpm = 34 + speed * 3.1 + throttle * 7
    this.engineOscA.frequency.setTargetAtTime(rpm, now, 0.12)
    this.engineOscB.frequency.setTargetAtTime(rpm * 0.5, now, 0.12)
    this.engineFilter.frequency.setTargetAtTime(220 + throttle * 380 + speed * 18, now, 0.15)
    this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05 + (speed / 19) * 0.04, now, 0.2)

    if (now >= this.nextGustAt) {
      this.nextGustAt = now + 2 + Math.random() * 4
      this.windGain.gain.setTargetAtTime(0.012 + Math.random() * 0.03, now, 1.5)
      this.windFilter.frequency.setTargetAtTime(300 + Math.random() * 500, now, 1.5)
    }
    this.waterGain.gain.setTargetAtTime(0.06 * (1 - smooth(state.lakeDistance, 4, 45)), now, 0.4)

    // Grillos de noche (los insectos que cantan ya existían en el Mesozoico).
    if (state.night > 0.4 && now >= this.nextCricketAt) {
      this.nextCricketAt = now + 0.35 + Math.random() * 0.9
      this.cricket(now, state.night)
    }
  }

  private cricket(t: number, night: number): void {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.frequency.value = 4200 + Math.random() * 900
    const gain = ctx.createGain()
    gain.gain.value = 0
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 2 - 1
    osc.connect(gain).connect(pan).connect(this.master)
    const level = 0.012 * night * (0.4 + Math.random() * 0.6)
    const pulses = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < pulses; i++) {
      const start = t + i * 0.055
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(level, start + 0.008)
      gain.gain.linearRampToValueAtTime(0, start + 0.035)
    }
    osc.start(t)
    osc.stop(t + pulses * 0.055 + 0.05)
    osc.onended = () => pan.disconnect()
  }

  /** Reproduce la voz de un animal en una posición del mundo (audio 3D). */
  playCall(voice: DinoVoice, position: { x: number; y: number; z: number }, size: number): void {
    const ctx = this.ctx
    const t = ctx.currentTime + 0.05
    const panner = ctx.createPanner()
    panner.panningModel = 'equalpower'
    panner.distanceModel = 'inverse'
    panner.refDistance = 4 + size * 0.5
    panner.maxDistance = 250
    panner.rolloffFactor = 1
    if (panner.positionX) {
      panner.positionX.value = position.x
      panner.positionY.value = position.y + 1.5
      panner.positionZ.value = position.z
    } else {
      panner.setPosition(position.x, position.y + 1.5, position.z)
    }
    panner.connect(this.sfx)
    // Los animales grandes tienen la voz más grave.
    const pitch = Math.min(1.6, Math.max(0.55, Math.pow(10 / Math.max(size, 1), 0.25)))
    let duration = 2
    switch (voice) {
      case 'boom':
        duration = this.boom(t, pitch, panner)
        break
      case 'bellow':
        duration = this.bellow(t, pitch, panner)
        break
      case 'croc':
        duration = this.croc(t, pitch, panner)
        break
      case 'chirp':
        duration = this.chirp(t, pitch, panner)
        break
      case 'grunt':
        duration = this.grunt(t, pitch, panner)
        break
      case 'splash':
        duration = this.splash(t, panner)
        break
    }
    window.setTimeout(() => panner.disconnect(), (duration + 0.5) * 1000)
  }

  private envelope(t: number, attack: number, hold: number, release: number, level: number): GainNode {
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level, t + attack)
    gain.gain.setValueAtTime(level, t + attack + hold)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release)
    return gain
  }

  private saturator(amount: number): WaveShaperNode {
    const shaper = this.ctx.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1
      curve[i] = Math.tanh(amount * x)
    }
    shaper.curve = curve
    return shaper
  }

  private oscillator(type: OscillatorType, t: number, from: number, to: number, glide: number, stop: number): OscillatorNode {
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + glide)
    osc.start(t)
    osc.stop(t + stop)
    return osc
  }

  private noiseSource(t: number, stop: number): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    src.start(t, Math.random() * 1.5)
    src.stop(t + stop)
    return src
  }

  /** Retumbo grave con la boca cerrada (como avestruces o cocodrilos): T. rex, Megalosaurus. */
  private boom(t: number, pitch: number, out: AudioNode): number {
    const ctx = this.ctx
    const total = 3
    const env = this.envelope(t, 0.4, 1.3, 1.2, 0.9)
    const shaper = this.saturator(3)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    const throat = ctx.createGain()
    throat.gain.value = 0.7
    const lfo = this.oscillator('sine', t, 6.5, 5, total, total)
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.3
    lfo.connect(lfoDepth).connect(throat.gain)
    this.oscillator('sine', t, 46 * pitch, 34 * pitch, 2.4, total).connect(shaper)
    const second = ctx.createGain()
    second.gain.value = 0.5
    this.oscillator('triangle', t, 92 * pitch, 70 * pitch, 2.4, total).connect(second).connect(shaper)
    shaper.connect(filter).connect(throat).connect(env).connect(out)
    const breath = ctx.createBiquadFilter()
    breath.type = 'lowpass'
    breath.frequency.value = 160
    const breathGain = ctx.createGain()
    breathGain.gain.value = 0.25
    this.noiseSource(t, total).connect(breath).connect(breathGain).connect(env)
    return total
  }

  /** Bramido largo y profundo: saurópodos. */
  private bellow(t: number, pitch: number, out: AudioNode): number {
    const ctx = this.ctx
    const total = 4.2
    const env = this.envelope(t, 0.8, 2.2, 1.2, 0.7)
    const osc = this.oscillator('sawtooth', t, 58 * pitch, 44 * pitch, 3.5, total)
    const vibrato = this.oscillator('sine', t, 4.5, 4, total, total)
    const vibratoDepth = ctx.createGain()
    vibratoDepth.gain.value = 2.5 * pitch
    vibrato.connect(vibratoDepth).connect(osc.frequency)
    for (const [freq, q, gain] of [
      [230 * pitch, 1.4, 1],
      [520 * pitch, 2.5, 0.45],
    ] as const) {
      const formant = ctx.createBiquadFilter()
      formant.type = 'bandpass'
      formant.frequency.value = freq
      formant.Q.value = q
      const g = ctx.createGain()
      g.gain.value = gain
      osc.connect(formant).connect(g).connect(env)
    }
    env.connect(out)
    return total
  }

  /** Gruñido vibrante de cocodrilo (fritura vocal): espinosáuridos. */
  private croc(t: number, pitch: number, out: AudioNode): number {
    const ctx = this.ctx
    const total = 2
    const env = this.envelope(t, 0.12, 1.1, 0.7, 0.9)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 280 * pitch
    band.Q.value = 3
    const gate = ctx.createGain()
    gate.gain.value = 0.5
    const lfo = this.oscillator('square', t, 24, 18, total, total)
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.5
    lfo.connect(lfoDepth).connect(gate.gain)
    this.noiseSource(t, total).connect(band).connect(gate).connect(env)
    const body = ctx.createGain()
    body.gain.value = 0.5
    this.oscillator('sine', t, 75 * pitch, 60 * pitch, total, total).connect(body).connect(gate)
    env.connect(out)
    return total
  }

  /** Serie de reclamos de ave con siseo: dromeosáuridos como Velociraptor. */
  private chirp(t: number, pitch: number, out: AudioNode): number {
    const ctx = this.ctx
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const start = t + i * (0.2 + Math.random() * 0.08)
      const env = this.envelope(start, 0.015, 0.06, 0.08, 0.7)
      this.oscillator('sine', start, 2300 * pitch, 1250 * pitch, 0.14, 0.2).connect(env)
      const hiss = ctx.createBiquadFilter()
      hiss.type = 'bandpass'
      hiss.frequency.value = 3200
      const hissGain = ctx.createGain()
      hissGain.gain.value = 0.25
      this.noiseSource(start, 0.2).connect(hiss).connect(hissGain).connect(env)
      env.connect(out)
    }
    return count * 0.3 + 0.3
  }

  /** Dos gruñidos cortos y graves: grandes herbívoros como Triceratops. */
  private grunt(t: number, pitch: number, out: AudioNode): number {
    const ctx = this.ctx
    for (let i = 0; i < 2; i++) {
      const start = t + i * 0.75
      const env = this.envelope(start, 0.06, 0.25, 0.3, 0.8)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 650
      const shaper = this.saturator(2.5)
      this.oscillator('sawtooth', start, 105 * pitch, 72 * pitch, 0.55, 0.65).connect(shaper)
      shaper.connect(filter).connect(env).connect(out)
    }
    return 1.5
  }

  /** Chapoteo al salir a respirar: reptiles marinos. */
  private splash(t: number, out: AudioNode): number {
    const ctx = this.ctx
    for (const [delay, level] of [
      [0, 1.6],
      [0.35, 0.8],
    ] as const) {
      const start = t + delay
      const env = this.envelope(start, 0.01, 0.05, 0.5, level)
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.Q.value = 0.8
      band.frequency.setValueAtTime(1800, start)
      band.frequency.exponentialRampToValueAtTime(450, start + 0.5)
      this.noiseSource(start, 0.6).connect(band).connect(env).connect(out)
    }
    return 1
  }

  dispose(): void {
    this.engineOscA.stop()
    this.engineOscB.stop()
    void this.ctx.close()
  }
}
