# 30 · Modo presentación

La web se proyecta en las pantallas del templo desde un **panel de control**
(`/media/control`), una consola de realización: el operador ve la escaleta, el
monitor de programa, el transporte, las **salidas** y los ajustes en su
portátil, y abre una **ventana de proyección** (`/media/ecran`) **por cada
pantalla** (proyector, televisor…). Todas hablan por un canal local, muestran
exactamente lo mismo y siguen solas si el panel se cierra.

```
 Portátil del operador                                Pantallas del templo
┌───────────────────────────────┐                  ┌──────────────────────────┐
│ /media/control  (Panou)       │  BroadcastChannel│ /media/ecran  · pantalla 1│
│ · escaleta por bloque         │ ◀──── state ──── │ /media/ecran  · pantalla 2│
│ · monitor + ◀ ⏸ ▶ 0:12/0:30  │ ──── órdenes ──▶ │ …  (una ventana por      │
│ · salidas: detectar pantallas,│                  │    pantalla, mismo estado)│
│   proyectar, identificar…     │                  │                          │
└───────────────────────────────┘                  └──────────────────────────┘
        localStorage compartido (ajustes) → evento `storage` sincroniza todas
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
| `/media/ecran?rol=solo&anunt=<id>` | `ProjectionComponent` | **Vista de prueba**: UNA diapositiva fija (un anuncio aunque aún no esté publicado). No se sincroniza con nadie |

Se declaran **antes** del `MainLayoutComponent` en `app.routes.ts` (si no,
`media/:blockId` las capturaría). No van en el menú: el acceso permanente es
la píldora «Panou de control» de la franja legal del pie (`footer__operator`)
y el botón del dock en `/media`.

## Un solo reloj, N salidas: `PresentationSyncService` (revisión 03/10/2026)

Puede haber varias instancias presentando a la vez en la misma máquina: una
ventana por pantalla, la vista previa del panel, la pestaña en pantalla
completa. Cada una se une con la prioridad de su papel (`ROLE_PRIORITY`:
**ventana 20 · pestaña 10 · vista previa 1**) **+ 100 si está visible**. La de
mayor prioridad es el **líder**: la única que decide cuándo pasa la diapositiva.
Así una ventana minimizada (Chrome frena sus temporizadores) nunca lleva el
reloj si hay otra a la vista.

**El tiempo es un plazo, no un progreso.** El líder publica
`{index, slideKey, paused, startedAt, elapsedAtPause, durationMs, count, fullscreen}`
al cambiar algo y como latido cada 2 s; nadie manda nada por fotograma. Las
demás reflejan la diapositiva **por clave** (`slideKey` manda sobre `index`) y
pintan la barra de progreso como animación CSS desde `startedAt`, así que todas
las pantallas cambian a la vez y en el mismo punto.

- Llega una instancia mejor → durante 400 ms escucha y **hereda** diapositiva y
  reloj del líder anterior; después manda (`canPublish` = líder y asentado: el
  efecto que publica lo lee de forma reactiva, para publicar justo al asentarse).
- Se cierra el líder (`bye` en `pagehide`, o 6,5 s sin latido) → la siguiente
  toma el relevo con el último estado y sigue donde iba. Sin ventanas, la vista
  previa del panel proyecta sola: sirve para ensayar.
- **Órdenes** (`next`, `prev`, `goto`, `pause`, `play`, `toggle`): cualquiera las
  envía, el líder las ejecuta.
- **Presencia**: cada saludo lleva `PeerInfo {role, name, visible, fullscreen,
  screen}`; `outputs` = ventanas vivas, ordenadas por nombre (su número es el de
  «Identificar»). El panel pregunta `who` al abrirse y la lista aparece al
  instante. `identify` → cada ventana muestra su número 4 s.
- Los **ajustes** (bloques, duraciones, modo manual, directo) no viajan por el
  canal: viven en `localStorage` y cada servicio relee al recibir `storage`.
- Trampa (03/10/2026): las llamadas al canal desde un `effect` van en
  `untracked` (`join`, `publishState`); si no, leen y escriben las mismas
  señales y el efecto entra en bucle infinito (la página se congela).

## Rendimiento (auditoría del 03/10/2026)

Medido con Playwright + CDP (`Performance.getMetrics`, 20 s de proyección):

| | antes | después |
| --- | --- | --- |
| Ventana de proyección: CPU / maquetaciones | 0,95 s / 1.201 | 0,01 s / 0 |
| Panel de control: CPU | 2,02 s | 0,08 s |
| Nodos del DOM en proyección | 899 (17 diapositivas) | 333 |

Causas y remedio (no reintroducir):

1. **Nada por fotograma.** El progreso era una señal escrita 60 veces por
   segundo (rAF) → detección de cambios de toda la app en cada fotograma, en
   cada pantalla. Ahora el líder programa **un** `setTimeout` al plazo (fuera
   de la zona) y la barra es `SlideProgressDirective` (Web Animations sobre
   `transform`, compositor). El panel sólo tiene un reloj de 1 s para textos.
2. **Sólo se montan 3 diapositivas** (`StageComponent.isMounted`): la actual,
   la siguiente (precarga fotos) y la anterior (fundido de salida).
3. **Halos quietos al proyectar** (`blur(120px)` animado sin fin sobre 60vmax).
4. La vista previa y la de prueba usan YouTube en modo `ligero` (sin sondeo).

## Ventanas y pantallas: `ProjectionWindowService`

**Detecta las pantallas** con la Window Management API (Chrome/Edge): el
panel pide permiso con un clic («Detectar pantallas»; si ya estaba concedido,
las lista solo) y muestra cada una con nombre, resolución, «principal» y «este
panel»; se actualiza al conectar o desconectar una (`screenschange`). Por
pantalla: **Proyectar** (abre la ventana sobre ella, a pantalla completa donde
se admite) y, en directo, pantalla completa / traer al frente / cerrar.
«Proyectar en todas» abre una en cada pantalla que no es la del panel.
«Nueva ventana» abre una suelta (sin API, o para arrastrarla a mano).

Cada ventana se llama `elim-proiectie-<pantalla>` (`<left>_<top>`) o
`elim-proiectie-v<n>`: abrir otra vez en la misma pantalla la trae al frente.
Los nombres que abrió el panel se guardan en `sessionStorage`, así que tras
recargarlo las sigue controlando. Una pestaña abierta a mano en `/media/ecran`
también se sincroniza y aparece en la lista («pestaña abierta a mano»), pero el
panel no puede mandarle órdenes directas (no tiene su referencia).

### Pantalla completa desde el panel

La Fullscreen API exige un gesto del usuario **en la ventana que la pide**, y
el clic ocurre en el panel. Se resuelve con la **delegación de capacidades**
(Chromium ≥ 104): `toggleFullscreen(name)` hace `postMessage({type:
PROJECTION_MESSAGE.fullscreen}, {targetOrigin, delegate: 'fullscreen'})` a esa
ventana y el gesto viaja con el mensaje. `ProjectionComponent` (sólo con
`role === 'window'`) llama a `toggleNative()` **dentro del manejador** y
contesta `fullscreenResult {ok}`. Con `ok: false` (Firefox/Safari) el panel
muestra «pulsa F en la proyección». El estado real llega en el saludo de cada
ventana (`PeerInfo.fullscreen`).

## Anuncios programados: verlos antes del día

`AnnouncementsService.scheduled` = anuncios con `publishedOn` futuro. El panel
los lista («Anuncios programados») con **Ver** (diálogo 16:9 con un `<iframe>`
de `/media/ecran?rol=solo&anunt=<id>`: el mismo escenario, así que se ve
exactamente como se proyectará) y **Probar en ventana** (la misma vista en una
ventana suelta, para arrastrarla al proyector y verla a tamaño real). La web
pública y la proyección siguen sin mostrarlos antes de tiempo.

## Cuenta atrás del culto (03/10/2026)

`ServiceCountdownService` + `shared/service-countdown`. Automática: el próximo
comienzo de **hoy** según `weeklyProgram` y los eventos de hoy
(`ScheduleService.todayStarts`; el domingo «10:00 & 18:00» son dos). El panel
(tarjeta «Cuenta atrás del culto») permite encenderla/apagarla, elegir la
antelación (15-90 min; **90 por defecto** desde el 04/10/2026) y fijar una **hora manual para hoy** que manda sobre el
horario y caduca a medianoche (`PresentationDisplayService.countdown`, en
`localStorage` como el resto: todas las pantallas marcan lo mismo).

En proyección es una píldora en el **margen inferior izquierdo** (simétrica a
la firma ELIM), en todas las diapositivas: clara con texto navy sobre las
diapositivas claras, oscura sobre las de oración a sangre (`:host-context(
.stage--bleed)`). «ÎNCEPEM ÎN 12:47» con cifras monoespaciadas y un anillo que
se cierra con la antelación; los 5 últimos minutos en oro; a la hora, «Începem
acum» un minuto y desaparece. Rendimiento: el segundero sólo existe dentro de la
ventana; fuera, un único `setTimeout`. Las diapositivas a sangre reservan 7u
abajo (causas, collage de familias) para que no pise el texto.

**«Mereu» (siempre, 04/10/2026, pedido del usuario)**: sexta opción de la
antelación (`leadMinutes = null`). Sin elegir minutos: se ve todo el día
hasta el próximo comienzo, **salvo mientras dura un culto anterior de hoy**
(2 h desde su comienzo, `SERVICE_DURATION_MS`, las mismas que la ventana de
culto de `ScheduleService`): el domingo, a las 11:00 no se proyecta «Începem
în 7:00:00» hacia las 18:00 en plena reunión; vuelve a las 12:00. La fila de
antelación del panel va apilada (`.seg--stacked`): rótulo encima, seis botones.

## Piezas de esquina pegadas al borde (04/10/2026)

Cuenta atrás (abajo izquierda), reloj (arriba derecha) y «ÎN DIRECT» (abajo
derecha; sin logotipo desde el 04/10/2026) van **pegados al borde de la pantalla** a `--pj-edge` = 0,6u
(~6 px a 1080p), no alineados con el contenido (antes 4,5u). Pedido del
usuario: lo mínimo de margen. Es un único token en `_projection.scss`: si un
proyector recorta los bordes (overscan), se sube ahí. Los contenedores de
esquina son `flex` (sin el hueco de la línea de texto bajo la píldora).

## Reloj en la proyección (04/10/2026)

`shared/stage-clock` (`app-stage-clock`): la hora actual `HH:MM:SS` (segundos
a 3,2u y atenuados) en la **esquina superior derecha**, la que queda libre
(abajo están la cuenta atrás y la firma). Mismo lenguaje que la píldora de la
cuenta atrás (clara / oscura a sangre). Se enciende en el panel → «Ritm și
ecran» → «Arată ora» (`PresentationDisplayService.showClock`, preferencia
`clock` en `localStorage`, **apagado por defecto**, no caduca). No sale en la
vista fija `solo` (ni, por tanto, en el PDF de las familias). Un `setInterval`
de 1 s fuera de Angular, alineado con el cambio de segundo.

## Atajo «Familii» (04/10/2026)

Cuarto botón de la selección global (tras «Rugăciune»): la **presentación de
las familias en el culto**. `PresentationBlocksService.selectFamilyPresentation()`
deja encendido sólo el bloque `families` con **todas** las de la semana en
curso (resumen + fichas, `selectAll`), quita las de semanas anteriores y la
prueba de la semana siguiente; el panel (`presentFamilies()`) pone además el
**avance en manual** (`setAutoAdvance(false)`) y salta al resumen con la orden
`gotoKey` (`FAMILY_SUMMARY_SLIDE_KEY`). Quien está en el panel pasa las fichas
a mano al ritmo de la presentación. Activo (`familiesOnly` y avance manual) se
pinta pulsado; para volver, «Toate» y el interruptor de avance automático.
También **apaga la cuenta atrás** (`setCountdownEnabled(false)`): la
presentación ya es el culto; se vuelve a encender en su tarjeta.

**Orden `gotoKey`** (`SyncCommand`): ir a una diapositiva por clave. Hace falta
justo después de cambiar la selección: la ventana que proyecta puede recibir
la orden antes que la lista nueva; la clave espera a que la diapositiva
aparezca (`CarouselService.currentIndex` resuelve primero por
`requestedKey`), mientras que un índice caería en la equivocada.

## Atajo «Rugăciune» (03/10/2026)

Tercer botón de la selección global (junto a «Doar primul» / «Toate»):
`PresentationBlocksService.selectPrayerBlocks()` deja encendidos sólo los
bloques de oración (`PRAYER_BLOCKS`: `families` y `causes`) y, de familias,
**sólo el resumen** (las fichas una a una, no). Se pinta en oro mientras está
aplicado (`prayerOnly`).

## Panel de control: consola de realización (03/10/2026)

Lenguaje propio, no el de la web (decisión del usuario): negro azulado,
filetes de 1 px, micro-rótulos en versalitas, cifras monoespaciadas; oro =
marca y «en pantalla», rojo = en el aire, verde = salida sana. Tres columnas
(escaleta · monitor · salidas/ritmo/programados) que caben en 13" y se apilan
por debajo de 1100 px. Tokens en el `:host` de `presenter.component.scss`.

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
| `talent`        | `TalentBlockComponent`       | queda alguna fase por delante (`TalentContestService.focusPhase`) — cartel de Talantul în Negoț a sangre: fases, categorías, cuenta atrás y QR a `/talantul-in-negot` (`docs/ai/38-talent-contest.md`) |
| `families`      | `FamilyBlockComponent`       | `FamilyPrayerService.hasCurrent()` — resumen (mosaico de fotos) + una diapositiva por familia, detrás de los anuncios y de las causas (`causes` va antes desde el 04/10/2026; `docs/ai/36-family-prayer.md`) |
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

### Programa semanal (web) — 05/10/2026

`WeeklyBlockComponent` tiene **dos marcados** según `PresentationService.isFullscreen`
y hoja propia (`weekly-block.component.scss`, `ViewEncapsulation.None`); las
reglas antiguas de `.weekly` salieron de `stage.component.scss`.

- **Proyección**: sin cambios. Lista `.weekly__list` / `.weekly__item` desde
  hoy (`ScheduleService.weeklyProgram`); la hoja del bloque sólo pone la base
  sin ámbito (0,1,0) y la escala sigue en `_projection.scss`.
- **Web**: medido a 1520 px, la lista eran 6 filas de 1.415 × 80 px (540 px de
  alto) con títulos de ~300 px: el 75 % de cada fila vacío. Ahora:
  1. **Panel «ahora / siguiente»** (navy, filete de oro, retícula de puntos):
     estado («Următorul serviciu» / «Acum, în desfășurare» con punto `--c-live`
     que late, sin animación con `prefers-reduced-motion`), título del culto,
     «Azi / Mâine / <día> · hora» y a la derecha la **cuenta atrás** en las dos
     unidades mayores (`2 zile 3 h`, `3 h 12 min`, `25 min`). En curso, la
     cuenta atrás se cambia por «Urmărește în direct» → `/media/transmisiuni`.
     Sale de `ScheduleService.nextService`: cada hora de «10:00 & 18:00» es una
     sesión propia, y una sesión cuenta como en curso desde su hora hasta +2 h
     (`MINUTOS_VENTANA`, la misma ventana que usa el directo).
  2. **La semana como calendario** (`ScheduleService.week`): lunes → domingo
     con fecha, **incluidos los días sin culto** (rayado tenue, «Fără serviciu»),
     pasados atenuados, hoy en oro, el siguiente culto (si no es hoy) con filete
     navy. ≥ lg: 7 columnas en una sola superficie (194 px de alto a 1520 px);
     por debajo, lista agrupada con columna de día fija; < md la hora va siempre
     encima del título. Las horas son `<time>` en pastilla, una por sesión.
  3. **Pie**: dirección + «Cum ajungi» → `/media/locatie`.
- Los nombres de día salen de Intl en el idioma activo (`formatWeekdayLong`),
  no de `dayLabel` (que sigue siendo el rumano de la proyección).
- Crecer: un culto nuevo el sábado o un segundo culto un día es **sólo datos**
  (`weeklyProgram`); la rejilla y el panel lo recogen sin tocar marcado.

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
| `causes`        | 30 | la lista se lee en voz alta y se ora por ella (04/10/2026; antes 60) |
| `announcements` | 30 | se leen, y hay que darles tiempo a los más lentos     |
| `bible`         | 20 | siete lecturas que muchos apuntan                     |
| `upcoming`      | 15 | uno o dos eventos por página: cartel, título, resumen y cuenta atrás |
| resto           | 12 | contenido que se reconoce, no se lee                  |

El operador lo ajusta en el panel con `−` / `+` (pasos de 5 s, entre 5 y 120)
o **escribiendo los segundos** en el campo central (Intro o salir del campo
confirma; fuera de límites se acota); el ↺ que aparece al personalizar
devuelve el defecto y «Restablecer» devuelve todos. Cambiar la duración de la diapositiva en pantalla **reinicia su
temporizador** (la duración es una signal que lee el `effect` del carrusel).
Persistencia: `localStorage['iglesia-redes.presentation.display']` (junto al
aviso de directo). Los defectos viven en `DEFAULT_DURATIONS_S`; un bloque nuevo **debe**
añadirse ahí (el tipo lo exige).

### Avance automático / sólo manual (03/10/2026)

Interruptor general en el panel (fila «Pantalla» → «Avans automat»):
`PresentationDisplayService.autoAdvance` (`localStorage`, mismo objeto que las
duraciones; **no caduca**: es un modo de trabajo, no contenido). Apagado:

- el `effect` del carrusel no arranca el reloj (`CarouselService.autoAdvance`)
  y el líder publica `durationMs: 0`, así las demás ventanas pintan la barra
  vacía;
- se cambia sólo a mano (← → / lista / 1-9) y **Espacio avanza** en vez de
  pausar; en la proyección desaparece el botón de pausa y en el panel el de
  transporte se deshabilita y el tiempo dice «Manual»;
- las duraciones (de bloque y de diapositiva) **se conservan** y se atenúan en
  la lista; al encenderlo vuelven a mandar tal cual, desde cero en la
  diapositiva en curso.

La pausa sigue siendo lo puntual («espera un momento»); el interruptor, el modo
de toda la sesión.

## Lienzo: todo para el contenido (28/09/2026)

Decisión del usuario: **el contenido manda** y los espacios sin uso se reducen
al mínimo. Medido a 960×540 (miniatura fiel del 1080p):

| | Antes | Ahora |
| --- | --- | --- |
| Diapositiva | 115,8 × 75,2u (49 % del lienzo) | **168,8 × 91,5u** (1,76× el área) |
| Marca | fila arriba, 12,6u de alto | ninguna (la firma de ~3u se retiró el 04/10/2026) |
| QR | columna fija de 44u (S/M/L, tecla `Q`) | **diapositiva propia** (`website`) |
| Versículo | pie de ~10u en cada diapositiva | sólo en la web |

- **Área segura**: 3u arriba, 4,5u a los lados, 5,5u abajo (donde vive la
  firma). `_projection.scss` § 2.
- **Sin logotipo en la proyección** (04/10/2026, pedido del usuario): la firma
  ELIM de la esquina inferior derecha se retiró. `.stage-bug` sólo existe con
  el aviso de directo y lleva «● ÎN DIRECT», `pointer-events: none`. No se
  pinta en las diapositivas a sangre (familias y causas: bloques de oración,
  `StageComponent.bleed()`).
- **QR** = bloque `website` («Toate informațiile, pe site»): QR de 64u (≈ 70 cm
  en una pantalla de 3 m, se escanea desde el fondo por la regla 1:10) y
  lo que hay en la web. Se enciende o apaga como cualquier bloque
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

- **En todas las diapositivas**: «● ÎN DIRECT» en la esquina inferior derecha (versalitas navy sobre blanco; el rojo `--c-live` sólo en el punto;
  sin pulso: en proyección no se mueve nada salvo el carrusel).
- **En la diapositiva del QR** (`website`): el QR sigue siendo **uno solo**, a
  la web; sólo cambia la entradilla (`website_slide.lead_live`: el culto de hoy
  en directo, para compartirlo). El directo se abre desde la propia web.
  Decisión (2026-09-29): dos códigos obligaban a elegir cuál escanear, partían
  el tamaño (64u → 46u) y duplicaban el «● ÎN DIRECT» de la esquina.
- **Caduca sola**: se guarda el **día** en que se activó (`liveNoticeDate`) y
  sólo está activo mientras coincide con hoy según `ClockService`. Si se queda
  encendido el domingo, el lunes ya no se proyecta (invariante 5).

## Carrusel

- Avance automático **por diapositiva**, con la duración de su bloque (ver
  «Duración por bloque»): cada anuncio y cada página de eventos tiene su tiempo.
- Sólo el líder programa el plazo (un `setTimeout` por diapositiva); si el
  navegador lo frenó, al volver a ser visible se comprueba el plazo y se pasa.
  Cambiar de diapositiva por una orden, por tiempo o porque desaparece la
  actual reinicia su reloj (`timedKey`).
- `currentIndex` se resuelve por clave y se recorta contra el número real de
  diapositivas: activar/desactivar bloques nunca deja un índice inválido.

## Atajos de teclado (`StageComponent.handleKey`)

| Tecla        | Acción                                     |
| ------------ | ------------------------------------------ |
| `F`          | En `/media`: entrar / salir de presentación. En la ventana de proyección: pantalla completa del navegador sí / no (también desde el botón «Pantalla completa» del panel) |
| `Esc`        | Salir del modo simulado (o de la pantalla completa nativa, lo hace el navegador) |
| `←` `→`      | Diapositiva anterior / siguiente           |
| `PageUp/Down`| Igual que las flechas                      |
| `Espacio`    | Pausar / reanudar (en modo manual: siguiente) |
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
3. **Eventos: la misma tarjeta que la web** (`.ev--pj`, estilos en
   `upcoming-block.component.scss`, vigilada por `check:projection`):
   cartel · texto · consola navy con fecha, hora y cuenta atrás días / horas /
   min (cambia una vez por minuto, sin animación; el punto «hoy» no late).
   - **Un evento**: la tarjeta llena la diapositiva. Columnas 38u | ~83u |
     48u; titular a `title` (3 líneas), resumen a `body` (hasta 3), créditos
     en una línea; día a 16u, cifras a `title`. Antes la casilla de 160 px y
     el texto a la izquierda dejaban media diapositiva vacía.
   - **Dos eventos**: mitad y mitad. Columnas 24u | texto | 60u; titular a
     `lead` y resumen a `caption` (2 líneas cada uno); la consola pone fecha
     y hora arriba y la cuenta atrás debajo a todo el ancho (en columnas se
     salía 47 px a 720p) y omite el año.
   - Cartel entero (`object-fit: contain`) sobre su copia desenfocada; el
     visor va desactivado. «URMĂTORUL» sólo en la primera de la página 1;
     «ESTE AZI» en rojo `--c-live` cuando toca.
   - Cuenta atrás (igual en la web): sin la casilla «0 zile» el mismo día
     (sólo ore / min); «În desfășurare» durante 3 h desde la hora de inicio
     (`LIVE_WINDOW_MS`; los eventos no tienen hora de fin) y después nada:
     queda «ESTE AZI» con la hora.
   - **Galería** (de paso, para que `check:projection` pase): carril de 60u
     (antes 46u) con miniatura de 12u; nombre a 3,6u en hasta dos líneas y
     fecha a `eyebrow` (antes 3u y 2,3u); filas de 14u como mínimo; el
     ordinal «01» sobre la miniatura (1,9u, ilegible) no se proyecta; el
     rótulo sobre la foto grande, a `caption` (antes 2,6u).
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
- **Sin movimiento propio**: el único movimiento es el cambio de
  diapositiva (las redes ya no tienen resaltado rotatorio en ningún sitio).
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
producción aunque se esté proyectando desde `localhost`. Siempre un único
código. Debajo, la **dirección escrita** (`elimarganda.com`, input `address`
del panel, derivada de `publicUrl` con `new URL(...).host`) a `--pj-fs-lead`
y en navy, y la leyenda «Escanea el código…» en gris: quien no escanea, la
teclea. (Mientras el dominio fue el provisional `github.io` no se rotulaba.)

- Corrección de errores **`M`**, no `H`: en pantalla no hay roturas que
  corregir y `H` sólo añade módulos (con `https://elimarganda.com/`, 33×33 →
  29×29 contando el margen). A igual tamaño, módulos un 14 % mayores = se
  escanea desde más lejos. La URL corta del dominio propio ya ganó lo mismo
  frente a la de `github.io` (33×33 → 29×29).
- El componente está encapsulado: se escala por variables (`--qr-frame-pad`,
  `--qr-frame-radius`, `--qr-gap`, `--qr-caption-size`, `--qr-caption-weight`,
  `--qr-caption-color`, `--qr-address-size`, `--qr-address-color`), fijadas
  en `website-block.component.scss`.

## Versículo del panel

El pie del escenario **en la web** usa `verse.stage_text` /
`verse.stage_reference` (Psalmul 84:10); proyectado no se pinta (el sitio es
del contenido). La portada tiene el suyo propio (`verse.text` /
`verse.reference`): cambiar uno no cambia el otro.

## Próximos eventos en la web

`UpcomingBlockComponent` tiene **una sola tarjeta** (`<ng-template #hero>`):
en la web es el destacado; en proyección se pinta una por evento de la página
con `.ev--pj` (ver punto 3 de «Legibilidad» más arriba). Todo vive en
`upcoming-block.component.scss`; de `stage.component.scss` y
`_projection.scss` sólo quedan la cabecera, `__page` y el estado vacío.

Medido antes del cambio (1600 px): la tarjeta medía 1432 px y el texto se
cortaba en 693 (41 % de la tarjeta vacía a la derecha); la casilla «12 días
restantes», 160 × 234 px casi toda aire; el `poster` del evento no salía en
ningún sitio y «Calendario» estaba dos veces.

- **Destacado** (el primer evento): cartel · texto · panel. El panel es navy
  profundo con retícula fina y halo de oro (rojo vivo si es hoy): fecha
  partida (DOM · 18 · OCT 2026), hora(s) y **cuenta atrás en vivo** días /
  horas / min hasta el primer `HH:MM` de `time` (reloj de `ClockService`, un
  tic por minuto; «En curso» cuando ya empezó). La fecha larga no se repite
  en el texto: queda sólo para lectores de pantalla. El cartel abre el visor
  (`[appViewable]`) y nunca se recorta (lleva texto hasta el borde).
- **Agenda** (el resto): agrupada por mes, filas densas fecha | título + hora
  + créditos + resumen de una línea | «en N días» | miniatura del cartel +
  calendario. Con veinte eventos sigue leyéndose como un calendario.
- **Container queries** (`container: ev`), no media queries: el bloque manda
  según lo que él mide, en su página o dentro del panel completo.
  - `< 560 px`: panel arriba como franja; el cartel, banda de 13rem entero
    sobre una copia desenfocada de sí mismo (en columna estrujaba el texto a
    230 px); texto a todo el ancho.
  - `560–899 px`: cartel a la izquierda; texto y franja del panel a la derecha.
  - `≥ 900 px`: una fila cartel | texto | panel (1440 × 322 px con un evento).
- Cada evento lleva `id="ev-<id>"`; «Compartir» comparte la página con ese
  ancla. Claves nuevas en `upcoming.*`: `when`, `starts_in`, `started`,
  `unit_days|hours|minutes`, `later`, `in_days`, `tomorrow`.
