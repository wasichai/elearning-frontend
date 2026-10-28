// cuánto de un vídeo se ha reproducido de verdad (RF-AUL-04): la suma de los tramos de HTMLMediaElement.played sobre
// la duración. Es la reproducción, no la posición: saltar al final no suma lo que no se vio
export function playedFraction(video: Pick<HTMLMediaElement, 'duration' | 'played'>): number {
  const { duration, played } = video
  if (!Number.isFinite(duration) || duration <= 0) return 0
  let seconds = 0
  for (let i = 0; i < played.length; i++) seconds += played.end(i) - played.start(i)
  return Math.min(seconds / duration, 1)
}

// si lo reproducido alcanza el umbral. Con el umbral en el final (1) nunca: entonces completa el evento ended, porque
// timeupdate no siempre llega con el último instante
export function watchedEnough(video: Pick<HTMLMediaElement, 'duration' | 'played'>, threshold: number): boolean {
  return threshold < 1 && playedFraction(video) >= threshold
}
