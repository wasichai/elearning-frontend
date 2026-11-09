import { useCallback, useEffect, useState } from 'react'

// la altura de un elemento que crece con su contenido (un aviso, el zoom de texto), para colocar lo que va pegado debajo de él.
// ref es un ref callback: si el nodo cambia (otro elemento, o se desmonta y vuelve), se vuelve a observar.
// sin ResizeObserver (jsdom) queda sin medir y quien la usa pone su respaldo
export function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number>()
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((element: T | null) => setNode(element), [])
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => entry && setHeight(entry.target.getBoundingClientRect().height))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return { ref, height }
}
