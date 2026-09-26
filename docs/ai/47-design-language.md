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

29. **Un mega-menú se mide en dos zonas, no en dos filas** — el panel de grupo
    apilaba los enlaces arriba y el contenido abajo. Medido a 1512 px:

    | | Antes | Ahora |
    | --- | --- | --- |
    | Alto del panel (Medios) | 390 px (43 % de la pantalla) | 235 px |
    | Hueco muerto en la fila de enlaces | 568 px (40 %) | 0 |
    | Miniatura de álbum | 272×153 px | 183×103 px |
    | Descripción de «Panel completo» | 2 líneas en 275 px | 1 línea en 374 |

    La fila de enlaces usaba `repeat(auto-fill, minmax(15rem, 1fr))`: con
    `auto-fill` la rejilla **reserva las columnas que caben aunque estén
    vacías**, así que tres enlaces ocupaban tres de cinco columnas y las otras
    dos quedaban en blanco. `auto-fit` colapsa las vacías. Es la diferencia
    entre las dos palabras y se nota en cuanto el número de elementos no
    coincide con el de columnas.

    Con los enlaces en una columna de 22 rem y el contenido al lado, el hueco
    pasa a ser el destacado. Y eso obliga a lo segundo: **todos los grupos
    necesitan destacado**, porque uno sin él vuelve a dejar mil píxeles en
    blanco. El de «La iglesia» no es relleno —es cuándo y dónde, que es lo que
    busca quien mira ese grupo y no está en ninguna de sus tres entradas.

    El umbral de apilado está medido, no elegido: la columna de enlaces mide
    374 px fijos, así que a 1100 px al destacado le quedaban 617 y las
    miniaturas caían a **106×60 px**. Por debajo de `xl` (1280) se apila.

30. **Un menú que se abre solo tiene que cerrarse solo** — el panel se abría al
    apuntar el grupo pero sólo se cerraba con `Escape`, pulsando fuera o
    navegando. Pasar el cursor por encima camino de otro sitio dejaba 390 px
    tapando media pantalla. Ahora cierra al retirar el ratón de la cabecera y
    del panel, con **220 ms de gracia**: entre el disparador y el panel hay un
    hueco de 8 px y sin margen el recorrido en diagonal del botón al primer
    enlace cerraba el menú a mitad de camino.

31. **Un filete no debe medir** — la barra llevaba `border-bottom: 1px`, así
    que medía 60,5 px mientras `--nav-height` decía 59,5. La portada calcula
    `100svh - var(--nav-height)`: ese píxel se arrastraba hasta el pie de la
    primera pantalla. Dibujado con `box-shadow: inset 0 -1px 0`, el filete se
    ve igual y ocupa cero. Regla: **el alto real de la cabecera tiene que ser
    exactamente su token**, porque hay otra pantalla restándolo.

32. **Un texto de una línea con puntos suspensivos es una decisión, casi nunca
    la correcta** — en el panel había tres: el nombre del álbum cortaba
    «Concert de Colinde · Copii», el título del evento cortaba «Conferință de
    tineret "ANCORAT"» a media palabra. Pero dejar que envuelvan libremente
    descuadra la fila, porque los de una línea dejan su ficha más baja. La
    salida es el tope en dos líneas **con altura mínima de dos líneas**
    (`line-clamp: 2` + `min-height: calc(2 * 1.3em)`): se lee entero y todas
    las fichas miden igual. Verificado: ningún rótulo del panel se corta.

33. **Comprueba que el token existe antes de meterlo en un `clamp`** — la
    separación entre las dos zonas se escribió `clamp(var(--sp-5), 4vw,
    var(--sp-7))` y **la escala de espacio no tiene un `--sp-7`** (va 0-6, 8,
    10, 12, 16, 20, 24). Un `clamp` con un argumento vacío es una declaración
    inválida entera: el hueco caía a 0 y el filete quedaba pegado a la primera
    miniatura, sin error en consola y sin que el build dijera nada. Aparecía
    también en `leadership.component.scss`, donde el hueco reservado para el
    botón de cerrar nunca se reservó.


34. **Un documento largo no es una página: es un documento** — la confesión de
    fe son 30 artículos en cuatro capítulos. Estaba montada como una página de
    folleto: un sumario en tarjetas arriba, cuatro bandas a todo el ancho con
    tinte alterno y nada que dijera por dónde ibas. Ahora es un documento, con
    lo que eso trae —medido sobre el «On this page» de `angular.dev`, que es la
    referencia que se pidió—:

    | | Medido en la referencia | Aplicado |
    | --- | --- | --- |
    | Índice | columna fija de 256 px, scroll propio | 16 rem, scroll propio |
    | Niveles | sangrado 16 → 32 px | igual |
    | Rótulo del enlace | 14 px / 500 | 13,5 px / 500 |
    | Activo | degradado recortado sobre el texto | filete dorado + velo |
    | Cierre | «Back to the top» | igual |

    El **scroll propio del índice no es un detalle**: con 34 entradas el
    índice mide ~1.100 px, así que en una pantalla de 900 la mitad de los
    artículos serían inalcanzables sin bajar por el documento —justo lo que el
    índice viene a evitar—. Y obliga a lo siguiente: mantener la entrada activa
    a la vista **dentro** de ese scroll, o se resalta algo que no se ve.

35. **El seguimiento se calcula por posición, no por intersección** — medido en
    la propia `angular.dev`: al desplazarse por dentro de un apartado largo su
    índice **se queda sin ninguna entrada activa**, porque su observador marca
    lo que está cruzando la banda y entre encabezado y encabezado no cruza
    nada. Aquí el activo es siempre *la última entrada cuyo objetivo ya pasó la
    línea de lectura*: hay exactamente uno, siempre, y al final del documento
    gana el último (el cierre suele ser más corto que la pantalla y nunca
    llegaría a cruzar).

    Hay que vigilar tres cosas, no una: el scroll, el tamaño de la ventana y
    **el alto del documento**. Lo tercero porque los apartados son `<details>`:
    abrir uno desplaza todo lo de abajo sin que haya habido scroll.

36. **Saltar a un sitio plegado no es saltar a ningún sitio** — el índice avisa
    al anfitrión antes de desplazar (`select`), y la confesión de fe aprovecha
    ese aviso para **abrir el artículo de destino**. Sin eso el salto te deja
    delante de un título cerrado y hay que pulsarlo otra vez para ver lo que
    ibas a leer. Y al llegar, el destino **destella** un segundo: en una lista
    de treinta apartados iguales, el salto por sí solo no dice cuál es el tuyo.

    El hueco de la cabecera fija lo pone `scroll-margin-top` en el CSS, no el
    JavaScript: así vale igual para el índice que para un enlace pegado en la
    barra de direcciones. Verificado: los cuatro tipos de destino aterrizan a
    85 px del borde, con la cabecera midiendo 59,5.

37. **Un buscador dentro del documento, y sin diacríticos** — 30 artículos de
    texto denso se consultan («¿qué dice esto del bautismo?»), no se leen de
    corrido. El filtro actúa sobre el documento **y sobre el índice**, así que
    el índice pasa a ser la lista de resultados. Dos detalles que lo hacen
    funcionar de verdad:

    · **Normalizar quitando diacríticos** (`NFD` + `\p{Diacritic}`): nadie
      teclea «sfințirea» con la coma bajo la t, ni «salvación» con tilde. Sin
      esto el buscador parece roto justo en las palabras que más se buscan.
      Verificado: «sfintirea» → 2, «duhul sfant» → 8, «salvacion» → 4.
    · **Abrir las coincidencias**: un resultado plegado no es un resultado.

38. **`requestAnimationFrame` no es un «espera un momento»** — el salto del
    índice hacía su trabajo dentro de un `rAF` para que el `<details>` ya
    estuviera abierto al medir. Dos problemas: el navegador **suspende los
    fotogramas** cuando la pestaña no está visible, así que el índice dejaba de
    desplazar sin más; y la espera no hacía falta, porque el que se abre es el
    propio destino y su contenido crece **hacia abajo** — el borde superior, que
    es lo que se alinea, no se mueve. Regla: antes de meter algo en un `rAF`,
    comprobar si de verdad hay una medida que esperar.

39. **Partir el título antes de pintarlo** — las emisiones de YouTube llegan
    con todo en una cadena: «Slujbă de seară - (Pilda robului nemilos) Duminică
    20 Septembrie 2026». En crudo son cuatro líneas o un corte a media palabra,
    y cinco tarjetas seguidas que empiezan igual y hay que leer enteras para
    distinguirlas. Partido en tipo / tema / fecha (`core/youtube-title.ts`) se
    lee de una ojeada, y **degrada solo**: un título que no siga el patrón se
    devuelve entero como titular.

40. **Una franja de estado no es una sección** — el «en directo» de la portada
    mide 3 rem, va pegada al hero por delante de los avisos y **desaparece
    entera** cuando no se emite. Es lo más perecedero de la web: un aviso dura
    días, una emisión dura una hora. El fondo es el navy de marca con el punto
    en rojo de directo; pintar la franja entera del color de estado la
    convertiría en una alarma.

41. **Reservar la línea que a veces no hay** — en la tira de emisiones sólo dos
    de cinco traen tema, así que las otras tres se quedaban sin tercera línea y
    la fila terminaba con los pies a dos alturas (240 px contra 217). En una
    rejilla se lee como si faltara algo. La línea se reserva siempre con
    `min-height`, tenga texto o no.


42. **`<base href="/">` se come los enlaces de sólo fragmento** — el fallo más
    caro de esta ronda, y no se ve: el índice funcionaba, pero pulsar una
    entrada dejaba la barra de direcciones en `/#art-botez` en vez de
    `/marturisirea-de-credinta#art-botez`, y un par de segundos después la app
    **se iba sola a la portada**.

    La causa: un `#id` suelto es una URL relativa y el navegador la resuelve
    contra el `<base>` del documento, **no contra `location.href`**. Con la
    ruta comodín de la app (`{ path: '**', redirectTo: '' }`) el resultado es
    una redirección silenciosa. Pasa en los dos sitios:

    ```
    history.replaceState(null, '', `#${id}`);   // ✗ borra la ruta
    <a href="#art-19">                          // ✗ lo mismo al pulsarlo
    ```

    Los dos tienen que llevar la ruta delante:
    `${location.pathname}${location.search}#${id}`. El `<a>` importa aunque el
    clic esté interceptado: «abrir en pestaña nueva» y «copiar dirección del
    enlace» usan el `href` tal cual.

43. **Un título centrado sobre un documento alineado a la izquierda son dos
    ejes** — medido a 1543 px: el título de la confesión de fe salía centrado
    en x=771 sobre un texto que empieza en x=46. La cabecera compartida está
    pensada para una portada de sección, y aquí es la portada de un documento.
    Alineada a la izquierda con la rejilla de página, la pantalla entera baja
    por **una sola vertical**: marca, título, herramientas y texto en x=46.

    De paso se recortó su relleno: con 8vh arriba y abajo medía 319 px y el
    primer artículo empezaba en y=697. Setecientos píxeles de carrerilla para
    un documento de consulta. Ahora 253 y 603.

44. **Un control a 766 px de lo que controla no es un control** — el galón de
    plegado de cada artículo era un símbolo de 11×23 px en gris al 46 %, al
    otro extremo de una fila de 918. Se leía como una mota. Pasa a una caja de
    1,75 rem que se rellena al apuntar la fila: mismo sitio, pero ahora es un
    objetivo. Lo mismo con el buscador, que se estiraba a **786 px** —tan
    ancho como un párrafo, para dos palabras— y queda topado en 26 rem.

45. **Treinta apartados abiertos se leen como un solo bloque** — con «abrir
    todo», el texto de un artículo y el enunciado del siguiente se juntaban
    sin frontera visible. El artículo abierto se marca con filete dorado a la
    izquierda y una superficie tenue (`:has(> details[open])`): el filete da
    el límite y el tono, el bloque. Regla general: si una lista puede tener
    varios elementos expandidos a la vez, cada uno necesita su propio límite.

46. **La barra de scroll de una columna estrecha cuesta más de lo que informa**
    — en el índice ocupaba 10 px de 16 rem (el 4 %) y dejaba un carril gris
    permanente pegado a los rótulos. Pero quitarla sin más deja de decir que
    hay 34 entradas ahí abajo. La solución es **desvanecer el final de la
    lista**: el texto que se corta en un difuminado se lee como «sigue», no
    gasta ancho, y se apaga solo cuando ya no sobra nada (al llegar al final o
    al filtrar a pocos resultados).

47. **Un enlace permanente que no se copia está a medias** — el `#19` de cada
    artículo cambiaba el ancla y ya; para compartirlo había que ir a la barra
    de direcciones. Ahora copia la dirección completa y lo confirma en el
    sitio, **sin dejar de ser un `<a href>`**: el menú contextual del navegador
    y el funcionamiento sin JavaScript se mantienen, y si el portapapeles
    falla (contexto no seguro) se deja pasar el clic y el enlace se comporta
    como siempre.

48. **Alinear cifras a la derecha, siempre** — del 1 al 30, con los números a
    la izquierda de su caja el «1» queda suelto y la columna sale en escalera.
    `text-align: end` + `tabular-nums` y las unidades caen en la misma
    vertical. Vale para el índice y para el documento.


49. **Lo que cuesta cuota no va en la página más visitada** *(la 79 lo
    endurece: hoy no la gasta ninguna página pública)* — la tira de
    emisiones de la portada es gratis (sale del JSON estático que sirve el CDN
    de GitHub), pero el **sondeo del directo** cuesta 2 unidades cada 2 minutos
    **y por pestaña abierta**, con la misma clave para todos los visitantes.
    Medido: cada carga de la portada disparaba `playlistItems` + `videos`.

    Con la cuota por defecto de YouTube (10.000 unidades/día) eso son ~166
    horas de pestaña abierta: **cien personas con la web abierta durante un
    culto de una hora se comen 6.000 unidades**. Y no falla en cualquier
    momento, falla el domingo por la mañana — justo cuando hay directo.

    El reparto: la portada en modo `'ligero'` (sólo JSON, cero cuota, el aviso
    de directo llega con el retraso del JSON) y la página de transmisiones en
    `'completo'`. La inmediatez se paga donde hace falta y donde hay menos
    gente. Regla general: **antes de poner en la portada algo que consulta una
    API con cuota, calcula pestañas-hora, no visitas.**

50. **Un temporizador no debe correr con la pestaña oculta… pero el primer
    ciclo sí** — filtrar los sondeos por `document.hidden` ahorra mucho, y
    filtrar *también* el primero rompe la página: una pestaña abierta con el
    botón central nace oculta, así que se quedaba en blanco hasta que el
    usuario la mirara **y encima** esperase al siguiente ciclo. Lo que se
    ahorra es el sondeo repetido, no el arranque: `filter(ciclo => ciclo === 0
    || visible)`.

51. **`justify-self` + `width: auto` + `nowrap` = desbordamiento garantizado**
    — medido a 390 px: un `span` de la franja de avisos salía con **400 px de
    ancho** y arrastraba 74 px de scroll horizontal a toda la página.

    El porqué: con una alineación propia distinta de `stretch`, la rejilla
    dimensiona el elemento a `fit-content`, que es
    `min(max-content, max(min-content, disponible))`. Con `white-space: nowrap`
    el `min-content` es la cadena entera, así que el `max()` se queda con ella
    y se come el ancho disponible. **`min-width: 0` no salva de esto**, porque
    la fórmula usa el tamaño mínimo del contenido, no la propiedad. La salida
    es `width: 100%`.

52. **En el móvil, una lista de vídeos se tumba** — las tarjetas de emisión en
    rejilla caían a una sola columna a 320 px: cinco apiladas, ~1.200 px de
    página para un bloque secundario. Y forzar dos columnas tampoco valía
    (miniaturas de 139 px, títulos cortados). En fila —miniatura a la
    izquierda, ficha a la derecha— cada una mide ~85 px, las cinco caben en
    425 y el título tiene el ancho entero. Es lo que hace cualquier lista de
    vídeo en el móvil.


53. **El oro de marca no pasaba AA como texto, en ningún sitio** — medido en
    la portada: **los siete usos** de `--c-gold-deep` como texto daban entre
    3,82 y 4,03:1, con el mínimo en 4,5. Ninguno llegaba: ni los antetítulos,
    ni el «Donează» de la cabecera, ni la línea «ARGANDA DEL REY» de la marca.

    El token apuntaba a `gold(700)` (#9c7a1e). Se añade un escalón `750`
    (#856618), que es **el oro más claro que pasa sobre los cuatro fondos
    reales** —lienzo 5,1 · blanco 5,37 · franja de avisos 5,1 · velo dorado
    4,64— y ahí apunta ahora `--c-gold-deep`. El único sitio donde el oro es
    fondo (la insignia de avisos, con tinta blanca) mejora de 4,03 a 5,37:
    cero contrapartidas.

    **La otra mitad del fallo**: cambiar el token arregló sólo tres de los
    siete, porque los otros cuatro llevaban `#9c7a1e` **escrito a mano**. Ocho
    copias del mismo valor repartidas por el proyecto. Por eso un color no se
    copia: en el momento en que se corrige, las copias se quedan atrás y
    nadie se entera. Ahora la portada lee el token y las dos hojas
    autocontenidas —la de marca y la de proyección— llevan el valor nuevo con
    la razón escrita al lado.

54. **Un bloque sin rótulo no existe** — el carrusel de portada es el bloque
    más grande de la página (512 px, cinco tarjetas) y llegaba **sin un solo
    título visible**: sólo `aria-label`. El visitante pasaba de la franja de
    avisos a una fila de tarjetas de colores sin nada que dijera qué está
    mirando. Y la tira de transmisiones, que pesa la mitad, sí lo tenía: dos
    bloques vecinos con dos criterios distintos.

    La página pasa de 5 encabezados a 7 y cuesta 18 px. Un `aria-label` sirve
    para nombrar una región, **no** para sustituir un título que el lector
    vidente también necesita.

55. **El final de una página es donde se convierte** — la portada terminaba en
    una dirección suelta, sin título, en una banda de 103 px. En una web de
    iglesia el cierre es el sitio del «ven»: ahora lleva la invitación, el
    **cuándo** (el dato que decide si alguien aparece y que no estaba) y el
    dónde, con las dos acciones a la derecha.

    Repetir ahí el próximo culto no sobra aunque ya esté en la portada:
    arriba orienta y abajo invita. Es el mismo dato haciendo dos trabajos.

56. **Lo que se construye hay que enlazarlo** — la confesión de fe son treinta
    artículos con su índice y su buscador, y **no se llegaba a ella desde la
    portada**: había que abrir el menú. «Quiénes somos» responde de dónde
    venimos; qué creemos es la otra pregunta de quien mira una iglesia por
    primera vez, y ahora tiene su puerta en el mismo bloque.


57. **El carril de un índice va en la lista, no en cada entrada** — puesto en
    el enlace salían **34 segmentos sueltos**, cortados en cada hueco y
    deformados por el radio del propio enlace; puesto en el `<ul>` es una
    línea continua. Medido en la referencia: `border-left: 0.8px` en la lista
    y los enlaces con `border-left: 0`. El enlace tampoco lleva radio, porque
    una esquina redonda se despega de un carril recto.

    Y el activo no necesita pastilla: **se enciende el tramo de carril que le
    toca** (un `::before` de 2 px superpuesto al hilo) y el rótulo pasa a tinta
    fuerte. Un bloque de color en una lista de 34 entradas es mucho ruido, y
    además rompía la línea justo donde importa que siga.

58. **Comparación medida contra la referencia** — pedir «parecido pero
    comprimido» se resuelve con números, no con impresiones:

    | | angular.dev | Aplicado |
    | --- | --- | --- |
    | Ancho del índice | 256 px | 272 |
    | Alto de entrada | 38 px | 29 (comprimido) |
    | Escalón de nivel | 16 px | 16 |
    | Título | `h2` 20 px / 500, caja baja | 15 px / 700, caja baja |
    | Carril | en el `<ul>` | igual |

    El título estaba en versalitas de 11,7 px con 1,4 px de tracking: eso es
    un rótulo de campo gritado, no el título de un índice. En caja baja se lee
    como lo que es.

59. **Un tope mal puesto deja un agujero** — la columna del documento estaba
    acotada a 54 rem, así que el texto acababa en x=963 y el índice empezaba en
    1184: **221 px de nada** entre los dos, que dejaban el índice desgajado
    contra el borde. El hueco entre columnas tiene que ser el de la rejilla
    (4 rem), no el sobrante de un `max-width`. **Se acota la prosa, no la
    columna**: las filas ocupan el ancho entero —que es lo que las hace
    leerse como una tabla— y el párrafo se topa aparte en 44 rem.

60. **Un indicador no es un botón** — el galón de plegado pasó por dos errores
    seguidos. Primero, un carácter «▾» de 11 px al 46 %: una mota. Después,
    metido en un disco de 1,75 rem que se rellenaba al apuntar: peor, porque
    un disco gris contra el borde derecho promete ser **otro** objetivo,
    distinto de la fila, cuando **la fila entera ya es el objetivo**. Como
    señal de estado sobra el disco; lo que hacía falta era que se viera. Icono
    SVG de la app (no un glifo, que cambia de tamaño según la fuente), 1,15 rem
    y al extremo de la fila, que es donde se busca.

61. **Un capítulo tiene que notarse al pasar** — los cuatro capítulos se
    separaban con 54 px de aire, exactamente el mismo hueco que hay entre la
    cabecera de un capítulo y su primer artículo: bajando por 2.700 px de
    documento, el cambio no se veía. El numeral sale del antetítulo y pasa a
    ser el **ancla del capítulo** —cuadro de 2,75 rem a la izquierda del
    bloque entero, cuadrado y no disco porque «III» en un círculo obliga a
    encoger la letra— y el aire sube a 72 px.


62. **En el teléfono, los controles de una página van en el dock, no en otra
    barra** — la confesión de fe tiene tres controles (buscador, desplegar
    todo, índice) que arriba se iban con el scroll: en el artículo 20 había
    que subir 2.000 px para buscar una palabra. Y arriba ya hay 101 px de
    cromo —cabecera 56 + índice 45— en una pantalla de 844.

    Se probó una barra fija abajo y funcionaba, pero cuesta **55 px de franja
    permanente** para unos controles que se usan a ratos. La solución es
    meterlos en el dock flotante que ya existe: **un botón**, y desde ahí sube
    el módulo entero (barra + hoja del índice). Coste en reposo: cero.

    Para eso el dock acepta acciones de página a través de un servicio
    (`DockActionsService`), no por proyección: **el dock vive en el layout, no
    es padre de la página enrutada**, así que no hay `@Input` ni `ng-content`
    que valga. La página registra al entrar y **limpia al salir**, o sus
    botones se quedan en el resto del sitio.

63. **Una variable CSS sólo hereda hacia abajo** — la barra del documento y el
    dock tienen que coordinarse (el dock se aparta para no taparla), pero el
    dock no desciende de la página. Declarar la variable dentro de la página
    no le llega nunca. Se declara en el `body`, que es el único antecesor
    común, y la página la activa con una clase —el mismo patrón que ya usaba
    el cajón móvil con `body.has-drawer-open`—.

64. **Con encapsulación, dos selectores de una clase empatan en especificidad**
    — `.dock__btn--phone[_ngcontent-x]` y `.dock__btn[_ngcontent-x]` valen lo
    mismo (una clase + el atributo del componente), así que **decide el orden
    de declaración**. La regla que ocultaba el botón en escritorio estaba
    arriba del bloque y el `display` de la base la pisaba: se veía en todas
    las pantallas. Va al final, y ya. Regla: en estilos encapsulados, una
    anulación por clase se pone **después** de la base, nunca antes.


65. **Un corte, dos diseños** — el índice se convertía en hoja inferior por
    debajo de 720 px, pero la columna lateral desaparecía a 1280. Entre medias
    quedaba una franja con un **tercer** diseño (un desplegable pegado bajo la
    cabecera) que no aportaba nada y que además salió roto: al reestructurar
    el bloque, los estilos del resumen quedaron dentro del `@media` equivocado
    y en esa franja se pintaba con el marcador nativo del `<details>` y el
    rótulo pegado al apartado.

    Ahora el corte es uno solo y es **donde desaparece la columna**: si el
    índice deja de estar a la vista, los controles se van abajo. Regla: un
    cambio de disposición se ata al momento en que el usuario pierde algo, no
    a un ancho elegido por separado.

66. **El botón que abre un panel tiene que estar después del panel, o mover el
    foco** — medido con el orden de tabulación real: el botón del dock era el
    elemento **110** y los controles del panel el **11** y el **75**, los dos
    *antes* que él. Abrir el panel y pulsar Tab te sacaba de él: el panel era
    inalcanzable con teclado.

    Dos arreglos, y hacen falta los dos: el índice pasa **antes** del documento
    en el marcado (con `grid-column` explícito para que siga pintándose a la
    derecha), de modo que el recorrido sea índice → herramientas → artículos; y
    al abrir, el foco entra en el panel, volviendo al botón con `Escape`.

    Verificado: al abrir, el foco cae en el resumen del índice y el siguiente
    Tab entra en la lista.

67. **Un documento no puede ensancharse al estrechar la ventana** — medido:
    la fila de artículo salía a 1.071 px a 1512 (con la columna del índice al
    lado) y a **1.207 a 1.279** (sin ella). Encoger la ventana ensanchaba el
    texto, que se lee como un fallo aunque nadie sepa nombrarlo. Tope de
    1.120 px cuando no hay columna.

    El tope va **en píxeles**: la raíz de esta app es fluida (15,4 px en el
    móvil, 17 en escritorio), así que un `max-width` en `rem` vale distinto en
    cada pantalla — exactamente lo contrario de lo que se busca. Este mismo
    despiste dio un tope de 885 px en el primer intento.


68. **Una ilustración no puede depender del orden de otra cosa** — la foto de
    «Nuestra historia» leía `config.heroSlides[0].image`. Al reordenar el
    carrusel de portada, esa página **cambió de foto sola** y sin que nadie se
    enterara. Ahora tiene su entrada propia (`aboutImage`), elegida para el
    texto que ilustra: el párrafo habla de pasar de unas familias a una
    comunidad, así que la foto enseña la sala llena.

69. **Un pie de foto que repite el `alt` estorba dos veces** — llevaban la
    misma clave: un lector de pantalla oía la frase como descripción y otra
    vez como pie, y quien ve la imagen leía debajo lo que ya estaba viendo. El
    `alt` describe la escena; si el pie no añade nada, no va.

70. **Copia escrita, traducida… y nunca enseñada** — la página empezaba en
    seco por «Nuestra historia», con el `h1` en `u-sr-only` porque «repetía el
    menú». No lo repetía: el menú dice «Quiénes somos» y el título dice
    **quiénes somos de verdad**. Y con él estaban escondidos el antetítulo y
    la entradilla, con **cero usos** en todo el proyecto. Antes de escribir
    texto nuevo, conviene buscar si ya existe y sólo está apagado.

71. **Cuatro cosas que pasan en orden no son cuatro tarjetas** — «Tu primera
    visita» eran cuatro fichas con filete, idénticas a la rejilla de pilares
    que hay más arriba **en la misma página**: dos bloques que se leían igual
    sin que ninguno dijera que uno es una secuencia. Numerados y unidos por un
    hilo, se leen como el recorrido que son. De paso se tiraron cuatro iconos
    que los datos declaraban y la plantilla nunca pintó.

72. **El texto de una primera visita responde miedos, no describe el acto** —
    lo que estaba escrito era el guion del culto («el culto empieza con cantos
    de alabanza»). Lo que alguien se pregunta antes de entrar por primera vez
    es otra cosa: **qué me pongo, tendré que hacer algo, qué hago con los
    niños**. Ahora cada paso contesta una de ésas: no hay ropa obligatoria, la
    letra se proyecta y nadie te mira, los niños se dejan y se recogen. Mismo
    número de palabras, otro trabajo.

73. **A un `<ul>` hay que quitarle el relleno del navegador** — el bloque de
    «cuándo y dónde» caía en x=201 mientras el resto de la página caía en 161.
    Los 40 px de `padding-inline-start` que trae una lista por defecto no los
    quita `list-style: none`. Se pone `padding-inline: 0` explícito.


74. **`auto-fit` no sirve para un número fijo de elementos** — los cuatro
    pilares y los cuatro capítulos de la confesión usaban
    `repeat(auto-fit, minmax(…, 1fr))`. Eso reparte por lo que quepa, y con
    cuatro elementos da **3+1** en cuanto la ventana baja de ~1.150 px:
    medido a 956, tres columnas de 278 px y una tarjeta sola en la segunda
    fila, además más baja que las otras por no tener con quién igualarse.

    Una rejilla de cuatro sólo tiene dos formas correctas —una fila o dos de
    dos— y `auto-fit` no elige ninguna por su cuenta. Con cortes explícitos
    (4 → 2×2 → 1) las filas quedan siempre llenas. Regla: `auto-fit` es para
    listas de longitud desconocida; con una cantidad fija se declaran las
    columnas.

75. **Si el texto no cabe bien en la tarjeta, se acorta el texto** — a cuatro
    en fila el cuerpo de un pilar cae en ~33 caracteres por línea, así que una
    frase de 95 se partía en cuatro renglones cortos y la tarjeta dejaba de
    ojearse. La salida no era ensanchar la columna —cuatro en fila es lo que
    dice «éstos son nuestros cuatro pilares» de un vistazo— sino escribir para
    el formato: las cuatro bajan a 60-85 caracteres y pasan de 3-4 líneas a
    2-3. Una tarjeta se ojea; si hay que leerla, no es una tarjeta.


76. **Una convicción sin referencia es un eslogan** *(el bloque lo sustituye
    la 78; la regla sigue en pie)* — los cuatro pilares de
    «Quiénes somos» decían cosas que valdrían para cualquier congregación del
    mundo («llevar el evangelio», «una iglesia sana»). El sitio tiene la
    confesión de fe entera, con sus 30 artículos numerados y enlazables, así
    que cada pilar pasa a **resumir un artículo concreto y a citarlo**:

    | Pilar | Artículo | Lo que dice |
    | --- | --- | --- |
    | Misión | 16 · La Iglesia | sus obras son anunciar el Evangelio y formar discípulos |
    | Visión | 11 · La santificación | crecer en semejanza a Cristo, toda la persona, toda la vida |
    | Comunidad | 13 · Los dones | «para el bien común de la Iglesia y no para provecho propio» |
    | Servicio | 29 · El amor | amar a todos sin discriminación y servir al que lo necesita |

    El número **se busca en `credo.data.ts`**, no se escribe a mano: si se
    reordena la confesión, la referencia sigue apuntando al artículo correcto
    en vez de quedarse mintiendo. Y el enlace usa el ancla que ya abre ese
    artículo, así que la afirmación se puede comprobar en dos clics.

    Regla general: cuando el sitio ya contiene la fuente, una afirmación
    resumida debe poder señalarla. Es la diferencia entre decir algo y
    respaldarlo.

77. **El texto de una visita también sale del documento** — la confesión
    responde con precisión lo que más descoloca a quien viene por primera vez
    y que ninguna página contaba: la Cena del Señor se comparte **al menos una
    vez al mes** y participan los creyentes bautizados (art. 19), y el domingo
    es el día de adoración (art. 25). Puesto como nota al pie del recorrido,
    evita que el visitante tenga que decidir sobre la marcha en mitad del
    servicio.


78. **Un bloque de «lo que hacemos» se copia del documento, no se redacta** —
    los cuatro pilares de «Quiénes somos» los habíamos escrito nosotros y
    luego les buscamos un artículo que los respaldara (decisión 76). Es el
    orden equivocado: el artículo 16 **ya enumera** las obras de la Iglesia
    —«la adoración, el anuncio del Evangelio, la formación de discípulos, el
    servicio y la comunión fraterna»— y ésa es la agrupación natural, la que
    la congregación reconoce porque es la que confiesa.

    Así que el bloque pasa a ser las **cinco obras**, con el nombre que les da
    el documento, y el cuerpo de cada una explica cómo se vive aquí, sin
    añadir doctrina: la adoración del domingo, el llamado al que se responde
    con fe y arrepentimiento (art. 9), el acompañamiento de por vida
    (art. 11), amar sin distinción (art. 29) y la Cena que fortalece la unidad
    (art. 19).

    Y cinco no caben en una rejilla de tarjetas: 3+2 o 4+1 dejan siempre una
    fila coja, y a cinco columnas el cuerpo caería en ~28 caracteres por
    línea. Va como **lista de filas** (icono · título + cuerpo · artículo a la
    derecha), que aguanta cualquier número y le da al texto el ancho que
    necesita. El número de artículo sale de `citarArticulo()`
    (`credo.data.ts`), nunca a mano.

    Regla general: si el contenido ya existe en un documento que la iglesia
    ha adoptado, **la agrupación también sale de ahí**. Lo que redactamos es
    cómo se vive, no lo que se cree.

79. **La llamada que cuesta cuota sólo la hace la pantalla que proyecta, y
    sólo en horario de culto** — la decisión 49 quitó el sondeo de la portada,
    pero lo dejó en `/media/transmisiuni`, que es una página pública. Medido
    con la aritmética entera: un domingo con 20 visitantes en esa página son
    **30.240 unidades, el 302 % de la cuota diaria**; una sola pestaña
    olvidada 24 h, 1.440 (14 %). El fallo no es que se gaste: es que se agota
    **el domingo por la mañana**, que es el único momento en que el dato
    importa.

    Hoy la comprobación pasa cuatro puertas, en este orden (una sola función,
    `debeComprobarDirecto()`, porque `pipe` sólo tiene 9 sobrecargas tipadas y
    con cinco `filter` el tipo degeneraba a `Observable<unknown>`):

    1. `presentation.isFullscreen()` — sólo la pantalla del templo. El
       público nunca llama a la API: su aviso de directo llega por el JSON
       estático, que es gratis.
    2. `schedule.enVentanaDeCulto()` — 15 min antes y 2 h después de cada
       comienzo **del programa real**, festivos incluidos: los sábados con
       evento suben el ritmo ellos solos, sin tocar código ni recordar nada.
    3. Techo diario en `localStorage` (900 unidades). Si falla la lectura,
       devuelve el techo: **falla cerrado**.
    4. `tocaSondear()` por marca de tiempo, no por contador de ciclos, para
       que el ritmo pueda cambiar sin resuscribir el temporizador.

    Resultado medido: domingo (dos cultos) **540 unidades, 5,4 %**; domingo
    más evento de sábado, 810 (8,1 %); una semana entera proyectando las siete
    ventanas, 1.890 (18,9 %). Fuera de ventana el intervalo es infinito: cero
    llamadas. Agotado el techo, el directo lo sigue anunciando el JSON: se
    pierde inmediatez, nunca la función.

    Regla general: **una API con cuota no se protege bajando el ritmo, se
    protege limitando quién la llama.** El ritmo es lo último que se ajusta.

80. **Una cita bíblica no es un aviso** — los anuncios de la congregación
    suelen cerrar con un versículo, y el primer sitio donde cabía era
    `footnote`: caja de fondo dorado y peso 600, que es el formato de «esto
    hay que recordarlo». Un texto bíblico no es una advertencia, es una cita,
    así que tiene campo propio (`verse`) y forma propia: serif de la marca
    —la que el sistema reserva para la Escritura—, filete de oro a la
    izquierda y la referencia en versalitas.

    En proyección no lleva tamaños propios: escala con `--pj-*` × `--fit`
    como todo lo demás, así que el autoajuste lo encoge con el resto del
    cartel en vez de recortarlo. Medido con el anuncio más largo que tenemos:
    escala 0,808 y sin recorte a 1920×1080 y a 1280×720.

81. **El organigrama tiene que decir sobre qué se apoya** — una página de
    cargos, sin más, se lee como una jerarquía; y es justo lo contrario de lo
    que confiesa la iglesia: «el sacerdocio es universal: todos los creyentes
    son sacerdotes de Dios» (art. 17). La nota de fundamento al pie de la
    estructura —cuerpo pequeño, filete de oro, con la referencia enlazada
    como una cita bibliográfica— cambia lo que la página significa sin añadir
    una sola caja.

    De paso salió a la luz que `leadership.lead` y `leadership.eyebrow` eran
    **claves huérfanas**: la cabecera de esa página se quitó y el texto se
    quedó ahí, traducido a dos idiomas, sin que nadie lo viera. Ver el barrido
    en `20-content-i18n.md`.


82. **Una casilla de cifra no aguanta una palabra** — la cuenta atrás de un
    evento («1 / ZI») se proyecta a 11u, que es tamaño de cifra. Cuando el
    evento es hoy, esa casilla no lleva un número sino un texto («ESTE AZI»),
    y a 11u medía 298 px dentro de una columna de 216: se salía por los dos
    lados y quedaba escrito encima del borde de la tarjeta, como un fallo de
    maquetación. La web ya tenía la excepción —bajaba el cuerpo cuando la
    fila era «hoy»— y la hoja de proyección no la copió.

    Regla general: **si una casilla puede contener texto en vez de una cifra,
    necesita su propio tamaño**, y la excepción se escribe en las dos hojas o
    en ninguna.

83. **Lo que cabe depende del QR, así que el reparto también** — dos eventos
    por diapositiva se calibró con el lienzo entero (1790 px de ancho: caben
    con 61 px de margen). Con el QR encendido el texto baja a 1250 px, las
    mismas tarjetas reparten en más líneas y se pasan 154 px de una caja de
    697: la segunda se cortaba a media frase.

    Se probó el camino corto —quitar la insignia redundante, recortar el
    resumen a una línea, apretar rellenos y huecos— y ganaba los 154 px
    justos: cero margen, y con un título una línea más largo vuelve a
    cortarse. Así que el reparto pasa a depender del ancho real:
    `UPCOMING_PER_SLIDE_QR = 1` con QR, `UPCOMING_PER_SLIDE = 2` sin él. Con
    una sola tarjeta sobra altura, así que el resumen se lee entero y la
    tarjeta se centra.

    Regla general: cuando una diapositiva se corta, **la pregunta no es cuánto
    puedo apretar sino cuántas piezas caben**. Apretar gasta el margen que
    necesitas para el contenido de la semana que viene.

84. **El operador decide sobre cosas, no sobre páginas** — el panel listaba
    los eventos como «Evenimente viitoare · 1/2», que es un detalle interno:
    las páginas cambian solas al encender el QR y no significan nada para
    quien está en la mesa de sonido. Ahora hay **una fila por evento**, con
    su casilla, su título y salto a la diapositiva donde se proyecta — la
    misma forma que ya tenían los anuncios.

    Y ocultarlos todos no es lo mismo que no tener ninguno: sin eventos en el
    calendario sale la diapositiva vacía con su mensaje; ocultados a mano, el
    bloque desaparece del carrusel. La pantalla nunca dice «no hay eventos»
    cuando sí los hay.


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
- Pendiente: galería y transmisiones → `ui-card`; accesos rápidos de la
  portada → `ui-card` (hoy consumen los mismos tokens pero conservan su clase
  propia). Las tarjetas de «hoy» ya no están: el bloque desapareció en el
  rediseño de la portada y sus claves se borraron en el barrido de la
  iteración 20.
- Panel de control: la lista de diapositivas → `ui-row`; el aside → `ui-panel`;
  la barra superior → `ui-toolbar` (hoy ya hereda densidad y superficie).
- Páginas editoriales: cabeceras de sección → `ui-section-head`.
- Al migrar, **borrar** el CSS que la primitiva sustituye: si no, quedan dos
  verdades.
