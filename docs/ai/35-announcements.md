# 35 · Anunțuri (avisos de la congregación)

> Lee este shard **entero** antes de añadir, editar o retirar un anuncio. Es
> corto y evita los dos errores típicos: texto sin estructura que no cabe en la
> pantalla del templo, y un anuncio que sigue proyectándose después de su fecha.

## Qué es un anuncio y dónde vive

Un anuncio es **contenido estructurado** declarado en
`src/app/core/church.config.ts → announcements` (tipo `Announcement`). No hay
CMS ni backend: añadir un anuncio es añadir un objeto y desplegar.

El mismo objeto se pinta en **tres sitios** con **un solo renderizador**
(`features/announcements/announcement-card/`):

| Dónde                         | Cómo llega                                                          |
| ----------------------------- | ------------------------------------------------------------------- |
| Web `/anunturi`               | `AnnouncementsComponent` lista los vigentes, el más próximo primero  |
| Web `/anunturi/<id>`          | El mismo componente con uno solo: **enlace para compartir** (WhatsApp) |
| Proyección                    | Bloque `announcements`, **un anuncio = una o varias diapositivas** (páginas), al principio del carrusel |
| Panel completo de la web (`/media`) | **No aparecen** (decisión del usuario, 22/09/2026): los anuncios sólo viven en su sección y en la proyección; `/media/anunturi` redirige a `/anunturi` |

Vigencia: desde `publishedOn` (opcional, incluido) hasta `expiresOn`
(obligatorio, incluido), en días naturales locales. `AnnouncementsService`
filtra los caducados con el reloj compartido, así que **no hay que borrar
nada**: el anuncio desaparece solo de la web y de la proyección el día
siguiente a `expiresOn`. Si se quiere retirar antes, se adelanta `expiresOn`.

Cuando no queda ningún anuncio vigente el bloque se autoexcluye de la
proyección (regla automática de `PresentationBlocksService`), la web muestra
el estado vacío y un enlace compartido a un anuncio caducado muestra «ya no
está en vigor» con acceso a los demás.

## El modelo

```ts
{
  id: 'ancorat_2026',                 // estable, minúsculas, sin espacios (va en la URL)
  title: 'Conferință de tineret "ANCORAT"',   // UNA frase: es lo que se lee de lejos
  date: '2026-09-26',                 // opcional, YYYY-MM-DD: fecha del hecho anunciado
  time: '18:00',                      // opcional, texto libre ('10:00 & 18:00')
  place: 'Biserica Elim',             // opcional
  lead: '…',                          // 1-2 frases: lo que se lee en voz alta antes del programa
  sections: [                         // 0-3 secciones → columnas en proyección
    {
      heading: 'Program',             // epígrafe corto, en versalitas
      kind: 'schedule',               // list | prices | people | schedule (ver tabla)
      items: [
        { label: 'Sâmbătă 26 septembrie, 18:00', value: 'Mesaj, apoi întrebări și răspunsuri' },
      ],
    },
    {
      heading: 'Meniu',
      kind: 'prices',
      items: [{ label: 'Copil sub 4 ani', value: 'gratuit', note: 'fără meniu; cu meniu 13 €' }],
    },
  ],
  footnote: '…',                      // opcional: invitado principal, aviso importante
  publishedOn: '2026-09-20',          // opcional: primer día visible
  expiresOn: '2026-09-27',            // OBLIGATORIO: último día visible
}
```

- `label` es lo que se lee; `value` el dato complementario; `note` la letra
  pequeña. **Cómo se maqueta lo decide `kind`** (elige siempre el que toque:
  es lo que hace que el anuncio parezca diseñado y no pegado):

  | `kind`     | Para                          | Cómo se pinta                                              |
  | ---------- | ----------------------------- | ---------------------------------------------------------- |
  | `prices`   | tarifas, cuotas               | `label` … línea de puntos … `value` en negrita a la derecha |
  | `people`   | nombres (inscripciones, invitados) | `label` en negrita · `value` atenuado en la misma línea («cu soția», «Timișoara»); con > 5 nombres fluye en dos columnas si hay anchura |
  | `schedule` | programa, horarios            | `label` = cuándo (negrita navy) y debajo `value` = qué       |
  | `list`     | cualquier otra enumeración    | como `people`, sin columnas                                 |

- Una lista de nombres son `items` con sólo `label` (y `value` para el
  acompañante). No metas el acompañante en el `label`.
- El texto va **en rumano** y no se traduce (igual que el programa semanal y
  los eventos): son avisos propios de la iglesia. Las etiquetas de interfaz
  («Anunț», «Toate anunțurile»…) sí son i18n, bajo `announcements.*`.

## Cómo se ve (anatomía de la tarjeta)

Un solo diseño, en la web y proyectado (`announcement-card.component.scss`):

```
┌ 18 ┐  [ANUNȚ]  duminică, 18 octombrie 2026  ◷ 10:00        ← ficha de fecha + insignia + meta
│OCT │  Sărbătoare: 25 de ani de la înființarea Bisericii Elim  ← título serif + regla dorada
└────┘  ⌖ Biserica Elim · masă festivă la restaurantul…      ← lugar
Continuăm sărbătoarea și la masă. Înscrierea este necesară…  ← resumen (lead)
MENIU            │ ÎNSCRIERI LA FRAȚII │ VOR FI ÎMPREUNĂ CU NOI   ← columnas editoriales
Adult ······26 € │ Halas Petrică       │ Pastor G. Zăgrean · cu…    (filetes, no cajas)
Mesajul de bază: pastorul Simion Bumbar…                     ← nota final en banda dorada
```

- Sin `date`, no hay ficha: la insignia sigue marcando que es un anuncio.
- En proyección las secciones son columnas separadas por filetes con la
  cabecera subrayada en oro; en la web, tarjetas con un filete dorado arriba.
- Colores: navy (ficha, títulos, valores), oro (insignia, filetes, nota) y
  gris carbón. Nada más: el anuncio debe verse de la misma familia que el
  resto del panel.

## Proyectar sólo algunos anuncios

En el panel de ajustes (icono de cuadrícula), bajo «Anunțuri», cada anuncio
vigente tiene su casilla. Desmarcarla lo saca **sólo de la proyección** (sigue
en `/anunturi`); «Restablecer» vuelve a mostrarlos todos. Cada diapositiva de
anuncio dura por defecto **30 s** (ajustable en la misma fila; ver
`30-presentation.md → Duración por bloque`).

## Cómo se proyecta: **un anuncio = una diapositiva** (cartel)

Decisión del usuario (22/09/2026): los anuncios **no se parten** en páginas;
verlos de un vistazo vale más que un cuerpo uniforme. La tarjeta se maqueta
como un cartel y la jerarquía hace el trabajo:

| Pieza | Tamaño | Se lee desde |
| --- | --- | --- |
| Título | `--pj-fs-title` (8u) | el fondo |
| Fecha, hora, lugar, insignia | `caption` / `eyebrow` (≥ 3,2u siempre) | media sala |
| Resumen (`lead`) | `body` (4,6u) | media sala |
| Secciones | epígrafe `eyebrow`, filas `body` | primeras filas y móvil (QR) |
| Nota de cierre | `caption` | media sala |

Maquetación (`announcement-card.component.scss`, bloque `.stage.is-fullscreen`):

- **Hasta dos secciones → columnas** a partes iguales (una lista de personas
  larga va a dos subcolumnas). **Tres o más → apiladas** a todo el ancho y las
  listas de personas/`list` en **texto corrido** («Halas Petrică · Sidor Ionel
  · …»): tres columnas de 38u partían cada nombre en tres líneas.
- El programa (`schedule`) va «cuándo — qué» en una línea; las notas de una
  fila (`note`) a continuación de la fila, no debajo.
- `appFitToBox` ajusta la tarjeta entre **1 y 0,7**. Es la red de seguridad,
  no la norma: a 0,7 el cuerpo queda en 3,2u (el mínimo absoluto) y el titular
  en 5,6u; etiquetas y secundarios no bajan de 3,2u (`max()` en la hoja).
- **`webOnly: true`** en una sección la deja sólo para la web (`/anunturi`),
  no para el cartel: es la válvula para el detalle que no cabe legible (listas
  largas de nombres, condiciones). Ejemplo: en el 25.º aniversario la lista de
  invitados va `webOnly`; el menú y las inscripciones (lo accionable) se
  proyectan.

En el panel de control cada anuncio es una fila; la casilla de visibilidad
decide si se proyecta.

### Límites de redacción (para que el cartel quepa a escala 1)

| Pieza        | Límite recomendado                                             |
| ------------ | -------------------------------------------------------------- |
| `title`      | ≤ 56 caracteres (dos líneas a 8u), sin punto final             |
| `place`      | ≤ 45 caracteres (una línea)                                    |
| `lead`       | ≤ 2 frases, ≤ 130 caracteres (dos líneas)                      |
| `sections`   | ≤ 2 para columnas; con 3 pasan a apiladas                      |
| `items`      | ≤ 6 por sección; `label` ≤ 40 caracteres; personas ≤ 8 por lista |
| `footnote`   | 1 frase, ≤ 85 caracteres (dos líneas)                          |

Cuando un aviso trae más que esto, el orden de decisión es: (1) acortar el
texto sin perder el dato, (2) marcar `webOnly` la sección que es detalle,
(3) partir en **dos anuncios** con `id` distintos (uno por tema). Nunca
apretar: si el autoajuste baja de ~0,85 el cartel se lee mal desde el fondo,
y el detalle completo siempre está en la web, a un escaneo del QR.

## Cómo redactar (protocolo para la IA)

Cuando el usuario pase un aviso en bruto (normalmente texto de WhatsApp):

1. **Corrige** ortografía y diacríticos rumanos (ș, ț, ă, î, â), horas
   («18:00», nunca «18;OO»), mayúsculas de nombres propios y puntuación.
   Mantén los nombres de personas tal cual se escriben en la iglesia.
2. **Estructura** en lugar de transcribir: fecha/hora/lugar a sus campos,
   precios y listas a `sections` **con su `kind`** (`prices`, `people`,
   `schedule`, `list`), la frase que resume el aviso a `lead`, el invitado
   principal o el matiz importante a `footnote`.
3. **Acorta** sin perder datos que la persona necesita para actuar (a quién
   acudir, cuánto cuesta, cuándo, dónde). Lo decorativo sobra.
4. **Deduce `expiresOn`**: normalmente el día del evento; para inscripciones,
   el último día del plazo («până duminica viitoare» = el domingo siguiente a
   la fecha de hoy). Si no hay fecha, pregunta.
5. Si el aviso implica un evento (conferencia, bautizo, aniversario…), añade
   **también** la entrada en `upcomingEvents` (ver `20-content-i18n.md`): el
   anuncio caduca, el evento sigue en el calendario.
6. Comprueba en la proyección (`/media` → Presentar) que la diapositiva cabe
   con QR «M»; si `--fit` baja de 0,8, recorta.

## Ficheros implicados

| Fichero                                                       | Papel                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `core/church.config.ts`                                       | Tipos `Announcement*` y datos                           |
| `core/services/announcements.service.ts`                      | `active`, `hasActive`, `byId()`                          |
| `core/util/iso-date.ts`                                       | `parseIsoDate`, `startOfDay` (compartido con la agenda)  |
| `core/services/presentation-blocks.service.ts`                | Bloque `announcements` + `expand()` → una diapositiva por anuncio |
| `features/announcements/announcement-card/`                   | **El renderizador** (web + proyección, `ViewEncapsulation.None`) |
| `features/announcements/fit-to-box.directive.ts`              | Autoajuste `--fit`                                       |
| `features/announcements/announcements.component.*`            | Página `/anunturi` y `/anunturi/:id`                     |
| `features/stage/blocks/announcement-block/`                   | Envoltorio del bloque en el escenario                    |
| `assets/i18n/{es,ro}.json → announcements.*`, `nav.announcements*`, `seo.announcements.*` | Textos de interfaz |

## Qué NO hacer

- No crear una plantilla o componente nuevo «para este anuncio». Si de verdad
  falta un tipo de contenido (una imagen, un botón), se amplía el **modelo**
  y el renderizador, y sirve para todos los siguientes.
- No meter HTML ni saltos de línea en los campos: son texto plano.
- No escribir el anuncio en las traducciones (`es.json`/`ro.json`): allí sólo
  van rótulos de interfaz.
- No borrar anuncios caducados por «limpieza» en el mismo cambio en que se
  añade uno nuevo: puede borrarse, pero como cambio aparte y consciente (los
  caducados no se muestran ni pesan en la proyección).
