// la marca: un monograma «c» en un cuadrado de la marca, en los tokens del tema. la «c» es un trazado, no texto: así la marca no depende
// de que cargue Newsreader. decorativa: el nombre del producto es el texto accesible
export function ColofonMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={`shrink-0 ${className}`}>
      <rect width="28" height="28" rx="3" fill="var(--brand)" />
      <path d="M19.6 9.6A6.5 6.5 0 1 0 19.6 18.4" fill="none" stroke="var(--on-brand)" strokeWidth="3.2" strokeLinecap="butt" />
    </svg>
  )
}
