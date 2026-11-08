// la marca: un monograma tipográfico «c» de Newsreader en un cuadrado de la marca, en los tokens del tema. decorativa: el nombre
// del producto es el texto accesible
export function ColofonMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={`shrink-0 ${className}`}>
      <rect width="28" height="28" rx="3" fill="var(--brand)" />
      <text
        x="14"
        y="21"
        textAnchor="middle"
        fill="var(--on-brand)"
        fontFamily="Newsreader, Georgia, serif"
        fontSize="24"
        fontWeight="520"
        style={{ fontOpticalSizing: 'auto' }}
      >
        c
      </text>
    </svg>
  )
}
