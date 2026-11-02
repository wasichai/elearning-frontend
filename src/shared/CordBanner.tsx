// la banda de cordones de un curso (docs/design-system/components/CourseCard): un quipu generado con una semilla (el slug o
// el código), así cada curso tiene un patrón propio y estable sin necesidad de imagen. es decorativa: no representa avance
// ni dato alguno, y por eso no usa los colores de estado sino tinta y marca sobre un fondo apagado
// sin escalar: el dibujo se recorta por la derecha según el ancho, así los nudos miden lo mismo y nunca se cortan por abajo
const WIDTH = 1920
const CORD_GAP = 44
const KNOT_RADIUS = 4

function hash(seed: string): number {
  let value = 2166136261
  for (let index = 0; index < seed.length; index++) value = Math.imul(value ^ seed.charCodeAt(index), 16777619)
  return value >>> 0
}

// generador pequeño y determinista (mulberry32): la misma semilla, el mismo patrón en cada pantalla
function random(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export interface CordBannerProps {
  seed: string
  // alto del dibujo en px; el ancho sigue al contenedor
  height?: number
  className?: string
}

export function CordBanner({ seed, height = 96, className = '' }: CordBannerProps) {
  const next = random(hash(seed))
  const count = Math.floor(WIDTH / CORD_GAP)
  const top = 16
  const bottom = height - KNOT_RADIUS - 2
  const cords = Array.from({ length: count }, (_, index) => {
    const x = CORD_GAP * (index + 0.5) + (next() - 0.5) * 14
    const length = top + (bottom - top) * (0.35 + next() * 0.65)
    // de arriba abajo y separados: cada nudo se distingue
    const slots = Math.max(1, Math.floor((length - top) / (KNOT_RADIUS * 3)))
    const knots: { y: number; accent: boolean }[] = []
    for (let y = top + next() * KNOT_RADIUS; y <= length && knots.length < Math.min(slots, 3); y += KNOT_RADIUS * 3 + next() * 12)
      knots.push({ y, accent: next() > 0.75 })
    return { x, length, knots }
  })
  return (
    <svg aria-hidden="true" data-slot="cord-banner" style={{ height }} className={`block w-full overflow-hidden bg-surface-muted ${className}`}>
      <path d={`M0 8H${WIDTH}`} stroke="var(--ink-muted)" strokeWidth="2.5" />
      {cords.map((cord) => (
        <g key={cord.x}>
          <path d={`M${cord.x} 8V${cord.length}`} stroke="var(--border-control)" strokeWidth="1.5" strokeLinecap="round" />
          {cord.knots.map((knot) => (
            <circle key={knot.y} cx={cord.x} cy={knot.y} r={KNOT_RADIUS} fill={knot.accent ? 'var(--brand)' : 'var(--ink-muted)'} />
          ))}
        </g>
      ))}
    </svg>
  )
}
