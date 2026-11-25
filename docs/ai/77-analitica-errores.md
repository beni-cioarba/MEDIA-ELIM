# 77 · Plan: analítica sin cookies y registro de errores

> **Estado** (19/11/2026): aprobado e **implementado** (`core/telemetry/`).
> - **GoatCounter: activo** — sitio `elim` (`TELEMETRY_CONFIG.goatCounterCode`).
>   Empieza a contar con el primer despliegue.
> - **Sentry: activo** — proyecto «Browser JavaScript», organización en la
>   región **UE** (`ingest.de.sentry.io`), sólo *Error monitoring* (sin
>   tracing, replay, logs ni métricas, a propósito). DSN en `sentryDsn`.
>   Verificado el 19/11/2026: un error de prueba real llegó (200), con versión
>   y patrón de ruta, sin `request` ni `user`.
>
> Lo que sigue (§ 1-3) es el plan aprobado; § 4 describe lo construido.

## 1. Qué tiene que responder

Hoy no se sabe qué se usa ni qué falla: las regresiones se descubren en el
templo (`76-plan-maestro.md`, problema 10). Lo mínimo que hace falta saber:

| Pregunta | Para decidir |
| --- | --- |
| Qué páginas se visitan, y cuáles nadie | Qué módulos crecen y cuáles sobran (§ 5 del plan maestro) |
| De dónde llega la gente: QR de invitați, WhatsApp, Google | Si el QR y las tarjetas compartidas funcionan |
| Móvil o escritorio, app instalada (PWA) o navegador, ro o es | Dónde invertir diseño; si merece la pena la URL en español |
| Cuántos abren la lectura de Împreună y activan el aviso de las 08:00 | Si el proyecto engancha |
| Qué errores hay, en qué versión y en qué página | Arreglar antes de que lo vea el templo |

No hace falta saber **quién**: nada que identifique a una persona.

## 2. Restricciones

1. **Sin backend**: el servicio es de un tercero, llamado desde el navegador.
2. **Sin cookies ni identificadores persistentes**: así no hay banner de
   consentimiento. Es lo más defendible ante la AEPD; con cookies de analítica
   haría falta consentimiento previo, y un banner en una web de iglesia cuesta
   más confianza de la que aporta.
3. **Datos en la UE**, y los terceros listados en la página legal
   (`core/legal.config.ts` → `THIRD_PARTY_SERVICES`).
4. **Cero coste en el arranque**: se carga en reposo, después del primer
   pintado; nunca en el bundle inicial (128 kB transfer hoy).
5. **Fuera**: las herramientas del operador (panel, ventana de proyección,
   hojas de imprimir), `localhost` y el prerender. La proyección del templo no
   cuenta como visita.
6. **Gratis o casi**: es una iglesia.

## 3. Recomendación

### Analítica: **GoatCounter**

- Sin cookies ni almacenamiento en el navegador, no guarda la IP (la usa en
  memoria para el país y la sesión), código abierto y autoalojable. Datos en
  Hetzner (Finlandia y Alemania). Gratis para «uso público razonable» (web
  personal o pyme); sus condiciones avisan con dos semanas de cualquier cambio.
- **Sin su script**: la web llama a `GET https://elim.goatcounter.com/count`
  (el mismo endpoint que su píxel; parámetros `p`, `t`, `r`, `s`, `e`,
  `rnd`, ver goatcounter.com/help/pixel) con una petición de imagen.
- Cuenta páginas, referentes, tamaño de pantalla, idioma del navegador; y
  **eventos** con nombre (los de § 1).
- Descartados: **Google Analytics** (cookies → banner, datos fuera de la UE);
  **Cloudflare Web Analytics** (exige el dominio en Cloudflare o su script, y
  datos en EE. UU.); **Plausible** (muy bueno y en la UE, pero de pago: la
  alternativa si GoatCounter se queda corto).

### Errores: **Sentry** (plan gratuito, región de datos UE)

- Agrupa los errores, dice en qué versión empezaron (la de
  `generate-version.mjs`) y avisa por correo. El plan gratuito da un cupo de
  errores al mes de sobra para esta web; confirmar al dar de alta.
- SDK `@sentry/browser` **cargado en reposo** (`import()` dinámico, chunk
  propio de ~25 kB comprimido), sin *session replay* ni trazas de rendimiento.
- `beforeSend` quita lo personal: URL de datos (`botezuri/<persona>`,
  `anunturi/<id>`) normalizadas a su patrón, sin IP (`sendDefaultPii: false`).
- Alternativa sin SDK: **GlitchTip** (compatible con el protocolo de Sentry,
  autoalojable). Sólo si Sentry cambia sus condiciones.

## 4. Lo construido

El enganche era el previsto: `AppErrorHandler` → `LoggerService.error` →
`TelemetryService`, un solo sitio.

| Pieza | Qué hace |
| --- | --- |
| `telemetry.config.ts` | `TELEMETRY_CONFIG` (token con `factory`): `goatCounterCode`, `sentryDsn`. `null` = servicio apagado |
| `telemetry.ts` | Puras y probadas: `routeKey()` (ruta real, o **patrón** si la página es `noindex`; `tool` si `data.preload: false`), `isTrackableHost`, `externalReferrer` (sin parámetros), `goatCounterUrl`, `firstError` |
| `telemetry.service.ts` | Activo sólo en navegador + producción + dominio publicado + sin `navigator.webdriver` (el smoke test no cuenta). `pageView`/`event`: `new Image()` en reposo, con `referrerPolicy: no-referrer`; herramientas fuera. `error`: como mucho 10 por carga; las herramientas **sí** reportan |
| `sentry-reporter.ts` | Chunk propio (29 kB transferidos) que se importa **sólo cuando hay un error**. Sin integraciones por defecto (ni migas, ni captura global, ni URL ni cabeceras): pila, versión (`elim@<release>+<commit>`), patrón de ruta, navegador |
| `provide-telemetry.ts` | `NavigationEnd` → `pageView(routeKey(...))`. El router se lee aquí: `TelemetryService` no puede depender de él (lo usa el `ErrorHandler`) |

**Qué va a Sentry**: sólo los `log.error` que llevan un `Error`. Los fallos
de red (`HttpErrorResponse`: YouTube sin cuota, sin conexión) no lo son y no
gastan cupo.

**Eventos** (GoatCounter, sección «eventos» de su panel):
`mod-…` (censo: desde la app o el navegador), `app-instalata`, `app-declarata`,
`instalare-…` (todos en `79-install.md`), `aviz-activat-<tema>` (PushService),
`citire-deschisa` (lectura de la Biblia abierta), `limba-ro` / `limba-es`
(el visitante elige idioma). Uno nuevo: `inject(TelemetryService).event('nombre')`,
en rumano y con guiones, sin `/` delante.

**Legal**: `goatcounter` y `sentry` en `THIRD_PARTY_SERVICES`, filtrados por
`TELEMETRY_CONFIG`; con la analítica activa la frase «no seguimos las
visitas» pasa a `legal.data.no_tracking_counted` («contamos las visitas de
forma anónima, sin cookies ni IP»).

**Coste**: +3,4 kB en el arranque (482 kB raw / 130 kB transfer). El service
worker precachea el chunk de Sentry como todos los demás (precarga total,
decisión 7.5 del plan maestro).

**Verificado** (19/11/2026): 258 tests; build servido bajo un dominio de
prueba con las peticiones interceptadas (no llegaron a GoatCounter):
`/despre-noi` y `/program` con título; un botez como
`/botezuri/:date/:candidate` sin título; `/media/ecran` nada; navegación
interna contada; ninguna petición con `Referer`.

### Source maps (pila legible)

- `angular.json` → producción: `sourceMap: { scripts: true, hidden: true }`.
  Mapas **ocultos**: ningún `.js` los referencia.
- `scripts/sentry-sourcemaps.mjs` (paso «Sentry source maps» de
  `deploy.yml`, justo tras el build): con `SENTRY_AUTH_TOKEN` los sube con
  `sentry-cli sourcemaps upload --release <sentryRelease> --url-prefix ~/`
  (organización y proyecto: los ID numéricos del DSN, `sentryTarget()`);
  con o sin subida, **borra los `.map`** de lo publicado. Un fallo de la
  subida avisa y no para el despliegue.
- Emparejamiento **por versión + nombre de fichero**, no por *debug ID*: el
  build de Angular marca cada fichero con `//# debugId=` pero sin el
  registro en tiempo de ejecución que lee el SDK, y `sentry-cli inject` no lo
  añade a ficheros ya marcados (probado con sentry-cli 3.8). La versión es una
  sola función, `core/telemetry/release.ts`, para la web y el script.
- Comprobar tras el primer despliegue con token: en Sentry, *Settings →
  Projects → elim → Source Maps* debe listar `elim@<versión>+<commit>`; un
  error nuevo debe mostrar nombres de fichero `src/app/…`.

## 5. Pendiente del usuario

- ~~Aprobar~~ (19/11/2026) · ~~cuenta de GoatCounter~~ (sitio `elim`):
  verificar su correo en GoatCounter.
- ~~Sentry~~ (DSN puesto). Recomendado: activar en el proyecto *Prevent
  Storing of IP Addresses* (el SDK ya no envía usuario ni IP; esto lo
  garantiza en el servidor, pase lo que pase con el SDK).
- **No** seguir la guía genérica de Sentry («Copy Prompt», Loader Script,
  `@sentry/angular`): su base activa *tracing* y propone replay, que el plan y
  la página legal no contemplan.
- **Source maps**: el código está listo (abajo); falta el secreto
  `SENTRY_AUTH_TOKEN` en GitHub. Sin él, los errores llegan minificados.
- Decidir quién recibe los avisos de error por correo (en Sentry).
