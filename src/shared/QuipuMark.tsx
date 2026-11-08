// la marca (docs/design-system/historico-quipu/assets/Logos): el cordón principal con tres cuerdas y sus nudos, en los tokens del tema
export function QuipuMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={`shrink-0 ${className}`}>
      <path d="M3 7h22" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7v15M14 7v11M20 7v17" stroke="var(--border-control)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="13" r="3" fill="var(--brand)" />
      <circle cx="14" cy="16" r="3" fill="var(--maiz, var(--brand))" />
      <circle cx="20" cy="12" r="3" fill="var(--success)" />
      <circle cx="20" cy="20" r="3" fill="var(--success)" />
    </svg>
  )
}
