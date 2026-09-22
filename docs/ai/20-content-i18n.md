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

> ⚠️ `contact` y `donations` llevan hoy **datos de demostración** (correo
> `@example.org`, IBAN de ceros). Están marcados con `TODO(iglesia)` y la
> página de donativos muestra un aviso visible (`donate.demo.*`) mientras sigan
> así. Al poner los reales, borra también ese aviso de
> `donate.component.html` y sus claves de los dos JSON.

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
