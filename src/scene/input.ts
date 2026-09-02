export interface InputState {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
}

export function createInputState(): InputState {
  return { forward: false, back: false, left: false, right: false }
}

const KEY_MAP: Record<string, keyof InputState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

/** Escucha WASD/flechas y muta `state` directamente (sin re-renders de React: se lee cada frame del loop de three.js). */
export function attachKeyboardControls(state: InputState): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const key = KEY_MAP[event.code]
    if (!key) return
    state[key] = true
    event.preventDefault()
  }
  const onKeyUp = (event: KeyboardEvent) => {
    const key = KEY_MAP[event.code]
    if (!key) return
    state[key] = false
  }
  const onBlur = () => {
    state.forward = false
    state.back = false
    state.left = false
    state.right = false
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
  }
}
