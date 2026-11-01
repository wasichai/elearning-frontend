import { useSyncExternalStore } from 'react'

// el tema aplicado a la página (data-theme y color-scheme en <html>), al día: ThemeProvider lo escribe después de pintar
// los hijos, por eso se observa el atributo en vez de leerlo durante el render
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] })
  return () => observer.disconnect()
}

const snapshot = () => `${document.documentElement.dataset.theme ?? ''}|${document.documentElement.style.colorScheme}`

// cambia cada vez que cambia el tema de la página
export function useDocumentTheme(): string {
  return useSyncExternalStore(subscribe, snapshot)
}

export const isDarkTheme = (theme: string) => theme.endsWith('|dark')
