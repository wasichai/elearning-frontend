import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

// no salir de un toque con algo a medias. el router de @wasichai/core es un BrowserRouter, sin useBlocker: se interceptan los clics en
// enlaces internos antes de que lleguen al Link, y beforeunload cubre recargar o cerrar. el botón «atrás» del navegador no se puede parar
export function useLeaveGuard(active: boolean) {
  const navigate = useNavigate()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      event.preventDefault()
      event.stopPropagation()
      setTarget(`${url.pathname}${url.search}${url.hash}`)
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [active])

  return {
    leaving: target !== null,
    stay: () => setTarget(null),
    leave: () => {
      if (target) void navigate(target)
      setTarget(null)
    }
  }
}
