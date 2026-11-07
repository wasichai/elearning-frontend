// las iniciales de una persona, para recorrer una lista de un vistazo. decorativas: el nombre o el correo ya están en el texto.
// de un nombre, las dos primeras palabras sin lo que va entre paréntesis («Diego Docente (demo)» → DD); de un correo, su parte local
// («ana.torres@…» → AT)
export function initialsOf(text: string): string {
  const base = text.includes('@') ? text.slice(0, text.indexOf('@')) : text.replace(/\(.*?\)/g, ' ')
  return base
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toLocaleUpperCase())
    .join('')
}

export function Initials({ of, className = 'size-10 text-sm' }: { of: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="avatar"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong ${className}`}
    >
      {initialsOf(of)}
    </span>
  )
}
