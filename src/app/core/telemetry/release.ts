/**
 * Nombre de la versión en Sentry: `elim@<MAYOR.MENOR.PARCHE>+<commit>`.
 *
 * Una sola definición para los dos lados que tienen que coincidir: la web lo
 * pone en cada error (`TelemetryService`) y el despliegue sube los source
 * maps con él (`scripts/sentry-sourcemaps.mjs`, que lee este fichero). Si no
 * coinciden, Sentry no sabe qué mapas usar y la pila llega minificada.
 *
 * Sin imports: lo carga también Node.
 */
export function sentryRelease(version: { readonly release: string; readonly commit: string }): string {
  return `elim@${version.release}+${version.commit}`;
}

/** Organización y proyecto (sus ID numéricos) a partir del DSN. */
export function sentryTarget(dsn: string): { readonly org: string; readonly project: string } | null {
  const match = /^https:\/\/[^@]+@o(\d+)\.ingest\.[^/]+\/(\d+)$/.exec(dsn);
  return match ? { org: match[1], project: match[2] } : null;
}
