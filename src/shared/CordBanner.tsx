// la banda de cordones de un curso (docs/design-system/components/CourseCard): un quipu generado con una semilla (el slug o
// el código), así cada curso tiene un patrón propio y estable sin necesidad de imagen. es decorativa: no representa avance
// ni dato alguno, y por eso no usa los colores de estado sino tinta y marca sobre un fondo apagado
const WIDTH = 480

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
  const count = 9 + Math.floor(next() * 8)
  const gap = WIDTH / (count + 1)
  const cords = Array.from({ length: count }, (_, index) => {
    const x = gap * (index + 1)
    const length = height * (0.42 + next() * 0.46)
    const knots = Array.from({ length: 1 + Math.floor(next() * 3) }, () => ({ y: 14 + next() * (length - 16), accent: next() > 0.72 }))
    return { x, length, knots }
  })
  return (
    <svg
      aria-hidden="true"
      data-slot="cord-banner"
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="xMidYMin slice"
      style={{ height }}
      className={`block w-full bg-surface-muted ${className}`}
    >
      <path d={`M0 8H${WIDTH}`} stroke="var(--ink-muted)" strokeWidth="2.5" />
      {cords.map((cord) => (
        <g key={cord.x}>
          <path d={`M${cord.x} 8V${cord.length}`} stroke="var(--border-control)" strokeWidth="1.5" strokeLinecap="round" />
          {cord.knots.map((knot) => (
            <circle key={knot.y} cx={cord.x} cy={knot.y} r="4" fill={knot.accent ? 'var(--brand)' : 'var(--ink-muted)'} />
          ))}
        </g>
      ))}
    </svg>
  )
}
