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
| Web `/rugaciune-pentru-familii` | La semana en curso: resumen (mosaico) + fichas + archivo de semanas pasadas |
| Web `/rugaciune-pentru-familii/<domingo>` | Una semana concreta (enlace para compartir); si ya pasó, aviso + enlace a la actual |
| `#<id>` sobre esa URL | Salta a la ficha de una familia (botón «Distribuie» de cada ficha) |
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

- **La foto va siempre entera** (`FamilyPhotoComponent`): son fotos de grupo en
  cualquier formato (0,56 → 1,78). Se encaja con `contain` y el hueco lo rellena
  la misma foto difuminada y oscurecida. Nunca `object-fit: cover`.
- **Ficha web**: dos columnas (marco con la proporción de la foto, nunca más
  estrecho que 4:5 · texto a 62ch). Foto apaisada
  (≥ 6:5) → arriba a todo el ancho con tope de 30 rem. Móvil: foto arriba con
  su proporción (mínimo 4:5).
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
| `features/family-prayer/family-prayer.component.*` | Página `/rugaciune-pentru-familii[/:week]` |
| `features/family-prayer/family-summary/` | Resumen web (mosaico enlazado) |
| `features/family-prayer/family-collage/` | Resumen proyectado: collage justificado + lista (`justified-layout.ts`, función pura) |
| `features/family-prayer/family-card/` | Ficha (web + proyección, hoja global) |
| `features/family-prayer/family-photo/` | Foto entera + fondo difuminado / monograma |
| `features/family-prayer/family-prayer-teaser/` | Acceso desde `/anunturi` |
| `features/stage/blocks/family-block/` | Bloque del escenario (resumen o ficha según la diapositiva) |
| `scripts/import-family-photos.mjs` | Fotos → WebP 480/960/1600 sin metadatos + manifiesto |
| `core/family-photos.generated.ts` | Manifiesto GENERADO (medidas y variantes por `<domingo>/<id>`) |
| `shared/fit-to-box/` | Autoajuste (compartido con los anuncios) |
| `shared/styles/_past-archive.scss` | Archivo plegable (compartido con los anuncios) |
| `assets/i18n/{es,ro}.json → family_prayer.*`, `nav.family_prayer*`, `seo.family_prayer.*` | Textos de interfaz |
