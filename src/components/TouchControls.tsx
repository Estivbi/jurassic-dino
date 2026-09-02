import type { InputState } from '@scene/input'

interface Props {
  pressTouch: (key: keyof InputState, pressed: boolean) => void
}

function TouchButton({
  label,
  onSet,
}: {
  label: string
  onSet: (pressed: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="touch-control flex h-16 w-16 select-none items-center justify-center rounded-full border-2 border-[var(--amber-500)]/50 bg-black/40 text-2xl text-[var(--cream)] backdrop-blur-sm active:bg-black/60"
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        onSet(true)
      }}
      onPointerUp={() => onSet(false)}
      onPointerLeave={() => onSet(false)}
      onPointerCancel={() => onSet(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

export function TouchControls({ pressTouch }: Props) {
  return (
    <div className="touch-controls pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
      <div className="pointer-events-auto flex gap-3">
        <TouchButton label="◀" onSet={(p) => pressTouch('left', p)} />
        <TouchButton label="▶" onSet={(p) => pressTouch('right', p)} />
      </div>
      <div className="pointer-events-auto flex gap-3">
        <TouchButton label="▼" onSet={(p) => pressTouch('back', p)} />
        <TouchButton label="▲" onSet={(p) => pressTouch('forward', p)} />
      </div>
    </div>
  )
}
