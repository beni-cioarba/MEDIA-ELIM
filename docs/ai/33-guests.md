# 33 · Invitați (página de bienvenida para quien nos visita)

> Lee este shard antes de tocar **`/invitati`**, su QR imprimible o los textos
> de bienvenida. Es una página **fuera del menú**: se llega por QR, tecleando
> la dirección o por un enlace discreto del pie.

## Qué es y por qué (09/11/2026)

Pedido del usuario: una página de bienvenida para quien viene por primera vez,
**sin menú propio** en la interfaz y accesible por QR o por la dirección (y,
pedido después, con un acceso sutil en el pie). Cuenta lo más importante de la
iglesia con calidez y resuelve las dudas reales de un recién llegado:
¿cuándo? → ¿qué va a pasar? → ¿quiénes son? → ¿con quién hablo? → ¿cómo llego?

| Ruta | Qué es |
| --- | --- |
| `/invitati` (o `/invitati/`) | La página, dentro del shell (cabecera, pie y barra de pestañas) |
| `/invitati?lang=es` | La misma, abierta en español (la abre el QR en español) |
| `/invitati/qr` | Hoja **imprimible** del QR: afiche A4 o 4 tarjetas A6 por A4. Sin shell |

## Cómo se mantiene «escondida»

- **Fuera de `MAIN_NAV`**: ni menú, ni cajón, ni pestañas, ni portadas de
  sección. La migaja no se pinta (ruta sin rastro en el menú) y el gesto de
  arrastrar entre pestañas no actúa (`TabNavService.activeIndex < 0`).
- **Un único acceso en la interfaz pública**: fila «Ești la prima vizită?»
  (icono `hand-heart`) en la columna «Vizitează-ne» del pie, junto a «cómo
  venir» (pedido del usuario, 09/11/2026).
- **`noindex`** (`RouteSeo.noindex`) en la SPA **y** en la página estática.
- La consola del operador (`/media/control`) tiene la tarjeta «Invitați»:
  abrir la página y la hoja del QR (en otra pestaña).

## Despliegue: la página responde 200, no 404

GitHub Pages no tiene rutas: un enlace profundo se sirve con `404.html`
(= `index.html`) **y estado HTTP 404**. Para un destino de QR eso no vale
(algunas vistas previas y lectores lo tratan como error). En el despliegue,
`scripts/generate-route-pages.mjs` escribe `invitati/index.html`: copia de
`index.html` con su `<title>`, descripción, Open Graph (`og:url` incluido) y
`<meta name="robots" content="noindex">`, leídos de `seo.guests.*` del rumano
(los mismos que pone `SeoService`). Así:

- `https://elimarganda.com/invitati/` responde **200** (el QR codifica la URL
  **con barra final** para ahorrarse la redirección 301 `/invitati` → `/invitati/`);
- al compartir el enlace por WhatsApp la tarjeta dice «Bine ai venit…».

Angular quita la barra final (`Location.stripTrailingSlash`): el router ve
`/invitati`. La lista de páginas estáticas vive en el script (`ROUTE_PAGES`).

**Verificado** sobre la compilación de producción con un servidor que imita a
GitHub Pages: `/invitati/` → 200, `/invitati` → 301 → `/invitati/`, otra ruta
→ 404 (fallback de siempre); la app arranca desde la copia (base `/`), en
rumano y con `?lang=es`. La copia sólo añade 209 bytes de metadatos.

## Idioma

La web es rumana por defecto y **no detecta el idioma del navegador**
(decisión del 18/10/2026). Aquí se respeta, con tres añadidos:

- selector **Română | Español** en la portada de la página (el de la
  cabecera es pequeño): quien no lee rumano lo encuentra a la primera;
- `?lang=es|ro` se aplica en el **resolver** (`guestsTranslationsResolver`),
  antes de pintar: sin claves sueltas ni parpadeo de rumano a español. Es una
  elección explícita (escanear el QR en español), así que se guarda;
- al cambiar de idioma desde la página, la URL se actualiza (`?lang=es` o sin
  parámetro): quien la comparta, la comparte en el idioma que ve.

Los textos que llevan datos (el mensaje de WhatsApp) se construyen con el pipe
`translate` en la plantilla, no con `instant` en un `computed`: el paquete del
idioma nuevo llega después del cambio (`TranslationPackService`) y el
`computed` se quedaba con el texto anterior.

## Secciones (de arriba abajo) y de dónde sale cada dato

Nada se inventa: todo sale de datos que la web ya publica.

| # | Sección | Fuente |
| --- | --- | --- |
| 1 | **Portada**: la congregación reunida (`aboutImage`), «Bine ai venit / *acasă*», selector de idioma, «Când ne vedem» (baja a la tarjeta) / «Cum ajungi» (Maps) | `aboutImage`, textos propios |
| 2 | **Próximo culto** (flota sobre la portada): en curso / hoy (cuenta atrás) / mañana / el día; **línea del domingo** si lo próximo no es domingo (es el culto al que se invita); eventos de hoy; «Adaugă în calendar» (`.ics` del próximo culto) y «Cum ajungi» | `ScheduleService.nextService`, `weeklyProgram`, `eventsByDate`, `CalendarService.downloadEvent` |
| 3 | **Índice** (chips; en el teléfono, una fila deslizable) | `GUEST_SECTIONS` |
| 4 | **Primii pași**: WhatsApp con mensaje ya escrito, cerere de rugăciune (WhatsApp), guardar el contacto de la iglesia (**vCard 3.0**), ver el directo | `contact.*`, `location.*`, `youtubeLiveUrl` |
| 5 | **Ce te așteaptă duminică**: 4 pasos + la Cina del Señor | `about.visit.*` (mismos textos que «Despre noi»: una fuente) |
| 6 | **Când ne adunăm**: la semana entera | `<app-week-schedule [showHead]="false">` (con los eventos del día) |
| 7 | **Cine suntem**: quiénes somos + años · miembros · aparținători (con fecha) | `home.welcome.*`, `foundedYear`, `STORY_FACTS` |
| 8 | **Oamenii pe care îi vei cunoaște**: pastor, pastor asistente y responsables de primire, con foto (visor) | `GUEST_HOSTS` → organigrama + manifiesto de fotos |
| 9 | **Un loc pentru fiecare vârstă**: los niños (a todo el ancho) y los 6 departamentos con página | `about.visit.items.family`, `DEPARTMENTS`, `departments.<id>.{name,tagline}` |
| 10 | **Ce urmează**: los 3 próximos eventos | `ScheduleService.upcomingEvents` (incluye los automáticos) |
| 11 | **Cum ajungi**: dirección (copiar), abrir en Maps, mapa | `location.*` (mismo mapa que Contact) |
| 12 | **Întrebări frecvente** (`<details>`; en escritorio, título fijo a la izquierda) | Sólo respuestas ya publicadas en la web |
| 13 | **Cierre**: versículo (Psalmul 122:1), «Te așteptăm» + domingo y dirección, llamar / WhatsApp / correo, redes | `contact.*`, `socials` |

Estructura en `core/guests.config.ts`; textos largos en el paquete
`assets/i18n/guests.{ro,es}.json` (resolver de ruta, como Departamente); en
el diccionario principal sólo `seo.guests*`, `presenter.guests_*` y
`footer.guests`. Lógica pura en `features/guests/guests.view.ts`.

**El idioma del contenido**: los títulos del programa y de los eventos son
contenido de la iglesia y van como se publican (en rumano también en la
página en español, como en toda la web); los rótulos de interfaz —el día de
la semana incluido— van en el idioma activo.

## Diseño (decisiones)

No sigue la guía `ui-*` (regla de `AGENTS.md`): es una página de llegada, y
manda que se lea en un teléfono recién sacado del bolsillo.

- **Móvil primero**. Portada de `min(74svh, 40rem)` en el teléfono (asoma la
  tarjeta del próximo culto: invita a bajar), `min(78svh, 46rem)` desde `md`,
  26rem en móvil apaisado. Velo navy degradado (abajo en el teléfono, a la
  izquierda en escritorio).
- **Contenido alineado con la cabecera**: `container()` (misma rejilla de
  página); el selector de idioma, a `--page-inset` del borde.
- **Una tarjeta, una pregunta**, con su acción al lado. En escritorio, las
  secciones se reparten en columnas (Cine suntem 1,25 : 1; Cum ajungi 1 : 1,15;
  preguntas 1 : 1,7 con el título fijo). Los niños encabezan la rejilla de
  departamentos a todo el ancho: los seis quedan 3 + 3, sin tarjeta huérfana.
- **Fotos de personas cuadradas** (cara arriba, `object-position: 50% 18%`):
  cuatro retratos 4:5 ocupaban más de una pantalla; el retrato entero, en el
  visor (`[appViewable]` en el **contenedor**, no en el `<img>`).
- **Anclas**: el `html` ya reserva la cabecera (`scroll-padding-top`); las
  secciones descuentan su aire superior (`scroll-margin-top` negativo) para
  que el rótulo quede a ~25 px bajo la cabecera. Los enlaces del índice
  llevan `/invitati#…` (el `base href` resolvería `#…` contra la portada) y
  el salto lo hace el componente (suave salvo `prefers-reduced-motion`; el
  foco acompaña).
- **Marca**: navy y oro. Oro sobre claro sólo como relleno o en
  `--c-gold-deep` (texto). Plus Jakarta Sans en titulares, Inter en el
  cuerpo, Playfair en cursiva sólo para «acasă», el versículo y la frase
  cálida de «Cine suntem».
- **Contraste**: la página redefine `--c-muted` a 0,75 (el global da 4,2:1
  sobre crema). Medido: textos ≥ 5,1:1; oro hondo 5,1:1 sobre crema; botón
  oro 7,9:1; navy 12,1:1.
- **Objetivos táctiles ≥ 44 px** (`--gst-tap: max(44px, 2,75rem)`: la raíz
  mide 15 px en el teléfono y 2,5 rem eran 38 px). El botón de copiar
  (compartido, 2 rem) crece aquí con `::ng-deep`.

## Hoja del QR (`/invitati/qr`)

- **Afiche A4** (entrada, tablón) o **4 tarjetas A6** por hoja (bancos, mesa
  de bienvenida) con línea de corte. Cada una lleva marca, saludo, código,
  **«Duminica, la 10:00 & 18:00»** (del programa) y la dirección escrita
  (`elimarganda.com/invitati`) para quien no escanea.
- Todo en **milímetros**; la vista previa es la misma hoja escalada (`--k`,
  `ResizeObserver`). Impresión: `@page A4` sin márgenes, colores exactos,
  hoja a 296,5 mm (el redondeo de 297 mm abría una segunda hoja en blanco).
- Código navy sobre blanco (~12:1), corrección `M`, versión 3 (29 × 29).
  **Zona de silencio de 4 módulos**: 2 dentro del SVG (`[margin]="2"`) + el
  relleno blanco del marco.
- Idioma = el activo: el código en español lleva `?lang=es`.
- «Tipărește» (impresión del navegador) y «Descarcă SVG» (vectorial, para
  imprenta).

## Pruebas (todas en verde el 09/11/2026)

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Lógica pura (URL del QR, `?lang`, vCard, dirección, estado del culto, iniciales) | Vitest: `guests.view.spec.ts` | ✓ |
| Ruta oculta, `noindex`, fuera del menú; datos (anfitriones, departamentos, preguntas, textos en los dos idiomas) | Vitest: `guests.config.spec.ts` | ✓ |
| Semana intensiva de fanfara (`lastWeekOfMonth`) | Vitest: `last-week-of-month.spec.ts` | ✓ |
| Generador de páginas estáticas | `node --test "scripts/**/*.test.mjs"` (`npm run test:scripts`, dentro de `npm run check`) | ✓ 5/5 |
| El QR codifica exactamente la URL (ro y es) | Matriz del SVG de la página = matriz de referencia de `qrcode`, módulo a módulo | ✓ |
| Impresión | Playwright + Edge → PDF: 1 página A4 en afiche y tarjetas, ro y es, también desde un teléfono | ✓ |
| Responsive | `responsive-audit.snippet.js` vía Playwright: 320 · 360 · 375 · 390 · 414 · 667×375 · 768 · 1024 · 1280 · 1440 · 1920, ro y es, `/invitati` y `/invitati/qr` | ✓ (sin scroll horizontal, desbordes, solapes ni textos cortados; los únicos avisos son de la cabecera y el pie, comunes a toda la web) |
| Descargas | vCard y `.ics` interceptados y leídos | ✓ |
| Teclado / visor | Enter abre el visor, Escape lo cierra y devuelve el foco | ✓ |
| Compilación de producción | `ng build` | ✓ chunk propio 59,7 kB (12,1 kB comprimido); inicial +2 kB |

## Pendiente de la iglesia (no se publica hasta que lo confirmen)

Son las preguntas que más hace un recién llegado, pero **no están en ningún
sitio** y no se inventan:

1. ¿Hay **aparcamiento**? ¿Dónde?
2. **Traducción**: hay un equipo de traducción (anuncio del 11/10/2026), pero
   ¿a qué idioma, en qué cultos y cómo (auriculares, en directo)? Hoy la
   respuesta dice sólo que se escriba antes.
3. ¿Cuánto dura el culto de domingo?
4. ¿Hay **acceso sin escalones** / para silla de ruedas?
5. ¿Cómo se viste la gente?
6. ¿Un **mensaje del pastor** de bienvenida, con su firma? (no se escribe en
   su nombre)
7. ¿Wi-Fi para invitados? ¿Mesa o punto de bienvenida a la entrada?

Cada respuesta que llegue es una pregunta frecuente más (`GUEST_FAQ` + texto).

## Fase 2 (propuestas, no hechas)

- **Diapositiva proyectable «Bine ai venit»** con el QR de `/invitati`, que el
  operador enciende al empezar el culto (bloque nuevo, apagado por defecto;
  receta en `30-presentation.md`).
- **Formulario «Sunt nou»** (nombre + cómo contactar) cuando exista la clave
  de Web3Forms (`contact.form.accessKey`): hoy el canal es WhatsApp.
- Contar escaneos: no hay analítica en la web; si se quisiera, `?src=qr` y un
  contador sin cookies.
