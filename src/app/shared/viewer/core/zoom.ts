/**
 * Zoom del visor documental, en porcentaje sobre el tamaño ajustado
 * (100 = «Ajustat»). Lo comparten el shell (botones, atajos) y los motores
 * (rueda, doble clic, pellizco), que calculan el punto que queda quieto con
 * el mismo tope que luego aplica el shell.
 */
export const ZOOM_MIN = 25;
export const ZOOM_MAX = 400;
/** Paso de los botones y de `+` / `-`. */
export const ZOOM_STEP = 25;

export function clampZoom(percent: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, percent));
}
