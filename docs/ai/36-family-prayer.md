# 36 · Rugăciune pentru familii (oración semanal por las familias)

> Lee este shard antes de **añadir una semana de familias**, cambiar su diseño
> o tocar el bloque proyectable `families`.

## Qué es

Cada domingo la iglesia presenta unas pocas familias (normalmente 5, por orden
alfabético) por las que se ora **la semana siguiente**: un resumen con todas y,
después, una ficha por familia con su foto, sus hijos y su motivo de oración o
un versículo. Antes era un PowerPoint; ahora es un módulo:

| Dónde | Qué se ve |
| --- | --- |
| Web `/rugaciune-pentru-familii` | **Feed de semanas**: la en curso arriba y, al bajar, las anteriores (resumen + fichas de cada una), con índice lateral |
| Web `/rugaciune-pentru-familii/<domingo>` | El mismo feed, colocado en esa semana (enlace para compartir) |
| `#<id>-<domingo>` sobre esa URL | Salta a la ficha de una familia (botón «Distribuie»). Se sigue aceptando el formato antiguo `#<id>` |
| Proyección, bloque `families` | **Resumen (mosaico de fotos) + una diapositiva por familia**, justo detrás de los anuncios |
| `/anunturi` | Tarjeta de acceso encima de los anuncios (`FamilyPrayerTeaserComponent`) |
| Menú | Program → «Rugăciune pentru familii» (icono `hand-heart`) |

Las páginas llevan **`noindex`** (`RouteSeo.noindex`): son fotos y nombres de
familias con menores; se comparten por enlace pero no salen en buscadores.

## Qué semana se muestra

Misma regla que el plan de lectura: la semana que contiene **mañana**
(`FamilyPrayerService.current`). El domingo ya se ven las familias que se
presentan ese día (se ora por ellas de lunes a domingo); de lunes a sábado, las
de la semana en curso. Si el domingo aún no está cargada la siguiente, se
mantiene la de hoy. Las semanas cargadas por adelantado no se publican hasta su
turno (`byDate` devuelve `null` para las futuras).

## Feed de semanas, carga progresiva e índice (30/09/2026)

Pedido del usuario: que la semana anterior «se despliegue sola» al bajar, sin
saturar la página, y un índice como el de la confesión de fe.

- **Todas las semanas están en el documento desde el principio** (`<section
  id="saptamana-<domingo>">`), pero el contenido de cada una sólo se pinta al
  acercarse: mientras tanto, un **esqueleto** con el alto aproximado
  (`--fw-card`: 34 rem por ficha en escritorio, 54 rem < lg; medido). No es
  el «scroll infinito» que va añadiendo al final: así la barra de scroll dice
  la verdad, el índice salta a cualquier semana y **el pie sigue alcanzable**.
- Disparador: `shared/near-viewport` (`appNearViewport`), **un único
  `IntersectionObserver`** para toda la app con 1,5 pantallas de
  anticipación; avisa una vez y deja de observar (lo pintado no se despinta).
  No es `@defer (on viewport)`: `@defer` trocea código (aquí no hay nada que
  trocear) y no deja anticiparse ni forzar una semana desde fuera.
- Se pinta de entrada la primera semana y la de la URL. El contenido que
  llega entra con un fundido que sube (sólo transform/opacidad).
- **Anclaje de scroll** (que la vista no salte cuando se pinta algo por
  encima): `overflow-anchor: none` en el esqueleto (desaparece al pintar) **y
  en el índice** (sticky y antes del feed en el DOM: el navegador lo elegía
  como ancla y no compensaba nada; los saltos caían 300 px más abajo).
- Separador entre semanas: «Săptămâna trecută / Acum N săptămâni» + número.
- **Índice** = `app-doc-toc` (el de la confesión de fe): columna de 16 rem
  desde `xl`; por debajo, hoja desde el dock (se abre ya desplegada y el dock
  sube encima de ella, `--doc-toc-sheet-h`). Al llegar al pie la hoja se
  retira como el dock (`DockOverlapService.duplicateVisible`, misma curva);
  la barra del teléfono del Credo, también. Una entrada por semana (número +
  «21–27 sept») y, **sólo bajo la semana activa, sus familias** (el índice no
  crece con los años). Salto **seco** (`instantJump`): uno suave cruza las
  semanas de en medio, las manda pintar y acaba descolocado. Ojo: `auto` no
  vale, hereda el `scroll-behavior: smooth` del `html`; es `instant`.
- Enlace de entrada (`/<domingo>`, `#…`): la página salta ella (el
  `anchorScrolling` del router llega antes de pintar) y durante 1,5 s
  **re-alinea** el destino si el documento cambia de alto (fuentes, fotos),
  salvo que el usuario ya se haya movido.
- Ancla de ficha `<id>-<domingo>` (`PrayerFamilyView.anchor`): la rotación
  repetirá familias y el `id` a secas se duplicaría en el feed.

## Añadir una semana (receta)

1. Fotos: una por familia, con el nombre de la familia como nombre de fichero.

   ```bash
   node scripts/import-family-photos.mjs "C:/…/FAMILI_2026/2026-10-04" 2026-10-04
   ```

   La fecha es el **domingo** en que se presenta. Vacía la carpeta de esa
   semana y genera `src/assets/family-prayer/<domingo>/<id>-{480,960,1600}.webp`
   (lado mayor; si el original es menor, el tamaño mayor es el original, nunca
   se amplía), Lanczos3 + enfoque suave, WebP q84 `smartSubsample`, **sin
   metadatos** (EXIF/GPS fuera; orientación aplicada; sRGB). Después
   **regenera el manifiesto** `core/family-photos.generated.ts` leyendo el
   disco (todas las semanas): medidas y anchos reales. No se edita a mano;
   `--manifest` sólo lo regenera. Mejor originales PNG a buena resolución
   (≥ 1600 px de lado mayor): el script avisa si una foto no llega.
2. `src/app/core/family-prayer.config.ts` → nuevo `PrayerWeek`
   (`number`, `presentedOn`, `families`) **en el orden del resumen** (es el
   orden de las diapositivas). Por familia: `surname`, `names`, `children`,
   `message` (un párrafo por elemento), `verse` `{ text, reference }` y
   `single: true` si es una persona sola. La foto no se declara: la aporta el
   manifiesto por `<domingo>/<id>`.
3. Texto: en rumano tal como lo escribe la familia; **sólo** se corrigen
   erratas y diacríticos (ș ț con coma, «și» no «si»). No se reescribe ni se
   acorta: es su voz. Si falta el mensaje, se omite y la ficha invita a orar.
4. Comprobar la proyección con y sin QR (ver abajo).

Sin foto todavía: no hay entrada en el manifiesto y se pinta un monograma;
cuando llegue, basta con ejecutar el script.

**Tamaño servido (`srcset` + `sizes`)**: el resumen usa las tres variantes; la
ficha **nunca la de 480** (`srcsetDetail`): Chrome elige por la media
geométrica de densidades y con la miniatura en la lista la escogía para pintar
a ~480 px, ampliada. `sizes` sale de la maquetación (`FamilyCardComponent.sizes`).

## Diseño (decisiones)

- **La foto va SIEMPRE entera** (`FamilyPhotoComponent`, `contain`; el hueco,
  si lo hay, lo rellena la misma foto difuminada). Nunca `cover`: son fotos de
  grupo y el usuario rechazó cualquier recorte (29/09/2026).
- **Ficha web ≥ lg: foto entera Y de arriba abajo** (29/09/2026). Ambas cosas
  sólo se cumplen si alto de la foto (ancho ÷ proporción) = alto de la ficha,
  que depende del texto: dependencia circular que CSS no resuelve. Por eso
  `FamilyCardComponent.fitPhotoColumn` mide (clase `fcard--measuring`, panel a
  su alto natural) y fija `--fcard-photo-w` = el MENOR ancho con el que la foto
  es al menos tan alta como el texto; un espaciador `::before` con la
  proporción fija el alto de la fila. Barrido en 16 pasos + bisección (no basta
  bisecar entre extremos: con la columna de texto estrecha el texto crece más
  deprisa que la foto). Límites: foto ≥ 15 rem y ≥ 34 % (`size` compact 30 %,
  large 44 %), texto ≥ 20 rem. **Alto mínimo común** de la foto: min(24 rem,
  55 vh) × proporción, sin pasar del ancho real de la foto (tope de calidad);
  así una familia con poco texto no sale con una foto la mitad de grande que
  las demás. Y la vertical no pasa de min(36 rem, 75 vh) sólo por cumplir el
  mínimo. Se recalcula al cambiar el ancho, al cargar las fuentes y al
  entrar/salir de proyección. Barra de compartir anclada al pie (columnas flex).
- **Formato automático ≥ lg** (29/09/2026, noche) — tres formatos:
  · **Al lado** (arriba): vertical, cuadrada o apaisada suave.
  · **Banda** (`fcard--banner`, en plantilla: `frameRatio ≥ 1,45`): foto arriba
    a todo el ancho, entera (tope 90 vh), texto debajo. Al lado, una
    panorámica quedaba del alto del texto y la gente diminuta.
  · **Revista** (`fcard--wrap`): ningún ancho «al lado» vale (mucho texto). La
    foto flota a su alto de referencia (≤ 50 % de la ficha) y el texto la
    rodea y sigue por debajo. Sin `max-width` en `ch` en el texto: se cuenta
    desde el borde de la ficha y dejaba 46 px junto a la foto.
  Sustituye a `fcard--stacked` (foto arriba a todo el ancho: una vertical se
  comía la pantalla).
- **Texto en dos columnas cuando sobra ancho**: container query sobre
  `.fcard__panel` (≥ 46 rem): quiénes son | mensaje. Sirve igual para la banda
  y para «al lado» en pantalla ancha. La página ya no tiene tope de 68 rem:
  ocupa la columna común como el resto; la medida de lectura la guarda el texto.
- **< lg**: foto arriba a todo el ancho a su proporción, tope 70 vh (entonces
  lados difuminados). Acabado: radio 18 px, sombra en capas, la ficha se eleva
  al pasar el ratón (la foto no se toca). Sin acento oro sobre el nombre
  (retirado a petición del usuario). Todo va bajo `.fcard--web`.
- **Controles para una foto incontrolable** (`PrayerFamily.photo` en la
  configuración, sólo si hace falta): `size: 'compact' | 'large'` (alto de
  referencia 18 / 30 rem) y `frame: <ancho/alto>` (fuerza el marco; la foto
  va entera dentro y el hueco lo rellena ella misma difuminada).
- **Resumen web**: mosaico 4:5 (`auto-fit`, llena el ancho); en móvil, filas
  (foto · número · nombre). El número anticipa el orden de las fichas.
- **Proyección, a sangre** (decisión del usuario, 28/09/2026): las
  diapositivas de familias **ocupan la pantalla entera**, sin área segura ni
  esquinas redondeadas (`.stage--bleed`, lo activa `StageComponent.bleed()`
  cuando la diapositiva en curso es del bloque `families`; la firma ELIM pasa
  a blanco sobre el navy). Lenguaje del PowerPoint de la iglesia (foto a
  sangre + panel sólido) en navy y oro. **Manda la foto.** **Sin numeración**
  en ningún sitio (ni «02 / 05», ni en la lista, ni sobre las fotos, ni en la
  web): no es relevante.
  - Resumen = `FamilyCollageComponent` (no el mosaico web): panel navy a
    sangre con rótulo, semana y nombres en el orden de lectura de las fotos
    (con `appFitToBox`; el relleno va en el hijo medido, si no el autoajuste
    no ve desbordes menores que el relleno) y **collage justificado**
    (`justified-layout.ts`, función pura): prueba todas las particiones en
    1-3 filas sin cambiar el orden y se queda con la que más área cubre, fotos
    enteras y a su proporción; la lista se lleva el ancho que el collage no
    usa, así nunca queda hueco.
  - Ficha = foto + **panel** (`.fcard__panel` → `id` + `body`). El panel es
    UN bloque con escala tipográfica fija (rótulo 3,2 · nombre 8 · nombres
    5,6 · hijos 3,8 · mensaje 4,6 · versículo 3,8 · referencia 3,2, × `--fit`)
    que se ajusta **entero** (`appFitToBox` 0,7 → 1,4) y **arranca arriba**
    (revisión del 29/09/2026: centrado «flotaba»): la jerarquía nunca cambia
    y el texto crece o encoge según el sitio. Márgenes en tokens
    (`--fcard-pad-*`: arriba 5u, lados 4,5u, abajo 8u = franja del rótulo),
    siempre en el hijo medido.
    **Sin filetes, iconos, bordes ni numeración** (revisión del 28/09/2026,
    «parece descontrolado»): separa el espacio.
    **Retrato**: foto pegada al borde a todo el alto, ancho = alto ×
    proporción (entre 30 % y 58 %; 50 % con texto largo) → sin bandas.
    **Apaisada** (≥ 6:5, como los Bena del PowerPoint): el panel se abre
    (`display: contents`); foto arriba a la izquierda (≤ 62 % de ancho, ≤ 64 %
    de alto, alto por `aspect-ratio`), quiénes son justo debajo y el mensaje a
    la derecha, desde arriba, con su propio autoajuste (relleno en `.fcard__inner`).
  - Rótulo «RUGĂCIUNE PENTRU FAMILII»: **firma pegada a la esquina inferior
    derecha** de la diapositiva (absoluto sobre `.fcard`, siempre navy),
    3,2u (el suelo legible; se compacta con interletra 0,04em y peso 600), a 1,6u/1,4u del rincón, versalitas oro al 55 %, fuera del flujo y sin `--fit`. El relleno
    inferior del texto le reserva su franja. En la web no se pinta.
  - La regla web de las apaisadas (`max-height: 30rem`) **no debe filtrarse**
    a la proyección: se anula con `max-height: none` (en pantallas grandes
    30rem encogía la foto y dejaba bandas y un hueco bajo ella).
  - Collage: la lista es un bloque (no flex) con el relleno en el hijo que
    mide `appFitToBox` y `flex: 1 0 auto` en la lista; si no, lo que no cabía
    pisaba el relleno inferior sin contar como desborde.
  - **Mensaje y versículo = dos voces** (29/09/2026): el mensaje (la
    familia) en sans blanco al 88 % y el versículo (la Escritura) en serif
    cursiva oro. **Sin comillas ni firma** (se probaron y el usuario las
    quitó). Con mensaje, el versículo es el cierre: un escalón por debajo
    (`caption`), separado por 3u. **Referencia = nota al pie**: caja baja
    («1 Corinteni 15:57»), Inter 500, sin interletra, blanco al 55 %, siempre
    3,2u (también en solo versículo). Las versalitas espaciadas en oro la
    hacían destacar más que el versículo; mismo criterio en los anuncios
    (`.announcement__verse-ref`). Sólo versículo: es el mensaje → `lead`. `text-wrap: pretty` en ambos.
  - **Tope del texto corrido**: mensaje y versículo usan `text-fit()`
    = encoge con `--fit` pero crece como mucho × 1,15; si el panel crece a
    1,4 el sobrante va a los espaciados, no a la letra (el mensaje no
    compite con el apellido).
  - «Copiii:» atenuado y peso normal (como «Familia»); los nombres de los
    niños en blanco 600, `text-wrap: balance`. Entre etiqueta y nombres va
    `&ngsp;` (Angular borra el espacio entre dos elementos).
  - Relleno inferior 8u: la referencia del versículo (oro, versalitas) no
    debe acercarse al rótulo de la esquina, que tiene el mismo estilo.
  - Versículo en serif oro sobre navy; si no hay mensaje, sube a `body`.
  - Fotos `eager` al proyectar (en diapositivas ocultas `lazy` dejaba el marco
    vacío un instante).

## Ficheros

| Fichero | Papel |
| --- | --- |
| `core/family-prayer.config.ts` | Tipos y datos (una entrada por semana) |
| `core/services/family-prayer.service.ts` | Semana actual, archivo, vistas, fechas |
| `features/family-prayer/family-prayer.component.*` | Página `/rugaciune-pentru-familii[/:week]`: feed, esqueletos, índice |
| `shared/near-viewport/` | «Pinta cuando se acerque»: un `IntersectionObserver` compartido |
| `shared/doc-toc/` | Índice lateral (compartido con la confesión de fe) |
| `features/family-prayer/family-summary/` | Resumen web (mosaico enlazado) |
| `features/family-prayer/family-collage/` | Resumen proyectado: collage justificado + lista (`justified-layout.ts`, función pura) |
| `features/family-prayer/family-card/` | Ficha (web + proyección, hoja global) |
| `features/family-prayer/family-photo/` | Foto entera + fondo difuminado / monograma |
| `features/family-prayer/family-prayer-teaser/` | Acceso desde `/anunturi` |
| `features/stage/blocks/family-block/` | Bloque del escenario (resumen o ficha según la diapositiva) |
| `scripts/import-family-photos.mjs` | Fotos → WebP 480/960/1600 sin metadatos + manifiesto |
| `core/family-photos.generated.ts` | Manifiesto GENERADO (medidas y variantes por `<domingo>/<id>`) |
| `shared/fit-to-box/` | Autoajuste (compartido con los anuncios) |
| `assets/i18n/{es,ro}.json → family_prayer.*`, `nav.family_prayer*`, `seo.family_prayer.*` | Textos de interfaz |
