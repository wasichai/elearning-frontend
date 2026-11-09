import { useEffect, useRef, useState } from 'react'

// la altura de un elemento que crece con su contenido (un aviso, el zoom de texto), para colocar lo que va pegado debajo de él.
// sin ResizeObserver (jsdom) queda sin medir y quien la usa pone su respaldo
export function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number>()
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => entry && setHeight(entry.target.getBoundingClientRect().height))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, height }
}
