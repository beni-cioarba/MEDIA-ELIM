# 48 · Carruseles y tarjetas de promoción (línea nueva)

> **Este shard no deriva de `47-design-language.md`.** Es una línea de diseño
> **nueva**, calcada de la referencia que el proyecto tomó para estos bloques
> (`play.google.com/store/apps`). Cuando se monte un bloque de este tipo —un
> carrusel, una tarjeta de promoción, una sección que tenga que entrar por los
> ojos— la referencia manda sobre el catálogo `ui-*`.
>
> Regla de convivencia, para que la app no se parta en dos: **el catálogo sigue
> mandando en todo lo demás** (páginas editoriales, listas, formularios,
> consola). Lo de aquí es para los bloques de escaparate.

## Qué se midió (y cómo)

No se miró una captura: se abrió `play.google.com/store/apps` y se leyeron los
valores con `getComputedStyle`, en dos tamaños de ventana.

**Tarjeta grande** (ventana de 1512 px) — es la que se usa aquí:

| Pieza | Valor medido |
| --- | --- |
| Tarjeta | **526 × 394** · radio 8 · fondo tonal propio (`rgb(70, 11, 90)`) |
| Foto | **526 × 296 (16:9)**, a sangre: el **75 %** de la tarjeta |
| Titular | **24 px / 500 / interlínea 32**, **encima de la foto**, a 24 px de los lados |
| Descripción | **18 px / 400 / interlínea 24**, justo debajo del titular, también encima de la foto |
| Insignia | alto 32 px · `rgba(32,33,36,.7)` · texto 16 px / 500 · radio `8px 0` |
| Pie | alto **98 px** · relleno **24** · icono **48 × 48 radio 12** + dos líneas + botón |
| Pista | `flex` · **hueco 24 px** · `scroll-snap-align: start` en cada tarjeta |

**Tarjeta pequeña** (ventana de 1024 px): 385 × 278, foto de 2,62:1, pie de
66 px, hueco de 16 px. Misma anatomía, todo a escala.

## Las cuatro cosas que hacen que funcione

Son fáciles de perder por el camino, y perder cualquiera convierte la tarjeta
en una ficha:

1. **La foto manda.** Tres cuartos de la tarjeta, a sangre. Con una foto de un
   tercio deja de ser un escaparate.
2. **El texto va ENCIMA de la foto**, no debajo. Es lo que da sensación de
   cartel en vez de ficha, y lo que permite que la foto siga siendo grande.
3. **El color sale de la foto.** Play extrae el tono dominante de cada imagen;
   por eso no se ve costura. Aquí se midió el color medio de cada imagen con
   canvas (descartando sombras y focos), se conservó su matiz y se le dio
   cuerpo (saturación 0,32 · luminosidad 0,20).

   | Foto | Matiz medido | Tono | Blanco encima |
   | --- | --- | --- | --- |
   | `concert_colinde` | 180 (verdeazul) | `#234343` | 10,7:1 |
   | `zambetul_cutie` | 291 (violeta) | `#3f2343` | 13,7:1 |
   | `botez` | 214 (azul) | `#233143` | 13,2:1 |
   | `concert_copii` | 0 (cálido) | `#432323` | 14,0:1 |

4. **Dos líneas de texto, no una.** Titular *y* descripción. Con sólo el
   titular la tarjeta no informa; con una lista de filas y filetes deja de ser
   escaparate y pasa a ser una tabla con scroll (ya se probó: no funciona).

## Dos tipos de portada

La referencia vende apps y siempre tiene una imagen que vale. Aquí no: una foto
de la congregación no explica qué se estudia el miércoles. De ahí la segunda
variante, que es la única desviación de fondo respecto a la referencia.

| Portada | Cuándo | Qué lleva |
| --- | --- | --- |
| **`photo`** | La sección tiene una imagen que dice algo (anuncios, eventos) | Foto a sangre + velo + titular y descripción encima |
| **`data`** (`promo__cover--data`) | El contenido de la sección **es una agenda** (programa semanal, plan de lectura) | El tono de la tarjeta con trama diagonal y halo, el icono de la sección de marca de agua, y **la semana comprimida**: día · qué · hora, tres líneas |

La regla detrás: **ninguna foto de archivo informa tanto como el propio dato
bien puesto**. Si hay que elegir entre una imagen de relleno y la agenda de la
semana, gana la agenda.

## Qué lleva cada tarjeta

Todo lo que ya existía en el modelo de datos y no se estaba usando:

| Tarjeta | Titular | Descripción | Pie (línea 2) | Agenda |
| --- | --- | --- | --- | --- |
| Programa semanal | Día · hora del próximo culto | Título del culto | Descripción de la sección | El resto de la semana (3 líneas) |
| Anuncios | Título del anuncio | **`lead`**: el resumen de 1-2 frases que ya traía el modelo | Fecha · hora · **lugar** | — |
| Eventos | Título del evento | `description` del evento | Fecha · hora · **predicador** | — |
| Lectura bíblica | Pasaje de hoy | **`summary`**: el tramo de toda la semana | Día · fecha | Las 3 lecturas siguientes, con su **Nuevo Testamento** |

## Cómo se comporta el carrusel

- **Ancho**: la pista sangra hasta el borde de la pantalla y el sangrado
  interior es el margen real de la página (`--board-gutter`), así la primera
  tarjeta queda alineada con el título de la sección y la última puede llegar
  al borde. Es lo que hace la referencia con sus 40 px.
- **Cuántas se ven**: el ancho es `clamp(19rem, 38vw, 33rem)`. En la
  referencia la tarjeta ocupa el 35 % de la ventana; aquí el 38 %, así que se
  ven dos y media y **asoma la siguiente** — el asomo es lo que invita a
  deslizar.
- **Flechas**: aparecen **al apuntar el carrusel** (y se quedan si el foco
  está dentro, para quien navega con teclado). Nunca en táctil: ahí se desliza.
  En el extremo se apagan en vez de desaparecer.
- **No se expande a pantalla completa** en monitores grandes: el contenido se
  queda en la columna de la página y lo que crece es cuántas tarjetas se ven.
  Estirar las tarjetas a 800 px las convertiría en banners.

## Cómo se enseña «todo» sin anidar carruseles

La pregunta natural cuando una sección tiene varios elementos es «¿meto un
carrusel dentro de la tarjeta?». **No.** Dos zonas de deslizamiento anidadas se
pelean por el gesto (deslizas y no sabes cuál se mueve), rompen la navegación
con teclado y son un problema de accesibilidad conocido. Ningún producto serio
lo hace, y la referencia tampoco: en Play **cada tarjeta es una app**, no una
categoría con apps dentro.

Aquí se aplica lo mismo:

| Contenido | Cómo se enseña | Por qué |
| --- | --- | --- |
| **Anuncios vigentes** | Franja propia encima del carrusel, una línea por aviso | Es lo único con fecha de caducidad: o se ve hoy o no sirve. Dentro del carrusel se podía pasar de largo |
| **Eventos** | **Una tarjeta por evento** (tope de cuatro) | Son elementos reales y equivalentes: es exactamente el caso del carrusel |
| **Programa semanal** | Una tarjeta con portada de datos | Es una agenda recurrente, no un evento: la tarjeta lleva la semana comprimida |
| **Plan de lectura** | Una tarjeta con portada de datos | Igual: la lectura de hoy de titular y las tres siguientes en la agenda |

Cada tarjeta de evento toma una foto y un tono distintos de la paleta medida,
en orden, así dos seguidas nunca repiten color.

## Carteles de eventos

Cuando un evento o un anuncio tiene **cartel** (el que se publica en redes),
ese cartel es la portada de la tarjeta: ya lleva la identidad del evento, su
fecha y su invitado, y ninguna foto de archivo compite con eso.

Los carteles son cuadrados o verticales y la portada es 16:9, así que se
muestran **enteros sobre una copia de sí mismos ampliada y desenfocada**
(`promo__cover--poster`) en vez de recortarlos: el recorte les cortaría el
texto, que es lo que los hace útiles. La portada de cartel es **3:2** y no
16:9: un cartel cuadrado dentro de un marco muy apaisado sale diminuto.

**Y sobre el cartel no va texto.** El primer intento le puso encima el titular
y la descripción, como en las portadas de foto, y el resultado fue que la
tarjeta tapaba justo lo que había que leer y repetía lo que el cartel ya decía.
Cuando la portada es un cartel, la tarjeta se limita a la **insignia** (cuánto
falta) y al **pie** (a qué sección pertenece, hora, predicador): información
que el cartel no da.

Para añadir uno: se deja el fichero en `src/assets/posters/` (tal cual salga de
Canva), se ejecuta **`npm run posters`** —lo pasa a WebP de 1080 px y arregla el
nombre— y se apunta en el campo `poster` del evento o del anuncio. Si el fichero
falta o la ruta está mal, la tarjeta **cae a su portada de foto** en vez de
enseñar una imagen rota. Instrucciones completas en
`src/assets/posters/README.md`.

## Avance automático y bucle sin fin

Opcional (`autoplayMs`, en la portada son 5 s). La WCAG 2.2.2 no lo prohíbe:
exige poder pararlo. Se para **con el puntero encima, con el foco dentro, con
la pestaña oculta, con `prefers-reduced-motion` y en cuanto el usuario mueve el
carrusel**: si alguien ha deslizado o ha pulsado una flecha, ya está eligiendo
él, y seguir moviéndolo sería pelearse con él. Sólo avanza si hay más tarjetas
de las que caben.

**Cómo se detecta que el usuario ha tomado el mando.** Por el propio `scroll`
horizontal, comparando con la marca de tiempo del último desplazamiento que
hicimos nosotros. Dos formas de hacerlo mal, las dos probadas aquí:

- *Escuchar `wheel`, `pointerdown` y `touchstart` sobre la ventana.* Bajar la
  página con la rueda **encima** del carrusel se contaba como gesto sobre él, y
  el avance se paraba para siempre sin que nadie lo hubiera tocado. Es el fallo
  que hacía que pareciera que el autoplay no funcionaba.
- *Medir y detectar en el mismo callback.* La medición inicial, que no es
  ningún gesto, marcaba el carrusel como tomado por el usuario antes incluso de
  empezar.

**Bucle sin fin** (`loop`). Volver al principio al llegar al final se ve como
un rebobinado y parece un fallo. Con `loop` la lista se pinta **dos veces** y,
al pasar de la primera copia, el desplazamiento retrocede el ancho de una copia
**de golpe**: delante hay exactamente lo mismo, así que la costura no se ve y
el carrusel parece infinito. Es la única forma de conseguirlo con
desplazamiento nativo y anclaje.

Dos consecuencias que hay que respetar:

1. Las tarjetas se pasan **como plantilla** (`<ng-template>`), no proyectadas:
   `ng-content` sólo se puede pintar una vez.
2. La segunda copia se marca `aria-hidden` e `inert` después de pintar. Si no,
   un lector de pantalla anunciaría diez tarjetas donde hay cinco, y el
   tabulador pasaría dos veces por los mismos enlaces.

## Arrastre con el ratón

**Por qué no hay librería.** Se comprobó antes de escribir nada: Angular
Material 22 tiene 41 componentes y **ninguno es un carrusel** (`slider` es el
control de rango, `tabs` son pestañas), y el CDK instalado trae `a11y`,
`overlay` y `text-field`. Meter Swiper o Embla por un gesto de sesenta líneas,
perdiendo de paso el avance automático, el bucle y la accesibilidad ya hechos,
no compensa.

**Sólo para ratón.** En táctil el deslizamiento nativo ya existe, con su
inercia y su rebote en los extremos, y ningún JavaScript lo iguala:
secuestrarlo sería empeorarlo. El gesto se implementa para
`pointerType === 'mouse'` y el táctil se deja en paz.

Los cinco detalles que separan esto de un arrastre a medias:

1. **Captura del puntero**, para que el gesto siga aunque el ratón salga del
   carrusel o de la ventana.
2. **Se apaga el anclaje mientras se arrastra.** Con
   `scroll-snap-type: mandatory`, cada asignación de `scrollLeft` vuelve al
   punto de anclaje más cercano: el carrusel se queda pegado y no se mueve.
3. **Se recoloca a mano al soltar.** Volver a encender el anclaje no reancla
   por sí solo —el navegador espera al siguiente desplazamiento—, así que sin
   esto se queda parado a media tarjeta.
4. **Las tarjetas no reciben puntero mientras se arrastra ni un instante
   después** (`is-dragging` / `is-just-dragged` → `pointer-events: none`). Sin
   esto, soltar encima de una tarjeta navega a su sección: arrastras para
   mirar y acabas en otra página. Se hace así y **no** cancelando el clic en
   fase de captura porque es determinista: si el elemento no recibe punteros,
   no hay clic que cancelar ni orden de fases del que depender.
5. **Se anula el arrastre nativo** de imágenes y enlaces (`dragstart`), o el
   navegador empieza su propio *drag and drop* con la foto fantasma en vez de
   desplazar.

Umbral: 6 px. Por debajo, el gesto es un clic —nadie mantiene el ratón
perfectamente quieto al pulsar— y la tarjeta tiene que abrirse.

## La trampa de `min-width: auto` (leerla antes de montar una tira)

Ha mordido dos veces en este proyecto, en sitios distintos, y las dos veces el
síntoma fue el mismo: **una fila que no queda alineada**.

Un elemento flexible tiene `min-width: auto` por defecto, así que **no puede
encogerse por debajo del ancho mínimo de su contenido**. Y si dentro hay texto
con `white-space: nowrap`, ese mínimo es *la cadena entera*: `overflow: hidden`
y `text-overflow: ellipsis` no lo reducen.

Qué pasó en la tira de álbumes del menú: «Concert de Colinde · Copii»
ensanchaba su tarjeta a **213 px** frente a los 162 de las demás y, como la
foto lleva `aspect-ratio`, crecía con ella —**120 px de alto contra 91**—. De
ahí que ni las fotos ni los nombres quedaran a la misma altura.

**La regla: todo elemento flexible que contenga texto recortado lleva
`min-width: 0`.** Vale igual para las columnas de la franja de avisos, donde el
mismo descuido dejaba un dato de 523 px comiéndose su propia fila.

## Tiras que se autoajustan

`flex: 1 0 <base>` — **crece pero no encoge**. Es lo que hace que una tira se
adapte sola al número de elementos sin tocar nada:

| Álbumes | Ancho de tarjeta | Comportamiento |
| --- | --- | --- |
| 2 | 306 px (el tope) | Llenan sin deformarse |
| 5 | 257 px | **Llenan la fila exacta**, 0 px sobrantes |
| 8 | 162 px (la base) | Se desplaza |
| 12 | 162 px (la base) | Se desplaza |

Las dos piezas que lo consiguen: `flex-grow: 1` reparte el sitio sobrante entre
todos por igual; `flex-shrink: 0` impide que se aplasten cuando sobran, así que
en vez de encogerse hasta ser ilegibles, la tira se desplaza. Y un `max-width`
evita que con dos elementos cada tarjeta se vaya a medio panel.

## Se adapta al contenido: crece, se centra o se desplaza

Un carrusel con pocos elementos no debe parecer un carrusel roto. Tres estados,
y los tres salen de la misma medida (`overflows()`):

| Elementos | Ancho de tarjeta | Fila | Flechas |
| --- | --- | --- | --- |
| Caben de sobra (2) | **crece** hasta 1,15× la base | **centrada** | ocultas |
| No caben (6, 10) | la base | a la izquierda | visibles |

Las dos piezas: `flex: 1 0 <base>` —crece pero **no** encoge, así que cuando
sobran elementos la pista se desplaza en vez de aplastar las tarjetas— y la
clase `is-fitted`, que centra la fila cuando no hay nada que recorrer. El tope
de 1,15× evita que con dos tarjetas cada una se vaya a media pantalla y deforme
su portada.

**Y hace falta un `MutationObserver`, no sólo un `ResizeObserver`.** Son dos
cosas distintas: el *tamaño* cambia al redimensionar o al cambiar de idioma; el
*contenido* cambia cuando entra un evento o caduca un anuncio, y eso **no mueve
ni un píxel de la caja**, así que el `ResizeObserver` no se entera. Sin el
segundo observador, `overflows()` se queda con el valor de la primera medición
y las flechas, el centrado y el avance automático deciden sobre un dato viejo.

## En una portada de datos, el destacado va arriba

Las portadas de foto ponen el texto **abajo**, sobre la imagen: es lo que hace
la referencia y es correcto. Las de datos heredaron esa posición y el resultado
fue una tarjeta que se leía al revés:

- primero «el resto de la semana», después lo de hoy;
- y el dato grande, sin rótulo y al final, no se sabía de qué era: «Isaia
  63-64» podía ser la lectura de hoy, la de la semana o cualquier otra cosa.

Ahora el destacado encabeza la tarjeta y la lista va debajo, separada por un
filete. **Hace falta `order: -1`**, no basta con `justify-content`: en el
marcado la lista va primero (las dos portadas comparten plantilla) y
`justify-content` reparte el espacio pero no reordena.

Y la insignia dice **cuándo**, no en qué semana del plan estamos: «Săpt. 91»
arriba con un pasaje sin rótulo debajo no situaba nada. El número de semana
pasa a la descripción —«Semana 91 · Isaia 57-66, Ieremia 1-4»—, donde sitúa sin
estorbar, y la insignia queda para «AZI» o el día.

## Reglas para el próximo carrusel

1. **Cuándo sí.** Hay más elementos equivalentes de los que caben y ninguno es
   imprescindible por sí solo. Si algo tiene que verse sí o sí, no va en un
   carrusel: lo que queda fuera de pantalla, para la mayoría, no existe.
2. **El asomo no es opcional.** El ancho de tarjeta se elige para que la
   siguiente asome. Sin ese corte visual nadie desliza.
3. **Nunca gira solo.** El único carrusel automático de la app es la portada
   (`app-hero-carousel`), que además se para al apuntarla. Un carrusel de
   contenido que se mueve mientras se lee incumple WCAG 2.2.2.
4. **La mecánica ya está hecha**: `ui-carousel*` (en `_primitives.scss`,
   medido de la referencia) y `<app-card-carousel>` para el estado de las
   flechas. No se reimplementa el scroll.
5. **La tarjeta lleva color propio, y sale de su foto.** Un carrusel de
   tarjetas blancas sobre fondo claro no es un carrusel, es una tabla con
   scroll. El tono se mide (canvas), no se elige a ojo.
6. **Un titular y nada más.** Lo más importante, grande y de peso normal. Sin
   listas dentro de la tarjeta: lo secundario está en la sección.
7. **Toda la tarjeta es un enlace** (como en la referencia). Nada de enlaces
   dentro de enlaces: si un elemento concreto necesita su propio destino, esa
   tarjeta no es de promoción, es una lista.
8. **Accesibilidad**: la ventana del carrusel lleva `tabindex="0"` (WCAG
   2.1.1), el grupo se anuncia con `aria-roledescription="carrusel"`, las
   flechas se deshabilitan en los extremos y desaparecen enteras cuando no hay
   nada que desplazar. Con `prefers-reduced-motion` el desplazamiento deja de
   ser suave y la foto no hace zoom.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Mecánica del carrusel (pista, ajuste, flechas, degradados) | `src/styles/_primitives.scss` → `ui-carousel*` |
| Estado de las flechas y de los bordes | `src/app/shared/card-carousel/card-carousel.component.ts` |
| Tarjeta de promoción | `src/styles/_showcase.scss` → `.promo*` |
| Datos de las tarjetas (una por sección) | `home.component.ts` → `boardCards()` |
| Ejemplo vivo | `/stil` → «Carrusel y tarjeta de promoción» |
