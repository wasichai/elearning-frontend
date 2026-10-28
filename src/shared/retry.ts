import { ApiError } from '@wasichai/core'

// solo se reintenta lo que pudo ser la red (fetch lanza TypeError). un 4xx, un 5xx o un contrato roto se muestran
// enseguida, con su botón de reintentar: repetirlos solos no arregla nada y retrasa el mensaje
export function retryNetwork(failures: number, error: unknown): boolean {
  return failures < 2 && !(error instanceof ApiError) && error instanceof TypeError
}
