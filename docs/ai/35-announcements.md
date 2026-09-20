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
| Panel de medios (proyección)  | Bloque `announcements`, **una diapositiva por anuncio**, al principio del carrusel |

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
  title: 'Conferință de tineret „ANCORAT”',   // UNA frase: es lo que se lee de lejos
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

## Límites de proyección (lo que garantiza que se lea a 15 m)

La diapositiva mide el contenido y, si no cabe, **encoge todo a la vez**
(`appFitToBox` busca por bisección la mayor escala `--fit` entre 1 y 0,6 con
la que cabe; `announcement-card.component.scss` multiplica cuerpos y
espaciados por ese factor). Funciona con y sin QR y con cualquier tamaño de
QR. Pero por debajo de ~0,8 la letra empieza a perder lectura desde el fondo,
así que la regla es **redactar para que quepa a 1**:

| Pieza        | Límite recomendado                                             |
| ------------ | -------------------------------------------------------------- |
| `title`      | ≤ 60 caracteres, sin punto final                               |
| `lead`       | ≤ 2 frases, ≤ 220 caracteres                                   |
| `sections`   | ≤ 3 (cada una es una columna)                                  |
| `items`      | ≤ 7 por sección; `label` ≤ 40 caracteres                       |
| `footnote`   | 1 frase                                                        |

Si un aviso trae más información que esto, **no la aprietes**: quita lo que no
se decide mirando la pantalla (p. ej. detalles de menú secundarios) o divide en
dos anuncios con `id` distintos (uno por tema). El detalle completo siempre está
en la web, a un escaneo del QR.

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
