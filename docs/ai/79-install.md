# 79 · Instalar la app: hoja del navegador, láminas e invitación

Auditoría e implementación del 24/11/2026. Cómo se ofrece instalar la web como
app en cada dispositivo y de dónde salen las láminas de promoción.

## Qué pasa en cada dispositivo

| Dispositivo / navegador | Qué ve quien pulsa «Instalează» |
| --- | --- |
| **Android · Chrome, Edge, Opera…** | La **hoja del navegador** (nativa): icono, nombre, dominio, descripción y láminas del manifiesto, con su botón «Instalar» |
| **Windows, macOS, Linux, ChromeOS · Chrome, Edge** | Su diálogo, con las láminas horizontales |
| **Android · Samsung Internet** | El aviso nativo si lo dispara (no siempre desde la 27); si no, nuestra hoja con sus pasos y «O instálala desde Chrome» |
| **Android · Firefox** | Nuestra hoja: pasos y «O instálala desde Chrome» |
| **Android · Xiaomi, Huawei, UC, DuckDuckGo…** | Nuestra hoja: no instalan apps web → «Abrir en Chrome» |
| **iPhone · Safari** | Nuestra hoja; iOS ≥ 26: ⋯ → Compartir → Añadir → dejar «Abrir como app web» |
| **iPad · Safari** | Nuestra hoja: Compartir está arriba, también en iPadOS 26 |
| **iPhone / iPad · Chrome, Firefox, Edge, Opera** | Nuestra hoja, con su botón de compartir |
| **Dentro de Instagram, Facebook, WhatsApp…** | Nuestra hoja: ahí no se puede → salir al navegador (Android: botón a Chrome; iOS: pasos + copiar enlace) |
| **macOS · Safari ≥ 17** | Nuestra hoja: Archivo → Añadir al Dock |
| **Windows · Firefox ≥ 143** | Nuestra hoja: icono «Añadir a la barra de tareas» |
| **Firefox de macOS / Linux** | Nada: no instala |
| **Ya instalada** | Nada (dentro de la app, nunca; en el navegador, Chromium lo dice con `getInstalledRelatedApps`) |

**Safari de iOS no tiene diálogo de instalación ni API para lanzarlo**: las
láminas del manifiesto allí no existen. Por eso las enseña nuestra hoja.

## Las dos mitades

1. **La hoja del navegador no es código nuestro**: Chromium la pinta con
   `description` + `screenshots` del manifiesto (Chrome 94 en Android, 108 en
   escritorio). Nuestro trabajo es darle buen material.
2. **Nuestra hoja** (`shared/install-app/install-sheet`): la misma estructura
   —icono, nombre, dominio, frase, láminas— donde no hay diálogo nativo, con
   los pasos delante.

## Piezas

```
scripts/lib/install-media.mjs        ⭐ Datos: textos de las láminas, manifiesto, límites de Chrome
scripts/generate-install-media.mjs   Dibuja las láminas (HTML + Chrome + sharp) y escribe los manifiestos
scripts/install-media.test.mjs       Guarda (npm run check)
scripts/assets-src/install-media.lock.json  Huella de lo pintado (textos y horario)
src/manifest.webmanifest             Rumano (GENERADO)      src/manifest.es.webmanifest  Español (GENERADO)
src/assets/pwa/install/{ro,es}/      Láminas (GENERADAS): .jpg 1080×1920, -wide.jpg 1920×1080, -thumb.webp
core/install/
  manifest-link.ts                   Enlaza el manifiesto del idioma activo (lo llama LanguageService)
  install-steps.ts                   Pasos por navegador (puro) · cuándo ofrecer Chrome · intent
  invite-policy.ts                   Cuándo invitar (puro)
  install-invite.service.ts          La invitación: rutas, scroll y memoria
core/services/pwa-install.service.ts ¿Tiene sentido ofrecerlo? Aviso nativo y «ya la tengo»
core/util/install-platform.ts        Qué navegador es (puro)
shared/install-app/
  install-launcher.service.ts        ⭐ El único camino para instalar: nativo o nuestra hoja
  install-sheet.component.*          Nuestra hoja (<dialog>), diferida con sus textos
  install-app.component.*            Botón del pie
layout/install-invite/               La invitación (teléfono y tableta), diferida
assets/i18n/install.{ro,es}.json     Paquete `install` (en el principal sólo quedan `cta` y `cta_long`)
```

Quien quiera ofrecer instalar **llama a `InstallLauncher.start()`**, nunca a
`PwaInstallService.install()` a pelo: se perdería la guía. Lo usan el pie, la
última fila del menú del teléfono, la invitación, la tarjeta de Împreună y la
del aviso de las 08:00 (en iPhone instalar es requisito).

## Láminas

`npm run pwa:install` (necesita Chrome o Edge; ~13 s). `-- --manifests` escribe
sólo los manifiestos. Cinco verticales (inicio · programa · anuncios · lectura ·
directo) y tres horizontales.

- **Se cambian los textos en `scripts/lib/install-media.mjs`** y se regenera. Si
  el horario del culto cambia, el test lo exige (la lámina del programa lo pinta).
- **Límites de Chrome** (documentación + `installable_data_fetcher.cc`; lo que
  no cumple se descarta **sin avisar**): 320–3840 px, proporción ≤ 2,3, la misma
  en todas las de un formato, ≤ 8 en total (el recuento mezcla `narrow` y
  `wide`: las verticales, delante), **JPEG o PNG** —las capturas que había eran
  WebP—, descripción ≤ 324 caracteres. Peso propio: ≤ 190 kB por lámina.
- **Medida de la referencia**: 9:16, se ven a ~165 px de ancho → titular de
  114 px sobre 1080 (≈ 17 px en pantalla), dos o tres líneas.
- **Fotos**: las que ya publica la web, de espaldas, de lejos o de adultos en el
  púlpito. Nada de primeros planos de menores ni nombres. Sin fechas: no caducan.
- **Nada prometido de más**: la lámina de la lectura dice que el aviso lo
  activa cada uno. Los textos no dicen «teléfono»: también salen en tableta y
  escritorio.
- Marca: wordmark con las proporciones de `app-brand-logo`; el emblema sólo
  dentro del icono de la app.

## Un manifiesto por idioma

Los dos describen **la misma app**: `id`, nombre, iconos, `start_url` y `scope`
iguales (lo vigila el test; con otro nombre, Android pediría aprobar un cambio
de la app instalada). Cambian descripción, atajos y láminas.

- `index.html` elige el enlace antes de arrancar (idioma guardado o `?lang=`);
  `syncManifestLink` lo mantiene al cambiar de idioma. Medido en Chrome: cada
  idioma descarga sólo el suyo, y al cambiar el navegador vuelve a disparar
  `beforeinstallprompt` con el nuevo.
- Al aceptar la instalación se guarda el idioma que se estaba viendo.
- **Descartado**: `*_localized` (Chrome 148): va por el idioma del **sistema**,
  no por el de la web (que es rumano por defecto), y no traduce `screenshots`.
- `related_applications` lista los dos manifiestos (la app puede haberse
  instalado desde cualquiera).
- **iOS**: la app instalada no comparte almacenamiento con Safari, así que se
  abre en rumano la primera vez aunque se instale desde el español.

## Invitación (teléfono y tableta)

Tarjeta baja, no modal: no roba el foco ni bloquea. Se cierra con la cruz o
`Esc`. Reglas (`invite-policy.ts`):

- Quien **vuelve otro día**, a los 12 s; en la primera visita, sólo tras 45 s
  **y** 3 páginas. Una vez al día.
- Sólo tras bajar 0,6 pantallas (**nunca tapa la portada**) y si el pie, con su
  botón, no está a la vista.
- «Ahora no» (o cancelar el diálogo del navegador): 30 días → 90 → un año.
  Cuatro veces sin tocarla cuenta como «ahora no».
- Nunca en: escritorio, navegadores integrados, app instalada, presentación,
  herramientas del operador, `/invitati`, `/doneaza`, `/contact`, `/legal`, ni con un
  diálogo, el menú o un campo en uso.
- El dock flotante se aparta (`--dock-offset`), y la tarjeta cede el sitio al
  índice de documento (`has-doc-panel`).

Memoria: `iglesia-redes.install.invite` (primer día, último mostrado, rechazos)
y `elim.pwa.installedAt` (30 días). Declaradas en `/legal`.

## Service worker

Los dos manifiestos se precachean (3 kB); **las láminas no**
(`!/assets/pwa/install/**`): sin red no se instala.

## Eventos (GoatCounter, sin datos)

`instalare-invitatie` · `instalare-invitatie-inchisa` · `instalare-pasi` (nuestra
hoja) · `instalare-refuzata` (diálogo nativo cancelado) · `app-instalata`.

## Comparación (por qué así)

| Alternativa | Veredicto |
| --- | --- |
| Sólo mejorar el manifiesto | Da la hoja de la captura en Android, pero **nada en iPhone** |
| Sólo hoja propia en todas partes | Un toque de más en Android y peor que la nativa |
| **Nativa donde existe + hoja propia donde no** | **Elegida**: un toque en Chromium, guía exacta en el resto |
| `<install>` / `navigator.install()` | Prueba de origen (Chrome / Edge 148–153, «Intent to Ship» en 09/2026). No añade nada a `beforeinstallprompt` para instalarse a sí misma: revisar cuando sea estable |
| Invitación modal al entrar | Google penaliza los intersticiales y molesta: descartada |
| Recompensa por instalar (como la referencia) | No hay nada que regalar: no se promete |

## Sin probar en un aparato real

La hoja nativa de Android y los rótulos de los menús (iOS, Samsung, Firefox) se
han comprobado con emulación, documentación y manuales, **no en un teléfono**.
Al publicar: un Android con Chrome, un Samsung y un iPhone.
Progressier avisó (03/2026) de que Play Protect marcaba como inseguras apps
instaladas desde Samsung Internet; de ahí la salida a Chrome en esa hoja.
