import { useEffect } from 'react'

// el título de la pestaña mientras se ve una pantalla, y el de antes al salir. @wasichai/core solo sincroniza el nombre de la app
// (syncDocumentTitle), no ofrece el de cada pantalla. lo usan el aula (la lección abierta) y el certificado (el nombre del archivo al
// «guardar como PDF»)
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
