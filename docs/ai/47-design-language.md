# 47 · Lenguaje visual (el «cómo se ve» de la app)

> Este shard manda sobre el aspecto. `45-design-system.md` explica **dónde
> viven** los tokens, el tema de Material y la marca; aquí está **qué
> decisiones visuales se han tomado y por qué**, y qué hay que respetar para
> que la app siga pareciendo una sola cosa cuando tenga treinta módulos.
>
> La referencia ejecutable es **`/stil`** (guía de estilos viva). Antes de
> inventar una pieza, ábrela: si existe, úsala; si no existe y se va a repetir,
> añádela al catálogo y a la guía en el mismo cambio.

## De dónde sale este lenguaje

Cuatro referencias que el usuario puso encima de la mesa, cada una por lo que
hace bien:

| Referencia | Qué se toma |
| --- | --- |
| **Coursera** | Lienzo claro, tarjetas con filete y esquina contenida, rejillas de contenido agrupadas por un fondo suave, chips para segmentar, cabecera de sección con enlace «ver todo →», banda a sangre para el dato que debe quedarse. |
| **Google Store** | Contención: pocas familias de color, imagen grande cuando aporta, nada de adornos. La tarjeta se reconoce por el **tono**, no por una línea. |
| **Gmail** | **Densidad**: filas bajas, tipografía de 13–14 px, acciones que aparecen al apuntar, separación por filetes y no por sombras. |
| **Google Cloud Console** | Consola de operación: barra de herramientas compacta, paneles con cabecera fija y cuerpo con scroll propio, estado en chips, todo a la vista sin scroll de página. |

### Lo que miden de verdad

Las dos primeras **se abrieron y se midieron** con `getComputedStyle`, no se
miraron en una captura. La tabla está viva en `/stil` → «Referencias medidas»
(`styleguide.data.ts`, `REFERENCES`), que es donde hay que mirar antes de
discutir un tamaño:

| Pieza | Coursera | Google Store | Aquí |
| --- | --- | --- | --- |
| Rótulo de bloque | 20 px / 600 / −0,003 em | 24 px / 500 | `--fs-section` (18–20 px) / 700 |
| Titular de portada | 48 px / 600 / −0,01 em | 76 px / 500 / −0,013 em | `--fs-display` / 800 / `--ls-display` |
| Cuerpo | 16 px / 24 px | 12–14 px en pie y ficha | `--fs-body` / 1.6 |
| Tarjeta | radio 16 · filete 1 px · **sin sombra** | radio 28 · **sin filete** · fondo #f9f9f9 | `--r-card` 16 + filete; variante `--soft` con tono |
| Botón | 36 px · radio 8 · 14 px/600 | 40–48 px · píldora · 14–16 px/500 | `--ui-control-h` (40 web / 32 consola) |
| Chip | 32 px · píldora · filete 1 px · 14 px/**400**; activo relleno | píldora rellena | `ui-chip` 32 px, peso 500 → 600 al activarse |
| Rejilla | 4 col. de 211 px · hueco 12 px | 3 col. de 304 px · hueco 24 px | columnas fijas por nº de elementos · hueco 12–24 px |
| Enlace «ver todo» | 14 px / 600 · sin subrayado | 16 px / 500 | `ui-link`: `--fs-sm` / 600 |
| Corte de ritmo | banda a sangre #002457 con una cifra | banda de imagen a sangre | `ui-band` en `--c-band` |

Las tres lecturas que más cambiaron el diseño:

1. **Los rótulos de bloque son pequeños.** 20 px, no 28. Lo que jerarquiza una
   sección en esas páginas no es el tamaño del rótulo: es el aire alrededor y
   el enlace «ver todo» a su derecha. Agrandar el rótulo sólo roba sitio al
   contenido, que es justo lo contrario de «comprimir».
2. **El tracking no es una constante.** Va de −0,013 em en un display de 76 px
   a +0,01 em en un enlace de 14 px. El −0,02 em plano que había aquí servía
   para la portada y empastaba todo lo demás.
3. **Ninguna de las dos levanta la tarjeta al apuntarla.** Mueven el filete y,
   como mucho, una sombra mínima. El `translateY(-2px)` hacía «bailar» las
   rejillas.

Lo que **no** se copia: el color de marca (navy + oro) ni la voz.

## Antes de nada: este shard no es vinculante por defecto

La app está en construcción y **el diseño que describe este documento no es el
final**. Es el estado de hoy, no una norma. Se aplica **sólo cuando el usuario
lo pide expresamente** en esa tarea; si hay una referencia sobre la mesa (una
URL o una captura), manda la referencia: se abre, se mide y se reproduce.

Lo que sigue valiendo siempre: la marca (navy y oro), la accesibilidad y el
responsive al 100 %.

## Hay una segunda línea: el escaparate

Este shard manda en la web editorial, en las listas, en los formularios y en
la consola. **No manda en los bloques de escaparate** —un carrusel, una tarjeta
de promoción, una sección que tenga que entrar por los ojos—: esos se montan
calcando la referencia medida (`play.google.com/store/apps`) y viven en
`48-carousel-cards.md`, con su propia hoja (`src/styles/_showcase.scss`).

La decisión es del usuario y es deliberada: para lo nuevo se busca la
referencia directamente, sin pasarla por el filtro de lo que ya había. Lo que
no cambia es la marca (navy y oro) ni la accesibilidad.

## Las tres superficies

La app no es una sola cosa: son tres, con ritmos distintos y un único juego de
tokens. Confundirlas es el error más caro.

| Superficie | Dónde | Densidad | Reglas propias |
| --- | --- | --- | --- |
| **Web pública** | `/`, `/anunturi`, `/despre-noi`… | `comfortable` (por defecto) | Lectura y navegación. Tarjetas con filete, secciones con cabecera, ancho de prosa `--w-prose`. |
| **Consola** | `/media/control` y los módulos de gestión que vengan | `.ui-dense` + `.ui-dark` en el **host** | Todo a la vista sin scroll de página: barra de herramientas, paneles con scroll propio, filas de 36 px, controles de 32 px. |
| **Proyección** | `/media/ecran` | Escala de cartel `--pj-*` | Otro sistema entero (`30-presentation.md`). Nunca px ni rem. |

`.ui-dark` **no duplica ninguna primitiva**: sólo redefine los tokens de
superficie, texto y filete. Por eso la misma `ui-card` o la misma `ui-row`
funcionan en claro y en oscuro. Ojo con dónde se pone: va en el **host** del
módulo (`host: { class: 'ui-dense ui-dark' }`), porque las variables locales
que un `:host` declare se resuelven ahí; si la clase cuelga de un `div`
interior, esas variables locales cogen los valores claros de `:root`.

## Tipografía: tres familias, un papel cada una

| Familia | Papel | Dónde |
| --- | --- | --- |
| **Plus Jakarta Sans** (`--font-display`, 600/700/800) | Titulares e interfaz destacada | `h1`–`h4`, títulos de sección y de tarjeta, hero, rótulos de bloque en proyección |
| **Inter** (`--font-sans`, 400–700) | Cuerpo, datos y controles | Texto, listas, botones, campos, cifras |
| **Playfair Display** (`--font-serif`, 600 + cursiva 500) | **Sólo marca y cita** | El wordmark (que la declara por su cuenta) y los versículos |

Por qué se cambió: la serif en todos los titulares daba un aire de folleto
parroquial y, a tamaño grande con tracking cerrado, los remates finos se
empastaban; en proyección directamente se deshacían a 15 m. Una grotesca
geométrica-humanista es lo que usan las referencias (Coursera, Google Store,
LinkedIn): aguanta pesos altos, es más compacta —cabe más titular en la misma
línea— y se lee mejor de lejos. La serif **no desaparece**: se concentra donde
aporta tono (marca y versículo), que es exactamente donde se nota.

Ajuste que acompaña al cambio: titulares a peso 700–800 y `letter-spacing:
-0.02em`. Con la serif no se podía cerrar el tracking sin que chocaran los
remates; con la grotesca es lo que da el aire de producto.

La carga de fuentes se ajustó en consecuencia (`index.html`): Playfair baja de
cuatro cortes a dos (600 y cursiva 500), así que añadir la tercera familia no
sale caro.

## Decisiones tomadas (y por qué)

1. **Radios contenidos** — `xs 4 · sm 6 · md 8 · lg 12 · xl 16 · pill 999`.
   Antes eran 6/10/16/24/32: las tarjetas parecían pastillas y la retícula se
   deshacía. `pill` se reserva a lo que de verdad es una píldora (CTA, chip,
   badge).
2. **La sombra no separa: el filete separa** — `e-1` pasa de
   `0 4px 14px / 8 %` a `0 1px 2px / 6 %`. En reposo, borde de 1 px. La
   elevación se reserva a lo que flota sobre el contenido (menús, diálogos,
   dock, elemento arrastrado).
3. **Raíz tipográfica contenida** — `clamp(15px, 0.35vw + 14px, 17px)` (antes
   llegaba a 20 px). La proyección ya no depende de la raíz (tiene `--pj-u`),
   así que lo único que hacía era inflar la web en pantallas grandes.
4. **Escala tipográfica corta** — techos más bajos y menos salto entre niveles:
   un titular de página es `h1` (máx. 2,4 rem), no un cartel.
5. **Botones planos** — sin degradado y sin `translateY`. La reacción es color
   y filete. Altura por densidad (`--ui-control-h`): 40 px en la web, 32 px en
   consola; variante `.btn--sm` para barras de herramientas.
6. **Densidad como token, no como copia** — `--ui-row-h`, `--ui-control-h`,
   `--ui-gap`, `--ui-pad-x/y`, `--ui-fs`, `--ui-fs-meta`. Los componentes no
   fijan alturas: las heredan del contexto.
7. **Catálogo `ui-*` global** (`src/styles/_primitives.scss`) — una pieza, un
   sitio. Si un patrón aparece dos veces, es una primitiva y se documenta.
8. **Acento con criterio** — el oro marca lo accionable y el estado activo. Si
   algo dorado no es pulsable ni un remate, sobra.
9. **Portada a pantalla completa, con la foto a sangre** *(revisa una
   decisión anterior; se deja escrito el porqué del cambio)*. Durante un
   tiempo la portada fue partida —titular a la izquierda sobre navy y la foto
   entera en un marco 3:2 a la derecha— para no recortar las fotos. Resolvía
   el recorte, pero convertía la bienvenida en una ficha de producto: al
   entrar no se veía la iglesia, se veía una tarjeta. Ahora la portada ocupa
   el viewport menos la cabecera (desde 860 px; en móvil, 66 svh, para que
   asome el contenido siguiente) con la foto a sangre.
   **El recorte se gobierna, no se sufre**: cada diapositiva declara su
   `focus` (`upper` por defecto) → `object-position`, así que lo que se pierde
   es el suelo, no las caras. Y la legibilidad la da un velo diagonal en
   horizontal (oscurece el lado del texto y deja ver la foto en el otro) y de
   abajo arriba en vertical, donde además el texto se ancla al pie.
10. **Secciones más juntas y alineadas a la izquierda** — `app-page-section`
    pasa de `clamp(2.6rem, 7vh, 5rem)` a `clamp(2rem, 4.5vh, 3.25rem)` de
    relleno y su cabecera se alinea a la izquierda **por defecto**
    (`align="center"` queda para portada y cierres): es donde empieza la
    lectura y donde la esperan las rejillas que van debajo.

11. **Tracking graduado** (`$tracking` → `--ls-*`) — de `--ls-display`
    (−0,02 em) a `--ls-meta` (+0,01 em). Los encabezados lo consumen por
    nivel; nadie vuelve a escribir un `letter-spacing` a ojo.
12. **`--r-card` en vez de un radio por componente** — 16 px en la web y 8 px
    bajo `.ui-dense`. Antes convivían 16, 18, 20, 1 rem y 1,25 rem: cinco
    esquinas distintas en la misma página.
13. **La tarjeta no salta** — el `hover` mueve filete y, como mucho, `e-1`.
    Ninguna referencia levanta la tarjeta; con una rejilla, el salto hace que
    la retícula «baile» al pasar el ratón.
14. **Rejillas sin filas cojas** — el número de columnas se ajusta al número
    de elementos (seis accesos → 3 × 2, no 4 + 2). `auto-fit` vale cuando el
    número de elementos es variable; cuando es conocido, se fija.
15. **Tintes planos, no degradados** — un degradado hasta el color del lienzo
    deja un borde difuso que en pantalla grande se lee como suciedad. Además
    era el único sitio donde había un color fuera de la paleta (`#fffaf0`).
16. **Una banda por página** — `ui-band` es el corte de ritmo. Dos bandas
    seguidas se anulan y la página vuelve a parecer un folleto.

17. **La portada se mueve, el resto no** — zoom lento (*Ken Burns*) sobre la
    foto activa durante sus 6 s, con el sentido alternado, fundido de 1,2 s
    entre fotos y una barra de progreso en cada punto que corre al ritmo real
    del carrusel. Es el único sitio de la app con movimiento continuo: en la
    portada dice «esto está vivo», y en cualquier otro sitio distrae. Se para
    con el puntero encima, con el foco dentro, con la pestaña oculta y con
    `prefers-reduced-motion`; y elegir un punto reinicia la cuenta, para que
    la barra no mienta.

18. **Cabecera: una sola forma de botón** — medida y rehecha. Lo que había:
    69 px de alto (5 más que los 64 declarados, y la portada calcula
    `100svh − --nav-height`, así que el desfase se arrastraba), enlaces a
    16,15 px con alturas desiguales (40 los de submenú, 45 los planos) y
    **tres píldoras seguidas** a la derecha compitiendo entre ellas: donativo
    perfilado, directo relleno con degradado y sombra, e idioma en píldora con
    tinte dorado y filete propio —la utilidad menos importante de la fila era
    el tercer elemento más pesado—.

    Lo que hay: **56 px**, marca en `size="sm"`, un token `--nav-control-h`
    (34 px) que iguala el alto de *todos* los controles, enlaces a 15 px, y
    **una única píldora**: «En directo», plana y de un color. El donativo pasa
    a botón fantasma con el color de acento (sigue siendo acción, deja de ser
    caja) y el idioma a control fantasma. Regla general: en una cabecera hay
    una forma de botón; lo demás son enlaces y utilidades.

19. **La navegación no crece a lo ancho: crece en los grupos** — medido a
    1280 px, cada entrada de primer nivel cuesta **~99 px** y sólo quedan
    **218 px libres**, es decir sitio para **dos módulos más** antes de que la
    barra se rompa. Así que la regla es: **un módulo nuevo entra en un grupo
    existente** (`Biserica`, `Program`, `Media`), no como entrada nueva.

    Para que eso aguante, los paneles de grupo son **rejilla de dos columnas
    con icono** (`elim-menu--mega`), no listas verticales: con ocho entradas,
    una columna es un tubo de 400 px; en dos, con su icono, son 300 px y se
    barren de un vistazo. Los iconos ya estaban en `navigation.config.ts` y no
    se usaban.

    Lo siguiente cuando los grupos también se llenen: **un buscador en la
    cabecera**. Es lo único que escala sin límite —cincuenta módulos más y la
    barra no cambia— y es lo que tienen las tres referencias. No está hecho.

20. **Los grupos del menú son un panel, no un menú ARIA** — y por eso admiten
    contenido. `role="menu"` es el patrón de los menús de comandos: obliga a
    que todo lo de dentro sea un `menuitem` con navegación por flechas, así que
    prohíbe justo lo que aquí hace falta —enseñar los álbumes de la galería o
    lo próximo del programa dentro del panel—. Lo correcto para navegar es un
    *disclosure*: botón con `aria-expanded` + región con enlaces normales. Y
    sale más barato: sin `role="menu"` no hacen falta foco itinerante ni
    trampa de foco, bastan `Escape`, cerrar al pulsar fuera y devolver el foco.

    El panel va **dentro de la cabecera y a ancho completo**: no puede salirse
    de la pantalla porque ocupa toda la pantalla, así que no hay overlay ni
    cálculo de posición.

    Qué lleva cada uno, después de auditar los tres:

    | Grupo | Extra | Por qué |
    | --- | --- | --- |
    | **Biserica** | ninguno | Páginas institucionales: no hay nada que previsualizar, y meter relleno sería peor |
    | **Program** | «lo próximo»: siguiente culto y siguiente evento | Es el único grupo cuyas cuatro entradas son **tiempo** |
    | **Media** | tira de álbumes con miniatura | La galería es contenido visual: enseñarlo es mejor que nombrarlo |

21. **En un panel que se abre para elegir, nada se mueve solo.** La tira de
    álbumes se desliza pero **no avanza sola**, aunque el carrusel de la
    portada sí lo haga. La diferencia no es técnica: una portada se mira, un
    menú se usa. Lo que se mueve en un menú es lo que te quita de delante lo
    que ibas a pulsar, y encima te obliga a perseguirlo.

22. **El activo no se marca rellenando el icono.** Se probó con el icono sobre
    fondo dorado y el trazo desapareció: quedaba una mancha amarilla ilegible.
    Se marca con filete dorado a la izquierda y un velo suave, que es lo que ya
    hacía el resto de la app.

23. **La marca se ajusta al alto de la barra, no a un escalón fijo** — medido:
    iba a 24 px clavados (`size="sm"`), ocupaba el **57 %** de la cabecera,
    dejaba **13 px muertos** arriba y abajo y la línea «Arganda del Rey» caía a
    **6,9 px**, por debajo de lo legible: se leía como una mancha gris. Y al
    ser fijo no seguía a la barra.

    El bloque mide **1,43 × `--brand-size`** (nombre + hueco 0,14 + localidad
    0,289 — proporciones de la hoja de marca, que no se tocan). Despejando, el
    tamaño que llena la barra menos un margen de respiro es
    `(alto − margen) / 1,43`, y eso es lo que pone la cabecera con
    `size="context"`.

    | | Antes | Ahora |
    | --- | --- | --- |
    | Bloque | 84 × 34 | **108 × 45** |
    | Ocupación vertical | 57 % | **75 %** |
    | «ELIM» | 24 px | **31,5 px** |
    | «Arganda del Rey» | 6,9 px | **9,1 px** |

    Lo importante no es el tamaño: es que **se deriva**. Si mañana cambia el
    alto de la cabecera, la marca se reajusta sola —en móvil, con la barra a
    54 px, mantiene el mismo 75 %—. Regla general: en la cabecera, medida
    derivada antes que valor fijo.

24. **Lo mismo dicho tres veces no es énfasis, es ruido** — la sección
    «Ce urmează» de la portada enseñaba el próximo culto y el próximo evento…
    que es exactamente lo que ya dicen la franja de la portada («HOY · 20:30»)
    y dos tarjetas del carrusel. El mismo dato, tres veces, en la misma
    pantalla. **Se borró la sección**, no se rediseñó: cuando algo duplica, la
    respuesta no es hacerlo más bonito.

25. **Una sección que gasta 250 px para una línea está mal, aunque se vea
    bien.** Auditadas las cinco de la portada, con su alto medido:

    | Bloque | Antes | Ahora | Qué se hizo |
    | --- | --- | --- | --- |
    | Quiénes somos | 470 px, media pantalla vacía a la derecha | **391 px** | Dos columnas: texto y versículo como cita, no como recuadro |
    | Ce urmează | ~400 px | **0** | Borrada por duplicada |
    | Accesos rápidos | 361 px | **137 px** | Tarjetas apretadas, fuera la flecha (la tarjeta entera ya es el enlace) |
    | Departamentos | ~250 px | **97 px** | Rótulo a la izquierda y chips en la misma fila. Y los chips **enlazan**: antes eran etiquetas muertas |
    | Visítanos | ~250 px | **103 px** | Banda de una fila: dato a la izquierda, acciones a la derecha |

    La portada pasa de ~3.700 px a **3.140** sin perder ni un dato.

26. **Un rótulo de sección que repite lo que ya dicen sus piezas, sobra.** Ha
    pasado dos veces en la portada —el carrusel y los accesos rápidos— y las
    dos veces la respuesta fue la misma: **fuera la cabecera, el nombre al
    `aria-label`**, que es donde de verdad hace falta. «Acces rapid · Tot ce ai
    nevoie, la un click distanță» eran dos líneas y 100 px para presentar seis
    fichas que se presentan solas.

    Lo mismo con las descripciones de esas fichas: la mitad repetían su propio
    rótulo («Galerie — Momente din viața bisericii»). En un acceso rápido el
    rótulo **es** la señal; la descripción dobla el alto y se va al `title`,
    para quien se pare encima.

    Recorrido del bloque, medido: **361 → 137 → 85 px**. Lo que se fue no era
    información.

27. **Una cita no es un recuadro.** El versículo iba en una caja gris con
    filete: se leía como un aviso. Ahora es una cita de verdad —comilla de
    marca de agua, filete dorado, serif en cursiva— y vive en la columna de al
    lado, haciendo de contrapunto al texto en vez de interrumpirlo.

28. **Una sola rejilla de página, y el `calc` que la hace posible** — medido a
    1512 px, la portada tenía **tres márgenes izquierdos distintos**: la
    cabecera en x=82, las franjas a sangre (avisos y carrusel) en x=45 y todo
    el contenido en x=161. Tres rejillas en la misma pantalla se notan aunque
    no se sepa por qué.

    Ahora hay tres tokens y nada más:

    ```
    --page-max:    var(--w-wide);                 /* 1440 */
    --page-gutter: clamp(1rem, 3vw, 3.5rem);
    --page-inset:  max(gutter, (100% - max) / 2); /* el borde real */
    ```

    `--page-inset` es el que usan las franjas que sangran (el carrusel), para
    que su primera tarjeta caiga en la misma vertical que el titular, la
    etiqueta de los avisos y la marca de la cabecera.

    **La trampa que costó un intento**: el mixin `container` pone `max-width` y
    `padding` en el *mismo* elemento, así que el relleno se come el ancho del
    contenido; las franjas ponen el relleno fuera y el tope dentro. Dos modelos
    de caja distintos que sólo coinciden por casualidad —a 1512 px daban 76 px
    contra 45—. Se arregla haciendo que el tope del contenedor **incluya los
    dos márgenes**: `max-width: calc(#{$max} + 2 * var(--page-gutter))`.

    Verificado: cabecera, avisos, carrusel, bienvenida, cifras, accesos,
    departamentos y visita caen en la **misma vertical** a 375 px (15),
    1512 (45) y 1920 (235).

## El catálogo (`ui-*`)

Definido en `src/styles/_primitives.scss`, visible en `/stil`:

| Pieza | Para qué |
| --- | --- |
| `ui-card` (`--interactive`, `--accent`, `--soft`) | Caja de contenido; pulsable; agrupador suave de sección; superficie con tono y sin filete (Google Store). |
| `ui-band` + `__inner` (`--gold`) | Franja a sangre que corta la página y sujeta el dato o el mensaje que debe quedarse. **Una por página.** |
| `ui-panel` + `__head` / `__title` / `__body` | Contenedor de consola con cabecera fija y cuerpo con scroll propio. |
| `ui-section-head` + `__title`, `ui-link` | Cabecera de sección con su «ver todo →». |
| `ui-list`, `ui-row` (`--interactive`, `--wrap`), `__main` / `__meta` / `__actions` | Lista densa estilo bandeja: acciones al apuntar, activo con barra dorada. `--wrap` ajusta el título a dos líneas: obligatorio en columna estrecha. |
| `ui-toolbar` + `__group` (`--end`) / `__sep` | Barra de acciones de consola. |
| `ui-icon-btn` | Botón sólo icono del alto del control. |
| `ui-chip` (`--selectable`), `ui-chips` | Filtro, etiqueta, categoría. |
| `ui-status` (`--ok/--warn/--danger/--info/--live`) | Estado real del sistema o del elemento. |
| `ui-segmented` + `__btn` | Dos o tres opciones excluyentes. |
| `ui-field` + `__label`, `ui-input` | Campo compacto. |
| `ui-tabs`, `ui-tab` | Navegación dentro de una página. |
| `ui-stat` (`--band`) + `__value` / `__label` | Cifra con su rótulo; dentro de una banda, sin caja y a cuerpo de titular. |
| `ui-meta` | Línea de datos separados por puntos medios (los pone el CSS). |
| `ui-empty` + `__title` | Estado vacío: qué pasa y qué hacer. |
| `ui-kbd`, `ui-divider` | Atajo de teclado; filete horizontal. |

Reglas del catálogo: sólo tokens (nada de `#fff` ni `12px`), densidad heredada,
filete en reposo, estados completos (`:hover`, `:focus-visible`, `[disabled]`,
activo) y nombre `ui-<pieza>--<variante>`.

## Cómo se trabaja a partir de ahora

1. **Mira `/stil`** antes de escribir CSS. Lo que hay, se usa.
2. Si hace falta algo nuevo y se va a repetir: primitiva en
   `_primitives.scss` + entrada en `styleguide.data.ts`. **Un cambio sin su
   ejemplo en la guía es un cambio incompleto.**
3. Si es específico de una pantalla, va en su `.scss` encapsulado, consumiendo
   tokens.
4. Nunca se redefine una primitiva desde un componente: o se parametriza con
   tokens, o es otra pieza.
5. Módulo de gestión nuevo → `host: { class: 'ui-dense ui-dark' }`, barra de
   herramientas arriba, paneles con scroll propio, nada de scroll de página.
6. Responsive al 100 % (invariante 8 de `00-index.md`) y presupuesto de
   legibilidad en proyección (`30-presentation.md`): las dos puertas siguen
   valiendo.

## Pendiente (migración progresiva, sin prisa y sin romper)

Los tokens nuevos ya cambian el aspecto de toda la app. Lo que queda es migrar
marcado a las primitivas, pantalla a pantalla, cuando se toque cada una:

- **Hecho** en la portada: tablero de tres columnas (`ui-card--accent` +
  `ui-list` + `ui-row--wrap` + `ui-link`), banda de cifras (`ui-band` +
  `ui-stat--band`) y ministerios como `ui-chip`. Las cifras salieron de la
  columna derecha de «bienvenida», que ahora es un bloque editorial a ancho
  de prosa.
- **Hecho** en páginas públicas (`about`, `credo`, `contact`, `donate`):
  radios unificados a `--r-card` y fuera el salto al apuntar.
- Pendiente: galería y transmisiones → `ui-card`; accesos rápidos y tarjetas
  de «hoy» de la portada → `ui-card` (hoy consumen los mismos tokens pero
  conservan su clase propia).
- Panel de control: la lista de diapositivas → `ui-row`; el aside → `ui-panel`;
  la barra superior → `ui-toolbar` (hoy ya hereda densidad y superficie).
- Páginas editoriales: cabeceras de sección → `ui-section-head`.
- Al migrar, **borrar** el CSS que la primitiva sustituye: si no, quedan dos
  verdades.
