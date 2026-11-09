import { useEffect, useState } from 'react'

const MINUTE = 60_000

// el instante actual, que no se queda congelado al montar: se refresca cada minuto y al volver a la pestaña (una pestaña en segundo plano
// frena los temporizadores). si sigue en el mismo minuto conserva el valor anterior y no vuelve a pintar
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const refresh = () => {
      const next = Date.now()
      setNow((previous) => (Math.floor(next / MINUTE) === Math.floor(previous / MINUTE) ? previous : next))
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = setInterval(refresh, MINUTE)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}
