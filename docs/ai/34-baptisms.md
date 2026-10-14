# 34 · Botezuri — registro de bautismos y candidatos

> Módulo `/botezuri` (menú **Program → Botezuri**). Línea visual propia, fuera
> de la guía de `/stil` (petición expresa): marca navy + oro y un acento «agua»
> (azul claro) que sólo vive aquí.

## Qué hay

| Ruta | Componente | Qué enseña |
| --- | --- | --- |
| `/botezuri` | `features/baptisms/baptisms.component` | Cabecera (cifras + próximo / último botez), carrusel de candidatos con filtro por año, registro |
| `/botezuri/<fecha>` | el mismo | Lleva a ese botez del registro y lo destella. Guarda `baptismExists` |
| `/botezuri/<fecha>/<id>` | `candidate-profile/` | Perfil del candidato. Guarda `candidateExists` (errata → al botez) |

Todas las rutas van con **`noindex`**: hay menores (nombre, foto, ciudad). Se comparten por enlace pero no salen en buscadores, igual que
«Rugăciune pentru familii».

## Datos

- `core/baptisms.config.ts` → `BAPTISMS` (una entrada por botez, en orden
  cronológico en el fichero).
- Por botez: `date` (id y URL), `time?`, `cover?` (foto de grupo),
  `driveFolderId?`, `youtubeId?` (directo del servicio), `ministers?` (quién
  predicó, del título del directo) y `candidates`.
- Por candidato: `id` (= nombre del retrato), `name`, `age?` (el día del
  botez; **dato interno, no se publica**), `origin?` (**también interno**: no sale en tarjetas, rejilla ni perfil desde el 14/10/2026), `parents?` («Remus și Lavinia») y `story?` (`summary`, `testimony[]`, `verse`) — el
  perfil ampliado, opcional, como las biografías de `conducere`. **Nada se
  rellena**: sin dato, no se pinta.
- `core/services/baptisms.service.ts` deriva todo: ordinal (#01… cronológico),
  estado frente a hoy (`past` / `today` / `upcoming`, con el reloj
  compartido), enlaces, cifras, `newestFirst` (orden de lectura) y retratos.

### Orden

El registro y el carrusel se leen **del más reciente al más antiguo**. Si hay
un botez con fecha futura, encabeza el registro con cuenta atrás y es la
tarjeta de la cabecera; si no, la línea empieza con «Următorul botez · data se
anunță» y la llamada a hablar con el pastor. Anterior / siguiente en el perfil
siguen el mismo orden.

## Fuentes (auditoría del 14/10/2026)

- **Presentaciones** (`BOTEZURI/<fecha>/*.pptx`, 8 botezuri de 2020-07-23 a
  2025-05-25): nombre, edad y ciudad de cada candidato y su foto. Se usó la
  foto original cuando había una mejor que la de la diapositiva (2021-11,
  2022-10 a 3000 px, 2025-05).
- **YouTube** (canal oficial, 781 vídeos, API con la clave de la web): hay
  directo para los 8 botezuri desde nov. 2021. Los de 2020-07 y 2021-10 no
  tienen vídeo (el canal no tiene subidas entre 2016 y nov. 2021). Ningún
  botez existe sólo como directo. Los títulos dan quién predicó → `ministers`.
  Para repetir la búsqueda: listar el playlist de subidas
  (`UU` + id del canal sin `UC`) y filtrar títulos por «botez».
- **Presentaciones con perfil** (testimonio, edad, padres, versículo; sin
  ciudad): 2026-05-31 y **2025-11-30** (14/10/2026: 10 candidatos; fotos de la
  presentación salvo Andrea Sidor, de `IMAGINI` a 1200 × 1600; caras de
  Alessia Toma y Dina Istrătoaie puestas a mano; Ana Costin sólo trae
  versículo, sin testimonio).

## Retratos

Dos juegos, los dos se conservan:

| Juego | Carpeta | Cómo se hace |
| --- | --- | --- |
| **original** | `assets/baptisms/<fecha>/<id>-{320,640,1080}.webp` | La foto tal cual, recortada a 4:5 por la cara (`scripts/assets-src/baptism-crops.json`). Las de 2021-11 traían el nombre impreso al lado: se borró con *inpainting* antes de importar |
| **studio** | `assets/baptisms-studio/…` | Persona separada del fondo (BiRefNet-portrait), mismo encuadre para todos (cara a 1/4,2 del alto, 8 % de aire sobre el pelo, sin pasar de los bordes donde la persona ya estaba cortada) y el mismo fondo de estudio gris azulado con sombra muy leve |

`PORTRAIT_STYLE` en `baptisms.service.ts` elige cuál se ve (`'studio'` hoy).
Volver al original = cambiar esa línea. Si a alguien le falta el de estudio,
se usa su original.

## Receta: nuevo botez o nuevos candidatos (seguir tal cual)

Herramientas (todas en `scripts/`):

| Script | Para qué |
| --- | --- |
| `baptism-prepare.py` | `pptx` (leer presentación) · `stage` (carpeta de trabajo) · `faces` (cara + recorte 4:5) · `detext` (borrar texto impreso) · `sheet` (hoja de contacto) |
| `import-baptism-photos.mjs` | Publicar retratos: originales (`<carpeta> <fecha>` / `--all`) y de estudio (`--studio`); regenera los manifiestos |
| `baptism-studio.py` | `mask` (separar persona, BiRefNet-portrait) · `compose` (encuadre igual + fondo de estudio) |
| `baptism-youtube.mjs` | Directos de botez del canal (oficial u otro: `node … <channelId>`) |

Python (una vez), en un entorno propio: `py -3.12 -m venv ~/.venvs/elim-photos`
y `pip install "opencv-python-headless<4.13" pillow numpy "rembg[cpu]" python-pptx`
(OpenCV 5 quitó `CascadeClassifier`, que usa la detección de caras). Con la
consola de Windows, `PYTHONIOENCODING=utf-8` para que `pptx` imprima los
diacríticos.
El modelo de rembg (~970 MB) se descarga solo la primera vez a `~/.u2net`.

1. **Leer la presentación** de cada botez (carpeta `BOTEZURI/<fecha>/`):
   `python scripts/baptism-prepare.py pptx "<carpeta>" <tmp>` → texto e
   imagen por diapositiva («NUME PRENUME | 17 ANI - BISTRITA»).
2. **Datos** en `core/baptisms.config.ts`, entrada del botez (fecha `YYYY-MM-DD`
   = nombre de la carpeta):
   - nombre en orden **Nombre Apellido**, en mayúsculas/minúsculas normales;
     sin inventar diacríticos en apellidos; ciudades con diacríticos
     (Bistrița, Pitești, Timișoara, Reșița, Zalău, Botoșani);
   - `id` = slug del nombre (`natalia-cuth`);
   - `age` y `origin` se guardan si vienen, **pero no se publican**;
   - orden de los candidatos = el de la presentación.
   - si la presentación trae **perfil** (desde 2026-05-31 cada diapositiva
     lleva testimonio, edad y padres), se adapta así: `testimony` = sus
     párrafos tal cual (sólo ortografía: mayúscula de reverencia
     en los pronombres de Dios —«să-L urmez», «Îl iubesc», «calea Sa»—,
     comillas „…”, puntuación; sin cambiar palabras),
     agrupando frases cortas en 2-4 párrafos y cerrando con «Amin.» en el
     último; `summary` = la frase más significativa de su propio testimonio
     (cita destacada, no se reescribe); el versículo que cite →
     `verse` con su referencia; los padres → `parents`.
3. **Elegir la mejor foto** de cada candidato: si en la carpeta hay originales
   sueltos (`POZE`, `IMAGINI`…) de más resolución que la de la diapositiva,
   ésos (emparejar mirando una hoja de contacto: `sheet`). Manifiesto
   `[{date, id, src}]` (`src` = ruta del fichero o `presentación.pptx#N`) →
   `python scripts/baptism-prepare.py stage manifest.json <staging>`.
4. **Texto impreso** sobre la foto (nombre, edad): `detext <foto> x0,y0,x1,y1`
   con el rectángulo del texto en fracciones; revisar el resultado.
5. **Caras y recorte**: `python scripts/baptism-prepare.py faces <staging>`.
   Revisar `sheet <staging> out.jpg --crops`: si una cara está mal (detecta
   una boca, una mano…), poner a mano `[x,y,w,h]` en
   `scripts/assets-src/baptism-faces.json` y repetir con `--force`.
6. **Originales**: `node scripts/import-baptism-photos.mjs --all <staging>`
   (o `"<staging>/<fecha>" <fecha>` para uno solo).
7. **Estudio**: `python scripts/baptism-studio.py mask <staging> <cache>`
   (~80 s por foto en CPU; dejarlo en segundo plano; la caché sirve para
   siempre) → `compose <staging> <cache> <studio>` → **revisar la hoja de
   contacto** (`sheet <studio> out.jpg`) → `node scripts/import-baptism-photos.mjs --studio <studio>`.
   `--studio` reemplaza **sólo las fechas que trae** `<studio>` (desde el
   14/10/2026; antes borraba todos los retratos de estudio): basta con el
   botez nuevo.
8. **YouTube**: `node scripts/baptism-youtube.mjs` → `youtubeId` y
   `ministers` (nombres del título del directo). «Botezul cu Duhul Sfânt» no
   es un bautismo, ni una predicación sobre el botez (no se enlazan).
9. **Fotos del día** (Drive): `driveFolderId` (sólo el ID; ver
   `20-content-i18n.md` → galería) y, si hay foto de grupo, `cover`.
10. `npx tsc -p tsconfig.app.json --noEmit`, `npm run check` y mirar
    `/botezuri` y un perfil en escritorio y móvil.

### Perfiles desde el directo (cuando no hay presentación con testimonio)

Desde 2025-05 cada candidato graba su mărturie en audio y suena en el
directo antes de bajar al agua (2025-05-25: de 2:45:17 a 3:05:11). Receta
(14/10/2026):

1. Subtítulos automáticos, sin vídeo, con el yt-dlp **actual** del venv
   (el global, de 2025, lo rechaza YouTube):
   `~/.venvs/elim-photos/Scripts/python.exe -m yt_dlp --skip-download
   --write-auto-subs --sub-langs "ro-orig,ro" --sub-format json3 <url>`.
2. Pasar el `json3` a texto con su minuto y buscar los nombres: cada
   mărturie empieza por «Numele meu este… / Mă numesc… / Soy…».
3. Los nombres de los padres que deforma el reconocimiento se confirman con
   la **presentación del pastor** al inicio del servicio (≈ 0:57 en 2025-05).
4. Se adapta como un testimonio escrito (párrafos, ortografía, mayúscula de
   reverencia, «Isus» como en el resto del sitio, «Amin.» al final) y se
   **quita la frase inicial con nombre y edad** (la edad no se publica).
   Si la dijo en español, **se traduce al rumano** (todo el contenido va en
   rumano; la app lo traduce al español).
5. `story.at` = segundo en que empieza su audio: el perfil pinta «Ascultă
   mărturia · h:mm:ss», que abre el directo en ese momento.

Botez **futuro**: basta la entrada con su fecha (y `time`); la web lo anuncia
sola con cuenta atrás. Candidatos y retratos se añaden cuando se tengan.

Lo que no se puede arreglar con la foto: cabeza cortada en el original (queda
pegada al borde), fotos de muy baja resolución (se publican a su tamaño, nunca
se amplían). Pedir otra foto.

## Diseño (decisiones)

- **Cabecera** «de agua»: superficie navy con ondas concéntricas (gota sobre
  el agua; respiran despacio, quietas con `prefers-reduced-motion`), cifras en
  columnas alineadas y la tarjeta de cristal del próximo / último botez.
- **Carrusel** de retratos 4:5 sobre el carrusel compartido
  (`app-card-carousel`, `48-carousel-cards.md`): flechas superpuestas que
  aparecen al apuntar (sólo puntero fino), degradados en los bordes con
  contenido, arrastre con ratón, anclaje por tarjeta, teclado, barra de
  posición (`[progress]="true"`) y entrada escalonada de las tarjetas.
  Sangra con `--page-inset`; con pocas tarjetas (un año) se alinea a la
  izquierda, no centrada. Texto sobre la foto, fecha en pastilla de cristal y
  etiqueta dorada «Mărturie» si hay testimonio. Al cambiar de año la pista
  vuelve al principio (sin `overflow-anchor`).
- **Registro** en línea de tiempo: columna de fecha pegajosa en escritorio
  (día grande, mes, año, día de la semana, nº de candidatos), nodo sobre una
  línea oro → agua (lo reciente arriba). Rejilla `auto-fill` de retratos
  (diez por fila en escritorio, tres en móvil): aguanta el doble de botezuri
  sin cambiar nada. Si el botez tiene **foto de grupo** (`cover`), va la
  primera, a doble ancho (8:5 = dos retratos), y se amplía en el visor; lo
  mismo en «Botezați împreună» del perfil. Bajo cada botez, pastillas «Transmisiunea» (YouTube) y
  «Fotografii» (Drive) y quién predicó.
- **Perfil**: retrato entero en la cabecera (se amplía en el visor), datos del
  botez en una tabla de cristal (fecha, de dónde, padres, cuántos ese día; la
  edad no se muestra), su frase destacada como cita en la cabecera,
  testimonio y versículo si los hay, «Botezați împreună» con el grupo del día y
  anterior / siguiente con miniatura. Sin testimonio, el grupo ocupa el ancho.

## Auditoría del 14/10/2026 (compacto y fluido)

Medido a 1440×900 y 375×812, antes → después:

| | Antes | Después |
| --- | --- | --- |
| Cabecera (escritorio) | 638 px (tarjeta vertical de 528) | 416 px (tarjeta horizontal de 214); los candidatos se ven en la primera pantalla |
| Cabecera (móvil) | 882 px | 529 px (cifras en una fila, tarjeta horizontal, entradilla a 4 líneas, sin el atajo al registro) |
| Página entera (escritorio) | 5423 px | 5054 px |

Reglas de rendimiento (para que el carrusel no tenga un solo tirón):

- **Nada de `backdrop-filter`** en piezas que se repiten (pastillas de las
  tarjetas) ni encima de una animación (la tarjeta y el rótulo de la
  cabecera están sobre las ondas): el desenfoque se recalcula en cada
  fotograma. Fondos opacos tintados en su lugar.
- **El hover sólo anima `transform` y `opacity`.** La sombra y el filo
  dorado del hover son capas propias (`::before`, `.bz-card__ring`) que se
  encienden con `opacity`; nunca `box-shadow` animado. `contain: layout paint
  style` en cada tarjeta.
- **Al apuntar**: sólo la tarjeta bajo el puntero reacciona (sube 6 px con el
  filo dorado). Las vecinas **no se atenúan** (14/10/2026, a petición del
  usuario: la fila entera se veía lavada de blanco). La entrada escalonada usa `animation-fill-mode: backwards` para
  no retener la opacidad.
- **Carrusel compartido**: una medición por fotograma
  (`requestAnimationFrame` en el `scroll`), barra de posición movida con
  `translateX` y flechas con escala al apuntar y al pulsar.
- Ondas de la cabecera en capa propia (`will-change: transform`).
- Imágenes de tarjetas y rejillas con `alt=""`: el nombre ya está en el
  texto (antes el lector de pantalla lo leía dos veces).
