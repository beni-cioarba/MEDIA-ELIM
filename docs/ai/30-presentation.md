# 30 · Modo presentación

La web se proyecta en la pantalla del templo. Al pulsar **Presentar** (botón
del dock o tecla `F`) se entra a pantalla completa y el contenido pasa de
página larga a **carrusel de diapositivas**, con el QR a la derecha (opcional
y de tamaño configurable) o con todo el lienzo para el contenido.

> El botón de presentar **sólo aparece en `/media`** (panel completo), que es la
> única página pensada para proyectarse; en el resto sería un control sin
> destino. Lo decide `FloatingActionsComponent.canPresent()` comparando
> `NavActiveService.url()` con `APP_PATHS.media`. Se mantiene visible mientras
> la presentación esté activa para poder salir siempre.

## Piezas

| Pieza                           | Responsabilidad                                              |
| ------------------------------- | ------------------------------------------------------------ |
| `PresentationService`           | Fullscreen API nativa; si falla, modo *simulado* con la clase `is-simulated-fullscreen` en `<body>` |
| `PresentationBlocksService`     | Qué bloques entran en la rotación y cómo se **expanden en diapositivas** (`activeSlides`, `expand()`) |
| `PresentationDisplayService`    | QR visible sí/no y tamaño (`s`/`m`/`l`); persistido en `localStorage['iglesia-redes.presentation.display']` |
| `AnnouncementsService`          | Anuncios vigentes (alimenta el bloque `announcements`) — ver `35-announcements.md` |
| `CarouselService`               | Diapositiva activa, pausa, progreso, avance automático        |
| `PresentationSettingsComponent` | UI del selector de bloques + ajustes del QR (en `shared/`)     |
| `StageComponent`                 | Escenario, atajos de teclado, QR, controles                   |
| `features/stage/blocks/*`        | Contenido de cada bloque                                      |

## Bloques y diapositivas

Definidos en `BLOCK_DEFS` (`core/services/presentation-blocks.service.ts`).
El orden del array **es** el orden del carrusel.

Un **bloque** es una sección con interruptor propio; una **diapositiva**
(`PresentationSlide`, clave `key`) es lo que se proyecta. Casi siempre
coinciden, salvo dos bloques que `PresentationBlocksService.expand()` pagina:

- `announcements` → **una diapositiva por anuncio vigente y visible**
  (`key = 'announcements:<id>'`).
- `upcoming` → **páginas de `UPCOMING_PER_SLIDE` (2) eventos**
  (`key = 'upcoming:<n>'`, con `events` y `page = {index, total}`; el bloque
  pinta «n/N» junto al título). Así ningún evento se corta y cada página tiene
  su tiempo. Para paginar otro bloque, sigue el mismo patrón en `expand()`.

Los dots, los atajos `1…9` y `CarouselService` trabajan sobre diapositivas; el
panel de ajustes, sobre bloques (y, dentro de «Anunțuri», sobre anuncios).

| id              | Componente                   | Regla automática (¿hay contenido?)   |
| --------------- | ---------------------------- | ------------------------------------ |
| `announcements` | `AnnouncementBlockComponent` | `AnnouncementsService.hasActive()`   |
| `socials`  | `SocialsBlockComponent`  | `socials.length > 0`               |
| `streams`  | `StreamsBlockComponent`  | siempre                            |
| `gallery`  | `GalleryBlockComponent`  | `mediaEvents.length > 0`           |
| `weekly`   | `WeeklyBlockComponent`   | `weeklyProgram.length > 0`         |
| `upcoming` | `UpcomingBlockComponent` | `ScheduleService.hasUpcomingEvents()` |

`location` existe como bloque (`LocationBlockComponent`) pero **sólo se muestra
en la web pública**, no en la proyección.

Los anuncios van **primero**: son lo que la congregación necesita leer antes
de que empiece el programa. Un bloque de anuncios forzado a visible sin
anuncios vigentes produce una única diapositiva con el estado vacío.

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

## Anuncios uno a uno

Bajo el bloque «Anunțuri» del panel, cada anuncio vigente tiene su propia
casilla (`PresentationBlocksService.setAnnouncementVisible`), con el resumen
«se proyectan n de N». Ocultar un anuncio es una decisión **de proyección**:
sigue publicado en `/anunturi` y conserva su caducidad. Los ids ocultos se
guardan en `localStorage['iglesia-redes.presentation.announcements.hidden']`;
«Restablecer» los limpia. Si se ocultan todos y no hay otro bloque activo, el
carrusel recurre al primer bloque con contenido: nunca se queda en negro.

## Duración por bloque

Cada diapositiva dura lo que su bloque tenga fijado
(`PresentationDisplayService.durationFor`, en segundos). Valores por defecto:

| Bloque          | s  | Por qué                                              |
| --------------- | -- | ---------------------------------------------------- |
| `announcements` | 30 | se leen, y hay que darles tiempo a los más lentos     |
| `upcoming`      | 15 | dos eventos con fecha, título y descripción por página |
| resto           | 12 | contenido que se reconoce, no se lee                  |

El operador lo ajusta en el panel con `−` / `+` (pasos de 5 s, entre 5 y 120)
en cada fila de bloque; pulsar el valor lo devuelve al defecto y «Restablecer»
devuelve todos. Cambiar la duración de la diapositiva en pantalla **reinicia su
temporizador** (la duración es una signal que lee el `effect` del carrusel).
Persistencia: mismo `localStorage['iglesia-redes.presentation.display']` que
el QR. Los defectos viven en `DEFAULT_DURATIONS_S`; un bloque nuevo **debe**
añadirse ahí (el tipo lo exige).

## Ajustes del QR (mostrar / tamaño)

Misma barra de controles, debajo de los bloques (`PresentationSettingsComponent`
→ `PresentationDisplayService`):

- **Mostrar el QR**: interruptor o tecla `Q`. Sin QR, `.stage` lleva
  `stage--no-qr`: el contenido ocupa todo el lienzo y los bloques se recolocan
  (redes 2×2, transmisiones en 3 columnas con miniatura arriba, programa en 2
  columnas; anuncios y galería escalan solos). Ver `_projection.scss` § 11.
- **Tamaño**: `S` / `M` / `L` → `data-qr-size` en `.stage` → `--pj-qr-col`
  (34u / 44u / 56u). Regla 1:10 (lado ≈ distancia de escaneo ÷ 10): en una
  pantalla de ~3 m, «M» se escanea desde ~7 m y «L» desde ~10 m. Por defecto
  «M»: el contenido es el protagonista.
- Todo lo que cambia el lienzo (QR sí/no, tamaño) reajusta las diapositivas de
  anuncio automáticamente (`appFitToBox`, ver `35-announcements.md`).

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
| `F`          | Entrar / salir de presentación             |
| `Esc`        | Salir del modo simulado                    |
| `←` `→`      | Diapositiva anterior / siguiente           |
| `PageUp/Down`| Igual que las flechas                      |
| `Espacio`    | Pausar / reanudar                          |
| `Q`          | Mostrar / ocultar el código QR             |
| `1`…`9`      | Ir a la diapositiva n-ésima **de las activas** |

Salvo `F` y `Esc`, sólo actúan en modo presentación. El panel de bloques hace
`stopPropagation()` mientras está abierto para no disparar estos atajos.

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

`shared/qr-panel`, cargado con `@defer (on idle)`. Codifica siempre
`config.publicUrl` (no la URL del navegador) para que apunte a producción
aunque se esté proyectando desde `localhost`.

- Corrección de errores **`M`**, no `H`: en pantalla no hay roturas que
  corregir y `H` sólo añade módulos (41×41 → 33×33 con esta URL). A igual
  tamaño, módulos un 24 % mayores = se escanea desde más lejos.
- El componente está encapsulado: la proyección lo escala por variables
  (`--qr-frame-pad`, `--qr-frame-radius`, `--qr-gap`, `--qr-caption-size`,
  `--qr-caption-weight`, `--qr-caption-color`), fijadas en `.stage.is-fullscreen .qr`.
- Su anchura la decide el operador (ver «Ajustes del QR»); el marco es siempre
  cuadrado y nunca supera la altura disponible.

## Versículo del panel

El pie del escenario usa `verse.stage_text` / `verse.stage_reference`
(Psalmul 84:10). La portada tiene el suyo propio (`verse.text` /
`verse.reference`): cambiar uno no cambia el otro.
