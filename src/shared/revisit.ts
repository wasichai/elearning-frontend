import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

// pulsar en el menú la pantalla ya abierta lleva a la misma ruta: react-router no la vuelve a montar (la consulta no se
// relee al montar) y solo cambia location.key. con esto la lista se pide otra vez; al montar ya la pide TanStack Query
export function useRefetchOnRevisit(refetch: () => unknown) {
  const { key } = useLocation()
  const seen = useRef(key)
  useEffect(() => {
    if (seen.current === key) return
    seen.current = key
    void refetch()
  }, [key, refetch])
}
