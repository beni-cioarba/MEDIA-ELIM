# 30 · Modo presentación

La web se proyecta en la pantalla del templo desde un **panel de control**
(`/media/control`), como la vista del presentador de PowerPoint: el operador ve
la lista de diapositivas, la vista previa, el transporte y los ajustes en su
portátil, y la **ventana de proyección** (`/media/ecran`) se abre aparte para
llevarla a la segunda pantalla. Ambas hablan por un canal local y la proyección
sigue sola si el panel se cierra.

```
 Portátil del operador                              Pantalla del templo
┌───────────────────────────────┐                  ┌────────────────────────────┐
│ /media/control  (Panou)       │  BroadcastChannel│ /media/ecran  (Proiecție)  │
│ · diapositivas por bloque     │ ◀──── state ──── │ · <app-stage> presentando  │
│ · ◀ ⏸ ▶  7/10  ━━━░  0:12     │ ──── órdenes ──▶ │ · controles al pasar el    │
│ · vista previa (iframe)       │                  │   ratón · F pantalla compl.│
│ · bloques · duraciones        │                  │                            │
└───────────────────────────────┘                  └────────────────────────────┘
        localStorage compartido (ajustes) → evento `storage` sincroniza las dos
```

> El botón del dock en `/media` **abre el panel de control**. La tecla `F` en
> `/media` sigue dando una pantalla completa rápida en la misma pestaña (un
> solo monitor). Lo decide `FloatingActionsComponent.canPresent()`.

## Rutas del operador (fuera del shell público)

| Ruta                     | Componente             | Qué es                                                     |
| ------------------------ | ---------------------- | ---------------------------------------------------------- |
| `/media/control`         | `PresenterComponent`   | Panel de control. No proyecta: envía órdenes y refleja estado |
| `/media/ecran`           | `ProjectionComponent`  | Ventana de proyección: `<app-stage>` ya presentando, sin nav ni pie |
| `/media/ecran?rol=preview` | `ProjectionComponent` | Vista previa incrustada en el panel (`<iframe>`): sin controles ni pantalla completa |

Se declaran **antes** del `MainLayoutComponent` en `app.routes.ts` (si no,
`media/:blockId` las capturaría). No van en el menú: el acceso permanente es
la píldora «Panou de control» de la franja legal del pie (`footer__operator`)
y el botón del dock en `/media`.

## Un solo reloj: roles y `PresentationSyncService`

Puede haber varias instancias de la app presentando a la vez en la misma
máquina. Cada una se une con la prioridad de su papel (`ROLE_PRIORITY`):
**ventana 20 · pestaña en pantalla completa 10 · vista previa 1**. La de mayor
prioridad viva es el **líder**: la única que avanza el carrusel. Publica
`{index, paused, startedAt, durationMs, count, slideKey, fullscreen}` cuando
cambia y como latido cada 2 s (`fullscreen` es sólo informativo: el panel lo usa
para pintar el botón de pantalla completa como pulsado); las demás lo reflejan y calculan el progreso en local a partir
de `startedAt` (nadie retransmite 60 mensajes por segundo).

- Llega una ventana (mejor prioridad) → durante 400 ms escucha y **hereda** la
  diapositiva del líder anterior; después manda.
- Se cierra el líder (`bye` en `pagehide`, o 6 s sin latido) → la siguiente
  instancia toma el relevo. Sin ventana, la vista previa del panel proyecta
  sola: sirve para ensayar.
- **Órdenes** (`next`, `prev`, `goto`, `pause`, `play`, `toggle`): cualquier
  ventana las envía, el líder las ejecuta. `CarouselService.next()` y compañía
  ya pasan por ahí, así que teclado, controles y panel se comportan igual.
- Los **ajustes** (bloques, anuncios ocultos, duraciones, directo) no viajan por el
  canal: viven en `localStorage` y `PresentationBlocksService` /
  `PresentationDisplayService` releen al recibir `storage`.
- El reloj sólo corre con la página **visible** (`ClockService.pageVisible`):
  una ventana minimizada no avanza. En el templo la ventana siempre está a la
  vista; si el operador esconde la pestaña del panel sin ventana abierta, la
  vista previa se detiene hasta que vuelva.

## Ventana de proyección: `ProjectionWindowService`

`window.open` con nombre fijo (`elim-proiectie`): abrir dos veces trae la
misma. Con la **Window Management API** (Chrome/Edge) el panel pide permiso,
elige la pantalla que no es la actual y abre la ventana sobre ella, ya a
pantalla completa donde el navegador lo admite (`fullscreen` en las features).
Sin la API: popup 16:9 que se arrastra a la otra pantalla y `F`.

### Pantalla completa desde el panel

La Fullscreen API exige un gesto del usuario **en la ventana que la pide**, y
el clic ocurre en el panel. Se resuelve con la **delegación de capacidades**
(Chromium ≥ 104): `ProjectionWindowService.toggleFullscreen()` hace
`postMessage({type: PROJECTION_MESSAGE.fullscreen}, {targetOrigin, delegate:
'fullscreen'})` a la referencia de la ventana y el gesto viaja con el mensaje.
`ProjectionComponent` (sólo con `role === 'window'` y mismo origen) llama a
`PresentationService.toggleNative()` **dentro del manejador** —la capacidad sólo
vale mientras se despacha el mensaje— y contesta `PROJECTION_MESSAGE.
fullscreenResult {ok}`. Con `ok: false` (Firefox/Safari no delegan) el panel
muestra `fullscreenDenied` → «pulsa F en la proyección». El estado real llega
por el latido del líder (`SyncState.fullscreen`), no por la respuesta.

Este protocolo va por `postMessage` directo y **no por el `BroadcastChannel`**:
sólo un `postMessage` a una referencia de ventana puede delegar el gesto. Por
eso el servicio necesita la referencia; si el panel se recargó y la perdió, la
**recupera por el nombre** (`window.open('', 'elim-proiectie')` devuelve la
ventana viva sin navegarla; si no existía, abre una en blanco que se detecta y
se cierra al instante, así que sólo se intenta cuando el canal dice que hay
ventana). La misma recuperación sirve a «Ir a la ventana». La tecla `F` y el
botón de los controles flotantes de la propia ventana siguen funcionando.

## Piezas

| Pieza                           | Responsabilidad                                              |
| ------------------------------- | ------------------------------------------------------------ |
| `PresentationService`           | Estado de presentación: nativa, simulada o **ruta de proyección** (`role`: `window` / `preview` / `inline`); `canRequestNativeFullscreen` |
| `PresentationSyncService`       | Canal entre ventanas, elección de líder, estado remoto y órdenes |
| `ProjectionWindowService`       | Abrir / vigilar / cerrar / recuperar la ventana; pantalla completa a distancia (`toggleFullscreen`, `fullscreenDenied`); URL de proyección con `base href` |
| `PresentationBlocksService`     | Qué bloques entran en la rotación y cómo se **expanden en diapositivas** (`activeSlides`, `expand(id, view)` con `view` = `projection` (sólo anuncios visibles, eventos de dos en dos) · `panel` (todos los anuncios, páginas de eventos) · `web` (todo entero, sin páginas)); relee `storage` |
| `PresentationDisplayService`    | Duración por bloque y aviso de directo; relee `storage` |
| `AnnouncementsService`          | Anuncios vigentes (alimenta el bloque `announcements`) — ver `35-announcements.md` |
| `BibleReadingService`           | Semana del plan de lectura que toca anunciar                  |
| `CarouselService`               | Diapositiva activa, pausa, progreso; reloj sólo si es líder; órdenes vía canal |
| `PresenterComponent`            | Panel de control (`features/presenter/`)                      |
| `ProjectionComponent`           | Ventana / vista previa (`features/projection/`)               |
| `PresentationSettingsComponent` | Popover de bloques en los controles flotantes de la proyección (respaldo) |
| `StageComponent`                 | Escenario, atajos de teclado, firma de la esquina, controles  |
| `features/stage/blocks/*`        | Contenido de cada bloque                                      |

## Bloques y diapositivas

Definidos en `BLOCK_DEFS` (`core/services/presentation-blocks.service.ts`).
El orden del array **es** el orden del carrusel.

Un **bloque** es una sección con interruptor propio; una **diapositiva**
(`PresentationSlide`, clave `key`) es lo que se proyecta. Casi siempre
coinciden, salvo dos bloques que `PresentationBlocksService.expand()` pagina:

- `announcements` → **una diapositiva por anuncio vigente y visible**
  (`key = 'announcements:<id>'`).
- `upcoming` → **páginas de dos eventos** (`UPCOMING_PER_SLIDE`). Clave
  `upcoming:<n>`, con `events` y `page = {index, total}`; el bloque pinta
  «n/N» junto al título. Para paginar otro bloque, sigue el mismo patrón en
  `expand()`.
- `families` → resumen + una diapositiva por familia (`36-family-prayer.md`).

Los dots, los atajos `1…9` y `CarouselService` trabajan sobre diapositivas; el
panel de ajustes, sobre bloques (y, dentro de «Anunțuri», sobre anuncios).

| id              | Componente                   | Regla automática (¿hay contenido?)   |
| --------------- | ---------------------------- | ------------------------------------ |
| `announcements` | `AnnouncementBlockComponent` | `AnnouncementsService.hasActive()`   |
| `bible`         | `BibleBlockComponent`        | `BibleReadingService.hasReading()`   |
| `website`       | `WebsiteBlockComponent`      | siempre — «Toate informațiile, pe site»: el QR grande, al final de la vuelta (ver «Lienzo») |
| `causes`        | `CausesBlockComponent`       | lista no vacía — toda la lista en una diapositiva (`docs/ai/37-prayer-causes.md`) |
| `families`      | `FamilyBlockComponent`       | `FamilyPrayerService.hasCurrent()` — resumen (mosaico de fotos) + una diapositiva por familia, detrás de los anuncios (`docs/ai/36-family-prayer.md`) |
| `socials`  | `SocialsBlockComponent`  | `socials.length > 0`               |
| `streams`  | `StreamsBlockComponent`  | siempre                            |
| `gallery`  | `GalleryBlockComponent`  | `mediaEvents.length > 0`           |
| `weekly`   | `WeeklyBlockComponent`   | `weeklyProgram.length > 0`         |
| `upcoming` | `UpcomingBlockComponent` | `ScheduleService.hasUpcomingEvents()` |

`location` existe como bloque (`LocationBlockComponent`) pero **sólo se muestra
en la web pública**, no en la proyección.

Los anuncios y la lectura bíblica van **primero**: son lo que la congregación
necesita leer antes de que empiece el programa. Un bloque de anuncios forzado
a visible sin anuncios vigentes produce una única diapositiva con el estado
vacío.

### Bloque «Citirea Bibliei»

Proyecta la semana del plan de lectura que toca anunciar (`BibleReadingService`):
la que contiene **mañana**. El domingo se anuncia la semana que empieza el
lunes (con la insignia «Începe mâine»); de lunes a sábado, la semana en curso
con el día de hoy resaltado y los pasados atenuados. Sin nada que configurar
cada semana. Datos: `core/bible-reading.config.ts`, **generado** desde el
Excel de la iglesia (receta en `20-content-i18n.md`). Duración por defecto
20 s. Lleva su hoja propia (`bible-block.component.scss`, web + proyección),
igual que la tarjeta de anuncio.

Composición (2026-09-28):

- **Fecha en pastilla**: día abreviado (`formatWeekday(…, 'short')`, que sólo
  quita el punto final de Intl —«lun.»→«lun», «joi» intacto—) + número. En la
  web va apilada, de ancho fijo, dentro de una **lista agrupada** (una
  superficie con filetes, no siete tarjetas); en proyección la pastilla se
  disuelve (`display: contents`) en una **subrejilla** día · número · pasaje
  compartida por las cuatro fichas de cada columna, así que los pasajes
  arrancan todos en la misma vertical sin anchos a mano.
- **Jerarquía en proyección**: el tramo de la semana a `title` (8u) es lo
  mayor; los pasajes diarios a `lead` y las filas se reparten el alto (con la
  antigua columna del QR había que bajarlos a `body`).
- **Tipografía de pasajes**: `typesetPassage` (servicio) cambia el guion entre
  cifras por raya corta + WORD JOINER («5–6» sin partir tras la raya). Se aplica
  a tramo, lecturas, NT y alcance del mes; el Excel sigue trayendo guiones.
- La fecha completa («luni, 28 septembrie») va en `u-sr-only` para lectores
  de pantalla (`formatDayLabel`).
- **Web, escritorio (≥ lg)**: la lista pasa a **tira semanal** de 7 columnas
  (vista semanal de calendario; la lista desperdiciaba el 90 % del ancho), con
  «Azi» dentro de su ficha. Acotada con `.stage:not(.is-fullscreen)` para que
  la proyección no herede nada. Por debajo de lg sigue siendo lista agrupada.
- **Panel de semana (web)**: el tramo es el titular (≈2 rem) y a la derecha va
  el **avance** «Ziua N din 7» con siete segmentos (`progress` en el
  componente; `null` el domingo, cuando manda «Începe mâine»). En móvil el
  avance baja a su fila y el icono del calendario se oculta. En proyección no
  se pinta.

Sólo en la web, debajo, un `<details>` «Vezi toată programarea» muestra el
plan completo (`BibleReadingService.planOverview`): mes a mes, cada semana con
su tramo y estado (`past` atenuada · `current` resaltada · `upcoming`), y cada
semana desplegable a sus lecturas diarias. En proyección no se pinta.

## Selector de bloques (auto / manual)

Botón con icono de cuadrícula y contador `n/N` dentro de la barra de controles.
Cada bloque tiene tres estados:

- **Auto** (por defecto): se proyecta sólo si la regla automática dice que hay
  contenido. Caso principal: *Evenimente viitoare* desaparece solo cuando no
  queda ningún evento futuro.
- **Forzado ON**: se proyecta aunque esté vacío (para anunciar la sección).
- **Forzado OFF**: nunca se proyecta.

Resolución: `enabled = override ?? autoAvailable`.

Persistencia: `localStorage['iglesia-redes.presentation.blocks']`, sólo los
overrides manuales (`{"upcoming": true}`). El botón ↺ devuelve un bloque a auto;
«Restablecer automático» los devuelve todos.

Garantías:

- `activeBlockIds()` nunca devuelve lista vacía (fallback al primer bloque).
- La UI deshabilita el interruptor del último bloque activo.
- El filtro **sólo afecta a la proyección**: en la web pública se renderizan
  todos los bloques (`StageComponent.renderedSlides`), también expandidos.

### Orden de los bloques (arrastrar)

En el panel de control cada bloque tiene un agarrador (⋮⋮): se arrastra a la
posición deseada (CDK `DragDrop`) o, con el foco en el agarrador, `↑` `↓`
`Inicio` `Fin`. El orden se guarda en
`localStorage['iglesia-redes.presentation.order']` (lista de ids) y **todo
deriva de él**: `PresentationBlocksService.definitions()` (computed) alimenta
`states`, `activeSlides`, los dots y la web pública (`/media` apila los
bloques en el mismo orden, **salvo anuncios y lectura bíblica**, que en la web
sólo se ven en su sección —`/anunturi`, `/media/citirea-bibliei`— y en la
proyección: `WEB_PANEL_EXCLUDED` en `StageComponent`). Un bloque nuevo en el código que no esté en la
lista guardada se añade al final en su orden por defecto. «Orden por defecto»
borra la preferencia; `BLOCK_DEFS` sigue siendo el orden inicial.

## Selección por elemento y atajos (28/09/2026)

Anuncios, eventos y **familias** (resumen + cada ficha) se eligen uno a uno
en el panel (casilla por fila). Sobre cada uno de esos bloques, una línea
compacta: «n din N în proiecție» y dos acciones de texto, **«Doar primul»**
(deja marcado sólo el primero, para ir marcando después los que se quieran)
y **«Toate»**. Un solo mecanismo en `PresentationBlocksService`:
`selection(block)`, `selectOnlyFirst(block)`, `selectAll(block)` sobre la lista
de ids elegibles y su conjunto de ocultos (`localStorage`
`…announcements.hidden`, `…events.hidden`, `…families.hidden`; el resumen de
familias es `FAMILY_SUMMARY_ID`). Si se desmarcan todas, el bloque no aporta
diapositivas. «Restablecer» limpia también estas selecciones.

**Global, sobre los bloques** (fila «BLOCURI · n din N» bajo el título de la
lista): «Doar primul» deja encendido sólo el primer bloque con contenido (en
el orden de la lista) y apaga el resto; «Toate» devuelve todos los bloques a
automático (se encienden los que tienen contenido) y marca todos sus
elementos. `globalSelection`, `selectOnlyFirstBlock()`, `selectAllBlocks()`.

**Familias de semanas anteriores**: desplegable cerrado al pie del bloque de
familias (`<details>`, una línea). Nunca vienen marcadas y **ningún «Toate»
las añade** (ni el del bloque ni el global); «Doar primul» del bloque sí las
retira. Al marcar una pasa a la lista del bloque (etiqueta «anterior»,
detrás de las de la semana) y se proyecta; la marca es **sólo para hoy**
(`…families.past` guarda `{date, ids}` y caduca a medianoche, como el aviso
de directo). `pastFamilies`, `pastFamilyOptions`, `setPastFamilyShown`.

## Tiempo por diapositiva

Cada bloque tiene su tiempo (cabecera del grupo) y **cada elemento puede
tener el suyo**: anuncio, evento o ficha de familia. Por defecto hereda el
del bloque y el control (− · segundos · +) sólo aparece al apuntar la fila;
si se cambia, la cifra queda a la vista en oro con su ↺. Guardar el mismo
valor que el bloque borra la excepción (sigue heredando).

- Claves por **elemento**, no por posición (`slideTimeKeys` en
  `PresentationDisplayService`): `a:<id>` · `e:<id>` · `f:<id>` ·
  `f:summary`. Una página de eventos dura lo que su evento más largo.
- `CarouselService.currentDurationMs` usa `durationForSlide(slide)`.
- **Bloque nuevo con varias diapositivas**: basta con enseñar a
  `slideTimeKeys` cómo se nombran sus elementos; el panel pinta el control
  en sus filas y el carrusel lo respeta.
- «Restablecer» borra también los tiempos por elemento.

## Anuncios uno a uno

Bajo el bloque «Anunțuri» del panel, cada anuncio vigente tiene su propia
casilla (`PresentationBlocksService.setAnnouncementVisible`), con el resumen
«se proyectan n de N». Ocultar un anuncio es una decisión **de proyección**:
sigue publicado en `/anunturi` y conserva su caducidad. Los ids ocultos se
guardan en `localStorage['iglesia-redes.presentation.announcements.hidden']`;
«Restablecer» los limpia. Si se ocultan todos y no hay otro bloque activo, el
carrusel recurre al primer bloque con contenido: nunca se queda en negro.

## Eventos uno a uno

Lo mismo que los anuncios, para «Evenimente viitoare»
(`PresentationBlocksService.setEventVisible`, ids en
`localStorage['iglesia-redes.presentation.events.hidden']`). Dos detalles
propios:

- **En el panel, una fila por evento y no por página.** La página es un
  detalle de la proyección y el operador
  decide sobre eventos, no sobre páginas. El rótulo de la fila es el título
  del evento y pulsarla salta a la diapositiva que lo lleva
  (`PresenterComponent.indexOf` resuelve la correspondencia por id).
- **Ocultarlos todos no es lo mismo que no tener ninguno**: sin eventos en el
  calendario sale la diapositiva vacía con su mensaje (el operador entiende
  la pantalla en blanco); si los ha ocultado a mano, el bloque simplemente no
  aporta diapositivas.

Ocultar un evento es una decisión **de proyección**: sigue en `/media` y en la
web pública. «Restablecer» limpia la lista.

## Duración por bloque

Cada diapositiva dura lo que su bloque tenga fijado
(`PresentationDisplayService.durationFor`, en segundos). Valores por defecto:

| Bloque          | s  | Por qué                                              |
| --------------- | -- | ---------------------------------------------------- |
| `announcements` | 30 | se leen, y hay que darles tiempo a los más lentos     |
| `bible`         | 20 | siete lecturas que muchos apuntan                     |
| `upcoming`      | 15 | dos eventos con fecha, título y descripción por página |
| resto           | 12 | contenido que se reconoce, no se lee                  |

El operador lo ajusta en el panel con `−` / `+` (pasos de 5 s, entre 5 y 120)
o **escribiendo los segundos** en el campo central (Intro o salir del campo
confirma; fuera de límites se acota); el ↺ que aparece al personalizar
devuelve el defecto y «Restablecer» devuelve todos. Cambiar la duración de la diapositiva en pantalla **reinicia su
temporizador** (la duración es una signal que lee el `effect` del carrusel).
Persistencia: `localStorage['iglesia-redes.presentation.display']` (junto al
aviso de directo). Los defectos viven en `DEFAULT_DURATIONS_S`; un bloque nuevo **debe**
añadirse ahí (el tipo lo exige).

## Lienzo: todo para el contenido (28/09/2026)

Decisión del usuario: **el contenido manda** y los espacios sin uso se reducen
al mínimo. Medido a 960×540 (miniatura fiel del 1080p):

| | Antes | Ahora |
| --- | --- | --- |
| Diapositiva | 115,8 × 75,2u (49 % del lienzo) | **168,8 × 91,5u** (1,76× el área) |
| Marca | fila arriba, 12,6u de alto | firma de ~3u en el margen inferior derecho |
| QR | columna fija de 44u (S/M/L, tecla `Q`) | **diapositiva propia** (`website`) |
| Versículo | pie de ~10u en cada diapositiva | sólo en la web |

- **Área segura**: 3u arriba, 4,5u a los lados, 5,5u abajo (donde vive la
  firma). `_projection.scss` § 2.
- **Firma** (`.stage-bug`): `app-brand-logo` a 2,2u de cuerpo, al 90 %,
  `pointer-events: none`. Con el aviso de directo lleva «● ÎN DIRECT» delante.
  No se pinta en las diapositivas a sangre (familias y causas: bloques de
  oración, `StageComponent.bleed()`).
- **QR** = bloque `website` («Toate informațiile, pe site»): QR de 64u (≈ 70 cm
  en una pantalla de 3 m, se escanea desde el fondo por la regla 1:10), la
  dirección y lo que hay en la web. Se enciende o apaga como cualquier bloque
  y va al final de la vuelta. En la web no existe (`/media/site` → portada).
- **Los bloques llenan la diapositiva** (§ 11 «Lienzo ancho»): redes en una
  columna de filas que se reparten el alto (@handle a `hero`, nunca cortado);
  programa semanal en subrejilla DÍA | hora | título con filas a `1fr`;
  eventos que se reparten el alto (uno solo = cartel, titular a 8u); lectura
  bíblica con filas a `1fr` y pasajes a `lead`; resumen de familias en
  collage justificado (`36-family-prayer.md`).
- **Autoajuste que crece**: `appFitToBox` acepta `appFitToBoxMax` (anuncio y
  causas: 1,2; mensaje de la ficha de familia: 1,5). Un anuncio corto se proyecta más grande en
  lugar de dejar la parte de abajo vacía; uno largo sigue encogiendo hasta 0,7.
- Prueba de banco del cambio (todas las diapositivas): cero desbordes, texto
  visible ≥ 3,2u; ocupación en alto: anuncios 100 %, familias 83-100 %, causas
  98 %, QR 98 %, galería 100 %.

## Aviso de directo («hoy también en directo»)

Interruptor del panel de control, fila «Pantalla»
(`PresentationDisplayService.setLiveNotice` / `liveNotice`). No es una
diapositiva: es un **estado de la pantalla**, porque la invitación tiene que
estar a la vista durante todo el culto.

- **En todas las diapositivas**: «● ÎN DIRECT» junto a la firma de la
  esquina (versalitas navy sobre blanco; el rojo `--c-live` sólo en el punto;
  sin pulso: en proyección no se mueve nada salvo el carrusel).
- **En la diapositiva del QR** (`website`): además del QR de la web, un
  segundo QR a `config.youtubeLiveUrl` (`…/@ElimArganda/live`, YouTube lo
  redirige al directo en curso) con la leyenda «Scanează și trimite slujba de
  azi celor dragi». Los dos códigos pasan de 64u a 46u.
- **Caduca sola**: se guarda el **día** en que se activó (`liveNoticeDate`) y
  sólo está activo mientras coincide con hoy según `ClockService`. Si se queda
  encendido el domingo, el lunes ya no se proyecta (invariante 5).

## Carrusel

- Avance automático **por diapositiva**, con la duración de su bloque (ver
  «Duración por bloque»): cada anuncio y cada página de eventos tiene su tiempo.
- El bucle `requestAnimationFrame` se arranca y se detiene desde un único
  `effect()` que observa: fullscreen, pausa, `ClockService.pageVisible` y número
  de diapositivas. Fuera de presentación **no corre nada**.
- `currentIndex` se recorta contra el número real de diapositivas, así que
  activar/desactivar bloques (o caducar un anuncio) nunca deja el carrusel en
  un índice inválido.

## Atajos de teclado (`StageComponent.handleKey`)

| Tecla        | Acción                                     |
| ------------ | ------------------------------------------ |
| `F`          | En `/media`: entrar / salir de presentación. En la ventana de proyección: pantalla completa del navegador sí / no (también desde el botón «Pantalla completa» del panel) |
| `Esc`        | Salir del modo simulado (o de la pantalla completa nativa, lo hace el navegador) |
| `←` `→`      | Diapositiva anterior / siguiente           |
| `PageUp/Down`| Igual que las flechas                      |
| `Espacio`    | Pausar / reanudar                          |
| `1`…`9`      | Ir a la diapositiva n-ésima **de las activas** |

Salvo `F` y `Esc`, sólo actúan en modo presentación. El panel de bloques hace
`stopPropagation()` mientras está abierto para no disparar estos atajos.
El **panel de control** (`PresenterComponent.handleKey`) responde a las mismas
teclas de transporte, enviándolas como órdenes al líder; se ignoran con
el foco en un control (un botón enfocado ya reacciona a Espacio).

## Legibilidad a distancia: el presupuesto (obligatorio)

Principio de diseño (decisión del usuario, 22/09/2026): **cada diapositiva se
ve entera de un vistazo**. Un anuncio es una diapositiva, la semana es una
diapositiva, los eventos van de dos en dos. Nada se pagina: lo que hace legible
el cartel es la **jerarquía**, no el tamaño uniforme: el titular se lee desde
el fondo, los datos clave desde media sala, el detalle desde las primeras
filas y en el móvil vía QR.

Medido con la regla práctica *altura de mayúscula ≥ distancia / 200* (a 1080p,
1u = 10,8 px; pantalla de ~3 m de ancho → 1,56 mm por píxel). Suelos de la
escala `--pj-fs-*` (sección 1 de `_projection.scss`; los vigila
`scripts/check-projection-sizes.mjs`, en `npm run check` y en la CI):

| Papel | Token | u | px a 1080p | Legible desde | Para |
| --- | --- | --- | --- | --- | --- |
| Mínimo absoluto / etiquetas | `--pj-fs-eyebrow` | **3,2** | 35 | ~8 m | insignias, mes de la ficha, «1/2», epígrafes |
| Secundario | `--pj-fs-caption` | 3,8 | 41 | ~10 m | hora, lugar, quién, notas, versículo, descripción de evento |
| Cuerpo | `--pj-fs-body` | **4,6** | 50 | ~12 m | resumen del anuncio, filas de listas, título del programa |
| Destacado / rótulo de bloque | `--pj-fs-lead` | 5,6 | 60 | ~14 m | pasaje del día, nombre del evento, día y hora del programa, `pj-section-title` |
| Titular del contenido | `--pj-fs-title` | **8** | 86 | ~20 m | título del anuncio, @handle |
| Dato clave | `--pj-fs-hero` / `--pj-fs-display` | 8,6 / 11 | 93 / 119 | — | número de semana, cuenta atrás |

Reglas que se derivan (y que ya cumplen todos los bloques):

1. **Todo el lienzo y una sola diapositiva.** Marca a 5u (`--brand-size` en
   `.stage-brand__logo`, `size="context"`), rótulo de bloque a `lead` en una
   línea (clave `*.title_pj` cuando el título web es largo), filas a su altura
   natural (nunca `grid-auto-rows: minmax(0, 1fr)` ni `overflow: hidden` para
   «hacer que quepa»: aplastaban y solapaban las filas).
2. **Anuncios: cartel.** La tarjeta ocupa el lienzo y `appFitToBox` la ajusta
   entre 1 y **0,7** (a 0,7 el cuerpo queda justo en 3,2u y el titular en
   5,6u; las etiquetas y secundarios nunca bajan de 3,2u porque la hoja los
   fija con `max()`). Hasta dos secciones van en columnas; tres o más se
   apilan a todo el ancho y las listas de personas pasan a texto corrido. Si
   ni a 0,7 cabe, sobra contenido: sección `webOnly` o texto más corto
   (`35-announcements.md`).
3. **Eventos: dos por diapositiva**, que se reparten el alto. Con dos, la
   descripción se recorta a dos líneas y los créditos («CUVÂNT Daniel Popa»)
   van en una; con uno, la tarjeta es un cartel (titular a 8u, fecha a `lead`,
   resumen entero hasta cuatro líneas).

   La casilla de la cuenta atrás lleva **una cifra**; cuando el evento es hoy
   lleva una palabra («AZI» / «HOY», clave `upcoming.today_short`; la insignia
   de la línea de fecha en la web sigue diciendo «ESTE AZI») y por eso tiene su propio tamaño (`lead`, no
   `display`): a tamaño de cifra medía 298 px en una columna de 216 y se salía
   por encima del borde de la tarjeta. Las insignias «ESTE AZI» / «URMĂTORUL»
   de la línea de fecha no se proyectan: la casilla ya lo dice y sólo partían
   esa línea en dos.
4. **Programa semanal entero**: fila = DÍA | hora (6,6u) | título (`lead`)
   en una subrejilla (la columna del día mide «Duminică»), filas a `1fr`.
5. **Las imágenes se ven enteras**: las miniaturas de YouTube se piden en 16:9
   real (`core/youtube-thumb.ts`: `hq720`, respaldo `mqdefault`) y la caja es
   16:9 gobernada por el **ancho** de su columna (`width: 100%; height: auto`),
   nunca por el alto de la fila; así `object-fit: cover` no recorta nada. El
   `hqdefault` de la API es 4:3 y ya llega recortado de lado.
6. **Lo secundario se quita en proyección, no se achica**: descripciones de
   redes y del programa, etiqueta «hoy» (la fila ya va resaltada), «Următorul»
   (la cuenta atrás lo dice), nombre del plan de lectura.
7. **Prueba de banco**: en `/media/ecran` a 960×540 (miniatura fiel del 1080p)
   recorrer todas las diapositivas y comprobar por JS que ningún elemento
   sobresale de `.slide--active`, que el texto visible mínimo es ≥ 3,2u y
   cuánto alto ocupa el contenido (un bloque por debajo de ~75 % tiene hueco
   que aprovechar). Estado (28/09/2026, lienzo entero): 16 diapositivas, cero
   desbordes, mínimo 3,2u. El navegador integrado en segundo plano no pinta:
   una captura mínima antes de medir fuerza el render (y el `ResizeObserver`
   del autoajuste).

## Sistema de proyección (`features/stage/styles/_projection.scss`)

La pantalla del templo se lee desde 15-20 m: lo que importa no es la
resolución sino **qué fracción del lienzo ocupa cada letra**, como en una
diapositiva. Por eso en proyección no se usan `rem` ni `clamp()` con topes en
px, sino la **unidad de diapositiva**:

```
--pj-u = min(1vh, 0.5625vw)     → 1/100 del alto de un lienzo 16:9 encajado
```

| Pantalla    | 1u       | Qué manda                                 |
| ----------- | -------- | ----------------------------------------- |
| 1920×1080   | 10,8 px  | alto                                      |
| 3840×2160   | 21,6 px  | alto — misma imagen que en Full HD         |
| 1024×768    | 5,76 px  | ancho — lienzo 16:9 dentro del 4:3         |
| 2560×1080   | 10,8 px  | alto — lienzo centrado, márgenes laterales |

Escala (todas en `.stage.is-fullscreen`):

| Variable            | u    | Uso                                              |
| ------------------- | ---- | ------------------------------------------------ |
| `--pj-fs-eyebrow`   | 2,2  | etiquetas en versalitas («INSTAGRAM», «HOY»)      |
| `--pj-fs-caption`   | 2,5  | descripciones, leyenda del QR, versículo          |
| `--pj-fs-body`      | 2,9  | cuerpo de lectura (hora + título del programa)    |
| `--pj-fs-lead`      | 3,4  | destacado dentro de una tarjeta                   |
| `--pj-fs-title`     | 4,2  | título de la diapositiva (`pj-section-title`)     |
| `--pj-fs-hero`      | 4,8  | el dato clave: `@handle`, nombre del evento       |
| `--pj-fs-display`   | 7    | cifras y titulares de anuncio                     |
| `--pj-sp-1…6`       | 1…6  | espaciado · `--pj-r`, `--pj-r-sm` radios · `--pj-stroke` trazo ≥ 1px · `--pj-icon`, `--pj-icon-sm` |

Criterio: ~1 cm de altura de letra por cada 3-4 m de distancia ⇒ nada
secundario por debajo de 2,5u y el dato clave en 4,4-5u.

Reglas fijas del lienzo proyectado:

- **Área segura** (`padding` 3u × 6u) frente al overscan de TV/proyector y
  lienzo 16:9 centrado en pantallas más anchas (`--pj-canvas-w`).
- **Fondo plano**: halos y grano ocultos (bandas y suciedad en proyector).
- **Título anclado arriba** en todos los bloques, con el mismo cuerpo y una
  regla dorada corta (`@include pj-section-title`). Los subtítulos se ocultan.
- **Colores neutros**: superficies blancas, texto carbón/`--c-muted`, marca
  navy. Oro sólo como acento; rojo `--c-live` sólo para «en directo» / «hoy».
- **Sin chrome**: flecha de las tarjetas, botones de compartir y dock
  flotante ocultos (el dock y la barra reaparecen al acercar el ratón).
- **Sin movimiento propio**: el resaltado rotatorio de redes sólo existe en
  la web pública; el único movimiento es el cambio de diapositiva.
- **Tres emisiones** en «Transmisiones» (`PROJECTED_STREAMS`), en lista
  vertical con miniatura + título a cuerpo de lectura.

## Receta — añadir un bloque proyectable nuevo (anuncios, avisos…)

1. `features/stage/blocks/<nombre>-block/` con componente standalone + OnPush y
   `styles: [':host { display: contents; }']` (para no romper el layout flex/grid
   del `.slide` padre).
2. Añade el id al tipo `PresentationBlockId` y una entrada en `BLOCK_DEFS`
   (con `titleKey` i18n) en la posición deseada del carrusel.
3. Añade su regla automática en `autoAvailability` (`true` si siempre aplica).
4. Registra el componente en `StageComponent.imports` y añade su `@case` en el
   `@switch` de `stage.component.html`.
5. Estilos de la web pública: sección nueva en `stage.component.scss` con
   prefijo BEM propio (`.<nombre>__…`) — ver `docs/ai/40-styling.md`.
6. Estilos de proyección: sección nueva dentro de `stage-projection` en
   `styles/_projection.scss`, **sólo** con variables `--pj-*`: el bloque ocupa
   `height: 100%`, es `flex-direction: column`, su `__title` incluye
   `pj-section-title` y el cuerpo crece con `flex: 1 1 auto; min-height: 0`.
7. Claves i18n en `es.json` y `ro.json`.

## QR

`shared/qr-panel`, en la diapositiva `website` (ver «Lienzo»). Codifica
siempre `config.publicUrl` (no la URL del navegador) para que apunte a
producción aunque se esté proyectando desde `localhost`; con el aviso de
directo, un segundo panel codifica `config.youtubeLiveUrl`.

- Corrección de errores **`M`**, no `H`: en pantalla no hay roturas que
  corregir y `H` sólo añade módulos (41×41 → 33×33 con esta URL). A igual
  tamaño, módulos un 24 % mayores = se escanea desde más lejos.
- El componente está encapsulado: se escala por variables (`--qr-frame-pad`,
  `--qr-frame-radius`, `--qr-gap`, `--qr-caption-size`, `--qr-caption-weight`,
  `--qr-caption-color`), fijadas en `website-block.component.scss`.

## Versículo del panel

El pie del escenario **en la web** usa `verse.stage_text` /
`verse.stage_reference` (Psalmul 84:10); proyectado no se pinta (el sitio es
del contenido). La portada tiene el suyo propio (`verse.text` /
`verse.reference`): cambiar uno no cambia el otro.
