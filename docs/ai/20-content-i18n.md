# 20 · Contenido e i18n

## Principio

- **Datos no traducibles** (URLs, handles, fechas ISO, gradientes, IDs) →
  `src/app/core/church.config.ts`.
- **Textos visibles** → `src/assets/i18n/es.json` y `ro.json`.
- Los textos propios de un servicio concreto (título de la predica, nombre del
  predicador) viven en `church.config.ts` porque no se traducen: son nombres
  propios en rumano.

## `church.config.ts` — estructura

```ts
ChurchConfig {
  logo, publicUrl,
  youtubeChannelUrl, youtubeStreamsUrl, youtubeChannelId, youtubeApiKey,
  socials: SocialLink[],          // id, i18nKey, handle, url, icon, gradient
  mediaGalleryUrl,
  mediaEvents: MediaEvent[],      // id, i18nKey, image, thumb, gradient, driveUrl
  weeklyProgram: WeeklyProgram[], // id, day (0=Dom…6=Sáb), dayLabel, time, title, description
  upcomingEvents: UpcomingEvent[],// id, date 'YYYY-MM-DD', time, title, description, verse?, preacher?, worshipLead?
  announcements: Announcement[],  // id, title, date?, time?, place?, lead, sections[], footnote?, publishedOn?, expiresOn — ver 35-announcements.md
  location: ChurchLocation,       // address, city, mapsShareUrl, mapsQuery
  contact: ChurchContact,         // email, phone, phoneDisplay, whatsapp, officeHoursKey
  donations: DonationInfo,        // holder, bank, bic, bizum, accounts: DonationAccount[]
}
```

> `contact` es **real** desde el 29/09/2026 (correo y teléfono del pastor);
> el mismo número atiende **WhatsApp** (confirmado). Con `whatsapp: null`, ni la
> página de contacto ni el pie pintan el botón. Los enlaces `tel:` y `wa.me`
> se componen con `core/util/contact-links.ts`; el chat se abre con el saludo
> `contact.quick.whatsapp_text` ya escrito (editable antes de enviar).
> **Formulario de contacto** (30/09/2026): se envía por detrás, sin abrir el
> gestor de correo (`ContactFormService` → Web3Forms, `contact.form` en
> `church.config.ts`). La clave es pública por diseño (sólo envía al buzón
> con el que se creó) y el correo llega con «Responder a» = el visitante.
> Antispam sin captcha (campo trampa + 3 s mínimos; al bot se le simula el
> éxito) y casilla RGPD obligatoria. **Mientras `accessKey` sea `null` no
> envía**: muestra el error con el correo directo. `donations` ya es
> **real** (29/09/2026): una cuenta en euros en BBVA a nombre de «IGLESIA
> APOSTOLICA ELIM», IBAN comprobado, sin Bizum. `bank`, `bic` y `bizum`
> admiten `null`: lo que no exista no se pinta.

**Página «Donează»** (29/09/2026, de 1.870 a ~680 px en escritorio): una
pantalla en dos columnas — el porqué (lema, versículo, destinos 2 × 2) y la
**tarjeta de donación** (Bizum primero y agrupado «600 000 000»; IBAN por
divisa, nunca cortado con «…»; titular/banco/BIC en pequeño; el aviso de
datos de ejemplo es una píldora dentro de la tarjeta). En móvil la tarjeta
va justo tras el versículo, antes de los destinos. Una cuenta que no exista
se borra de `accounts` y la tarjeta se adapta; sin Bizum (`null`), no sale.

> `youtubeApiKey` está restringida por HTTP referrer, por eso puede vivir en el
> repositorio. **No añadas secretos reales** aquí; los del cron viven en
> GitHub Secrets (ver `docs/ai/50-build-deploy.md`).

## `leadership.config.ts` — el organigrama

Vive **aparte** de `church.config.ts` porque no es una lista más: es un grafo
personas ↔ departamentos, y se actualiza cuando cambia la iglesia, no cuando
cambia la web.

```ts
PEOPLE              // registro único de nombres → deriva el tipo `PersonId`
LEADERSHIP_OFFICES  // 7 cargos de gobierno, del pastor a los cenzori (Department[])
CHURCH_COMMITTEE    // comitetul bisericii: sólo PersonId, en el orden del acta
SERVICE_AREAS       // 7 áreas, cada una con sus departamentos
PEOPLE_INDEX        // derivado: PersonId → todos sus cargos
```

Regla de oro: **el nombre se escribe una sola vez**, en `PEOPLE`. Los
departamentos sólo guardan `PersonId`, así que una referencia a alguien que no
existe **no compila**, y el «¿qué más hace esta persona?» de la ficha se
calcula solo recorriendo la estructura.

| Quiero…                        | Hago                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| Añadir una persona             | Entrada en `PEOPLE` + referencia desde su departamento                     |
| Cambiar quién lleva algo       | Editar `members` de ese `Department`                                       |
| Cambiar el comité              | Editar `CHURCH_COMMITTEE`: lista de `PersonId`, sin función propia         |
| Añadir un departamento         | Meterlo en su `ServiceArea` + clave `leadership.departments.<id>` en es/ro |
| Añadir un cargo permanente     | Valor en `PersonTitle` + clave `leadership.titles.*`                       |
| Añadir una función interna     | Valor en `ServiceRole` + clave `leadership.roles.*`                        |
| Poner la foto de alguien       | Fichero cuadrado (≥ 400 px, cara centrada, WebP) en `src/assets/leadership/<id>.webp` + `photo: '<id>.webp'` en su entrada de `PEOPLE` |

**Página «Conducere»** (rediseño del 29/09/2026, de 4.200 a ~1.850 px en
escritorio): tres bloques — conducerea **por personas** (cada una una vez,
avatar + todos sus `titles`; el pastor destacado), comité en tira de
avatares y **directorio** de las siete áreas en paneles en columnas con
buscador (persona o departamento, sin distinguir diacríticos). El avatar
(`features/leadership/person-avatar`) pinta la foto si la hay (`cover`,
circular) y, si no, las iniciales sobre un tono de marca estable por nombre:
las fotos pueden llegar de una en una.

Segunda revisión (29/09/2026): **enlace por persona** (`/conducere#<id>` abre
su ficha; abrir/cerrar la ficha pone/quita el ancla con `replaceState`; la
ficha trae «copiar enlace»); la ficha lista **sólo dónde sirve** (los cargos
de gobierno ya van en sus etiquetas, antes se repetían en plural); cada
tarjeta de conducerea dice cuántas slujiri tiene; la búsqueda resalta a las
personas que coinciden, anuncia el resultado (`aria-live`) y se recalcula al
cambiar de idioma; contador de departamentos por área.

**Revisión del 05/10/2026 — índice + perfiles propios** (estado vigente).
Cada persona tiene **su página** `/conducere/<id>` (`features/leadership/person-profile/`,
chunk propio, `noindex` mientras el texto sea de maqueta).

*Diseño* (decisión firme del usuario: «simple y profesional, digno de una app
escalable»; **sin dorados, brillos, tramas ni degradados**; compacto y
aprovechando el espacio para imágenes y textos):

- Superficies blancas con filete gris; **navy como único acento**. Fotos **a
  sangre** (la imagen llena su hueco de la tarjeta; `lead-photo-fill`).
- Jerarquía por tamaño y posición: **pastor** en la tarjeta principal, navy
  liso y foto mayor; **pastor asistente** al lado en claro; el resto de la
  conducerea en tarjetas con foto cuadrada (en móvil, filas con la foto a la
  izquierda). Comité con las mismas tarjetas en pequeño (`tiles--compact`,
  `auto-fit`: los nueve llenan el ancho; en móvil 3 × 3). Directorio con dos
  vistas (departamentos / personas). Por departamentos: tantas columnas como
  quepan (1–5, medidas con `ResizeObserver`) y áreas repartidas por alto
  estimado (`packColumns` + `areaWeight`, LPT) — las `columns:` de CSS llenan
  en orden y dejaban una columna mucho más baja.
- Perfil: cabecera con la foto a sangre (móvil: arriba a todo el ancho, 16:10);
  el del pastor en navy liso. Relato (biografía, versículo en Playfair,
  explicaciones) + columna con dónde sirve y con quién; anterior / siguiente.
- Avatar sin foto = silueta gris sobre gris claro (`person-avatar`, sin
  tamaño propio: lo pone el contenedor con `--avatar-size` o al 100 %).
- Estilos comunes en `features/leadership/_leadership-shared.scss`.

*Arquitectura*:

- `leadership.view.ts`: **modelos de vista constantes** (tarjetas de persona,
  directorio resuelto, cifras, `normalize`, `highlight`). Las plantillas sólo
  leen campos; nada de llamadas a funciones por tarjeta.
- **Estado del directorio en la URL** (`?vista=persoane&q=…`), escrito con
  `Location.replaceState` (sin navegar ni mover el scroll): se comparte una
  búsqueda y «atrás» desde un perfil la conserva. Índice de búsqueda por
  idioma (`computed`). Atajo `/` para buscar; coincidencias resaltadas
  conservando diacríticos (`HighlightPipe`, puro).
- **Guardas perezosas** (`leadership.guards.ts`, cargadas con `import()` desde
  `app.routes.ts` para no inflar el bundle inicial): id inexistente → índice;
  `/conducere#<id>` antiguo → perfil. Ambas con `replaceUrl`.
- **Migas de pan con el nombre**: `BreadcrumbTailService` (core/navigation);
  una página de detalle pone su nombre y la migaja lo añade como último eslabón.
  Pestaña y metadatos: `SeoService.setOverride`.
- En el perfil, cada departamento enlaza al directorio filtrado (`?q=`).
- Biografías: `core/leadership-stories.config.ts` → `PERSON_STORIES`
  (`summary`, `bio[]`, `sections[]`, `verse`, `since`); sin entrada, texto de
  maqueta por nivel mientras `PLACEHOLDER_STORIES` sea `true`.

| Quiero…                        | Hago                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| Poner la biografía de alguien  | Entrada en `PERSON_STORIES` (`leadership-stories.config.ts`)               |
| Quitar todos los textos de prueba | `PLACEHOLDER_STORIES = false` (y quitar `noindex` de la ruta `conducere/:id`) |
| Migas con el nombre en otra página de detalle | `BreadcrumbTailService.set(nombre)` y `set(null)` al destruirse |

`Assignment.roles` es una lista: alguien puede ser responsable **y** director
del mismo departamento sin aparecer dos veces en la tarjeta. Y un cargo de
gobierno puede declarar `impliedTitle` para no repetir «Cenzor» debajo de un
nombre en la tarjeta que ya se titula «Cenzori».

> `church.config.ts → ministries` es **otra cosa**: los 8 bloques de «dónde
> puedes servir» de la portada, en clave de invitación. No los borres pensando
> que duplican el organigrama.

## Recetas

### Añadir un evento futuro (Evenimente viitoare)

```ts
// core/church.config.ts → upcomingEvents
{
  id: 'botez_2026_09_13',
  date: '2026-09-13',        // ISO, se parsea en hora local
  time: '10:00',
  title: 'Botez',
  description: '…',
  verse: '…',                // opcional
  preacher: '…',             // opcional
  worshipLead: '…',          // opcional
}
```

No hace falta borrar los pasados: `ScheduleService` los filtra solos. Cuando la
lista queda vacía, el bloque desaparece de la proyección automáticamente
(ver `docs/ai/30-presentation.md`).

### Actualizar el plan de lectura bíblica (Citirea Bibliei)

El plan vive en `src/app/core/bible-reading.config.ts` y **se genera** desde el
Excel de la iglesia (`PROGRAMARE_CITIREA_BIBLIEI.xlsx`, una hoja por mes):

```bash
python scripts/import-bible-plan.py "ruta/PROGRAMARE_CITIREA_BIBLIEI.xlsx"
```

- No edites el `.ts` a mano: la próxima importación lo sobrescribe entero.
- El script espera la estructura del Excel actual (A1 año, A2 mes, fila 3 de
  cabeceras y, por semana, 7 filas con el número en la primera y el resumen del
  tramo en la tercera). Si falta el resumen, lo deriva de las lecturas diarias.
- Qué semana se proyecta lo decide `BibleReadingService` (la que contiene
  *mañana*); cuando el plan termina el bloque se autoexcluye. Detalle en
  `docs/ai/30-presentation.md`.
- Cuando llegue el Excel del año siguiente, basta con importarlo: los meses
  se ordenan por fecha y las semanas siguen la numeración del Excel.

### Añadir un anuncio (anunț)

Objeto `Announcement` en `church.config.ts → announcements`, con `expiresOn`
obligatorio. Es contenido estructurado (secciones en columnas) y se proyecta
como diapositiva propia mientras esté vigente. **Protocolo de redacción,
límites y ficheros: `docs/ai/35-announcements.md`** (léelo antes).

### Añadir una red social

1. Nuevo `SocialLink` en `socials` con `i18nKey` único.
2. `socials.items.<i18nKey>.name` y `.subtitle` en **es.json y ro.json**.
3. Si el icono no existe, añádelo a `shared/social-icon/social-icon.component.ts`
   (SVG inline, sin peticiones externas) y al tipo `SocialIcon`.

### Añadir un evento a la galería

1. Deja los originales en `src/assets/drive-media/`.
2. `node scripts/optimize-images.js` → genera `<nombre>.webp` (1600px) y
   `<nombre>-thumb.webp` (480px).
3. Nuevo `MediaEvent` en `mediaEvents` apuntando a esos ficheros.
4. `gallery.events.<i18nKey>.name` y `.date` en ambos idiomas.

### Cambiar el programa semanal

Edita `weeklyProgram`. `day` usa la convención de `Date.getDay()`
(0 = domingo). `ScheduleService` rota la lista para que hoy salga primero.

### Editar o añadir un artículo de la confesión de fe

La confesión (`features/credo/`) separa **estructura** de **texto**:

1. `credo.data.ts` sólo declara las 4 partes y los ids/números de artículo.
   Para añadir uno, súmalo a la parte que corresponda y renumera si hace falta.
2. El titular, el cuerpo y las referencias bíblicas viven en
   `src/assets/i18n/credo-articles.{ro,es}.json`, bajo `credo.articles.<id>`.
   Ese fichero **no está en el bundle inicial**: se descarga como chunk propio.
3. Los rótulos de las partes, el índice y el cierre sí están en `ro.json`/
   `es.json` bajo `credo.*`, porque la página «Quiénes somos» los reutiliza en
   su avance.
4. `npm run i18n:check` valida que ro y es siguen teniendo las mismas claves.

### Textos largos de una sola página

Si un bloque de texto supera ~5 kB y sólo lo usa una ruta, no se mete en
`es.json`/`ro.json`: se crea un paquete `src/assets/i18n/<pack>.{es,ro}.json`
y se carga desde un `ResolveFn` con `TranslationPackService.load()`, que hace
el `import()` dinámico y lo fusiona en el diccionario del idioma activo (y lo
vuelve a fusionar al cambiar de idioma). Referencia:
`features/credo/credo-translations.resolver.ts`.

## Reglas de i18n

- Idioma por defecto: **`ro`**. Soportados: `ro`, `es`.
- Toda clave debe existir en **ambos** ficheros, con la misma estructura.
- En plantillas, siempre `{{ 'clave' | translate }}` o
  `[attr.aria-label]="'clave' | translate"`. Nunca texto literal.
- Interpolación: `{{ 'socials.open_aria' | translate: { name: x } }}`.
- Claves raíz actuales: `app`, `brand`, `verse`, `socials`, `qr`, `streams`,
  `presentation`, `carousel`, `blocks`, `credo`, `gallery`, `calendar`, `weekly`,
  `upcoming`, `announcements`, `bible`, `location`, `lang`, `share`, `footer`,
  `common`, `contact`, `donate`, `nav`, `seo`, `home`, `about`, `leadership`.
- `verse.text/reference` es el versículo de la **portada**;
  `verse.stage_text/stage_reference`, el del **panel proyectado**.
- Las traducciones van **empaquetadas, un chunk por idioma**
  (`core/i18n/inline-translate-loader.ts`: `import()` dinámico del JSON): al
  arrancar sólo se descarga el idioma activo, el otro sólo si se cambia, y una
  vez cargado no se vuelve a pedir. Si añades un idioma hay que registrarlo ahí
  (`LOADERS`) y en `LanguageService.supported`.
- **No hay i18n por módulo** para el núcleo (500 claves ≈ 8 kB comprimidos por
  idioma: partirlo costaría una petición por módulo y no ahorraría nada
  apreciable). Lo que sí se separa son los **textos largos de una página**
  (`TranslationPackService`, p. ej. los 30 artículos del credo): se cargan al
  entrar en la ruta, se fusionan una sola vez por idioma y no se recargan.
- Rótulos de bloque para la proyección: si el título web es largo, clave
  `*.title_pj` corta (una línea a 6,2u); el bloque elige con `fullscreen()`.
- «Elim» y «Arganda del Rey» no son claves i18n: son constantes de marca del
  componente `app-brand-logo` (`brand.name` sigue siendo traducible).

## El texto público sale de la confesión

La iglesia tiene un documento adoptado —la *Mărturisirea de credință* del Culto
Cristiano Pentecostal, 30 artículos— y el sitio lo publica entero. Por tanto
**ninguna descripción de lo que creemos o hacemos se redacta de cero**: se
resume un artículo y, cuando es un bloque, se cita con enlace
(`citarArticulo()` en `credo.data.ts` da el número y el ancla).

Lo que está anclado hoy, por si hay que revisarlo cuando cambie el documento:

| Texto | Artículo |
| --- | --- |
| `about.pillars.*` (las cinco obras) | 16 · la Iglesia, + 9, 11, 29, 19 en cada cuerpo |
| `about.visit.note` | 19 (Cena) y 25 (el domingo) |
| `home.welcome.body` | 16 · las cinco obras, en lenguaje llano |
| `home.ministries.subtitle` | 13 · dones «para el bien común… no para provecho propio» |
| `donate.lead` | 25 · la generosidad, el diezmo y las ofrendas voluntarias |
| `leadership.priesthood.body` | 17 · sacerdocio universal; pastor, anciano y diácono |
| `leadership.structure.subtitle` | 17 · oficios reconocidos, se accede por ordenación |

Al traducir, el **vocabulario del documento manda**: si la confesión dice
`prezbiter`, el texto de la web no dice `bătrân`.

## Claves huérfanas: cómo se barren

`npm run i18n:check` comprueba **paridad** entre idiomas, no uso: una clave que
ya no pinta nadie pasa el control y se sigue traduciendo y descargando. Cuando
se rediseña una pantalla hay que barrer a mano.

El barrido no es un `grep` por clave: la mitad se construyen en marcha
(`'credo.articles.' + id + '.title'`, `` `home.hero.slides.${id}` ``). Una
clave está **usada** si su ruta completa aparece en el código **o si algún
literal es un prefijo suyo terminado en punto**. Con ese criterio, de 658 hojas
salieron 153 candidatas y sólo 23 eran huérfanas de verdad; el resto eran
claves dinámicas.

Borradas en el barrido del rediseño (portada, galería, conducere): el bloque
`home.today.*` completo, `leadership.ministries_section.*`,
`leadership.eyebrow`, `leadership.lead`, `gallery.featured_event`,
`gallery.open_drive` y los `*.subtitle` de `gallery`, `streams`, `upcoming`,
`weekly`, `home.quick` y `home.visit`.
