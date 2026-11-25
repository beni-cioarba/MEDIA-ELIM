# 79 · Instalar la app: detector, avisos, hoja del navegador y láminas

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
  install-state.ts                   ⭐ Detector (puro): ¿la tiene? · nombre del evento del censo
  install-census.service.ts          Censo anónimo: un evento por carga
  invite-policy.ts                   ⭐ Calendario de avisos (puro)
  invite-topic.ts                    Qué dice el recordatorio en cada página (puro)
  install-invite.service.ts          Los avisos: rutas, momento y memoria
core/services/pwa-install.service.ts Señales del navegador, `state`, `available`, instalar y «ya la tengo»
core/util/install-platform.ts        Qué navegador es (puro)
shared/install-app/
  install-launcher.service.ts        ⭐ El único camino para instalar: nativo o nuestra hoja
  install-sheet.component.*          Nuestra hoja (<dialog>), diferida con sus textos
  install-app.component.*            Botón del pie
layout/install-invite/               El aviso y el icono de la cabecera (teléfono y tableta), diferidos
assets/i18n/install.{ro,es}.json     Paquete `install` (en el principal sólo quedan `cta` y `cta_long`)
```

Quien quiera ofrecer instalar **llama a `InstallLauncher.start()`**, nunca a
`PwaInstallService.install()` a pelo: se perdería la guía. Lo usan el pie, la
última fila del menú del teléfono, el aviso, el icono de la cabecera, la tarjeta de Împreună y la
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

## Detector: quién la tiene y quién no

Ningún navegador lo contesta siempre. `resolveInstallState` junta lo que cada
uno da y responde `app` · `installed` · `absent` · `unknown`:

| Señal | Dónde | Vale |
| --- | --- | --- |
| `display-mode: standalone` / `navigator.standalone` | Todos | Seguro: está dentro de la app |
| `appinstalled`, diálogo aceptado | Chromium | Seguro, en esa carga |
| `beforeinstallprompt` | Chromium | No instalada; borra una marca vieja (la desinstaló). Chrome exige antes un toque y ~30 s en la web: en la primera visita llega tarde |
| `getInstalledRelatedApps` | Chrome Android ≥ 84, escritorio ≥ 140 | Instalada / no, desde el navegador. Se repite al volver a la pestaña |
| Marca `elim.pwa.installedAt` (180 días, se renueva al abrir como app) | Chromium: la app y la pestaña **comparten** almacenamiento | Instalada |
| «Ya la tengo» (la misma marca) | Donde no hay otra cosa | Lo que diga la persona |

| Situación | Se sabe |
| --- | --- |
| Android con Chrome / Edge | Sí, dentro y fuera |
| iPhone / iPad, dentro de la app | Sí |
| iPhone / iPad, en Safari u otro navegador | **No hay manera**: almacenamiento aislado y sin API. Sólo lo que diga la persona |
| Samsung Internet, Firefox | Dentro sí; fuera, sólo si se instaló desde ese navegador |
| Instalada con Chrome y vista con otro navegador, o en otro teléfono | No |

**Quiénes, no; cuántos, sí.** Sin cuentas no se puede saber qué persona la
tiene, y con un identificador haría falta consentimiento. El censo es anónimo.

Fallos que tenía la detección, corregidos el 24/11/2026:
- Contaba como app el referente `android-app://` (la pista de las TWA, que aquí
  no hay): quien llegara desde otra app de Android podía no ver «Instalar».
- Contaba como app `display-mode: fullscreen`: lo cumple una pestaña con F11.
- «Ya la tengo» sumaba en `app-instalata`, y aceptar el diálogo sumaba dos veces.
- La marca caducaba al mes: en iPhone se volvía a pedir a quien ya la tenía.

## Censo (GoatCounter)

`mod-<modo>-<sistema>`, uno por carga, a los 4 s. Sistemas: `android` · `iphone` ·
`ipad` · `calculator`.

| Modo | Es |
| --- | --- |
| `din-aplicatie` | Ha entrado desde la app |
| `browser-o-are` | En el navegador, y la tiene |
| `browser-nu-o-are` | En el navegador, y no la tiene |
| `browser-nu-se-stie` | El navegador no lo dice (iPhone, Firefox, Samsung) |
| `browser-integrat` | Dentro de Instagram, Facebook… |

**Cómo se lee**: en el panel, filtrar por `mod-`. Uso de la app en Android =
`din-aplicatie` / suma de los `mod-…-android`. En iPhone, sólo `din-aplicatie`
frente al resto. Son visitas, no personas. No lee nada guardado en el
dispositivo (`censusEvent` ignora la marca): la estadística no necesita
consentimiento.

## Avisos (teléfono y tableta)

Tarjeta baja, **no modal**: no roba el foco ni bloquea. Se cierra con la cruz,
«Ahora no» o `Esc`. Tres formas:

| Aviso | A quién | Cuándo | Qué dice |
| --- | --- | --- | --- |
| **Bienvenida** | Quien no la tiene (o no se sabe), la primera vez | A los 8 s | Que existe la app, y tres cosas que se ganan |
| **Recordatorio** | Quien ha vuelto **otros días** y sigue sin ella | A los 12 s | Una frase sobre la página: lectura, directo, anuncios, programa; en las demás alternan dos. En iPhone, en la lectura, que el aviso de las 8:00 sólo existe en la app |
| **Ya la tienes** | Quien la tiene y entra por el navegador | A los 12 s, cada 60 días | Que la abra desde el icono |

| Última respuesta | Siguiente recordatorio |
| --- | --- |
| La dejó pasar | 3 · 7 · 14 · 30 · 60 días, habiendo vuelto |
| «Ahora no», cruz o diálogo cancelado | 14 · 30 · 60 · 90 días, habiendo vuelto dos días |
| Abrió los pasos | 7 días |
| «No me lo recuerdes más» (desde el tercer «no») | Un año |
| «Ya la tengo» (sólo si el navegador no lo sabe) | 180 días |

- Uno al día como mucho. Con el diálogo nativo, el botón instala en un toque;
  si Chromium lo ofrece con la hoja de pasos abierta, aparece en ella.
- **Espera** (mira cada 4 s) si hay un diálogo, el menú, el índice de documento,
  un campo con foco, un vídeo con sonido, el reproductor de YouTube tocado o la
  pestaña detrás. La portada sí se tapa en parte (decisión del 24/11/2026).
- Nunca en: escritorio, dentro de la app, presentación, herramientas del
  operador, `/invitati`, `/doneaza`, `/contact`, `/legal`, ni si el navegador
  no deja guardar (no se podría respetar un «ahora no»).
- Navegador integrado: un solo mensaje, «ábrela en tu navegador».
- El dock flotante se aparta (`--dock-offset`), y la tarjeta cede el sitio al
  índice de documento (`has-doc-panel`).
- Safari borra lo guardado tras 7 días sin volver (ITP): allí la bienvenida
  puede repetirse a quien entra muy de tarde en tarde.

Memoria: `iglesia-redes.install.invite` (días de visita, avisos y respuestas) y
`elim.pwa.installedAt`. Declaradas en `/legal`.

## Icono de la cabecera

`app-install-button` (< 1024): el acceso permanente mientras no la tenga. El
aviso informa una vez; el icono se queda y late dos veces al decir «ahora no».
Solo no bastaba: un glifo sin texto no dice qué es (web.dev propone los dos
patrones a la vez). Es la **primera** de las acciones y va diferido: aparece en
el hueco libre y no mueve a las demás.

Medido RO/ES: 360–389 → 36 × 44, holgura mínima 23 px (360 ES; la píldora del
directo cede relleno); 390–719 → 40 × 44, 33 px; 720–1023 → con rótulo, 139 px.
Por debajo de 360 no cabe: queda en el cajón. El alto de la barra no cambia.

## Dentro de la app de escritorio

Su ventana no tiene barra de navegador: las flechas atrás / adelante las pone la
cabecera. Cuándo y por qué: `15-navigation.md` → «Atrás / adelante».

## Service worker

Los dos manifiestos se precachean (3 kB); **las láminas no**
(`!/assets/pwa/install/**`): sin red no se instala.

## Eventos (GoatCounter, sin datos)

Avisos: `instalare-invitatie-prima` · `-amintire` (enseñados) ·
`instalare-ai-deja-aplicatia` · `instalare-invitatie-acceptata` (pulsó el botón) ·
`-inchisa` · `-oprita` («no me lo recuerdes más»). Instalación: `instalare-pasi`
(nuestra hoja) · `instalare-refuzata` (diálogo nativo cancelado) ·
`app-instalata` (sólo Chromium lo anuncia) · `app-declarata` («ya la tengo»).
Y el censo, `mod-…`.

## Comparación (por qué así)

| Alternativa | Veredicto |
| --- | --- |
| Sólo mejorar el manifiesto | Da la hoja de la captura en Android, pero **nada en iPhone** |
| Sólo hoja propia en todas partes | Un toque de más en Android y peor que la nativa |
| **Nativa donde existe + hoja propia donde no** | **Elegida**: un toque en Chromium, guía exacta en el resto |
| `<install>` / `navigator.install()` | Prueba de origen (Chrome / Edge 148–153, «Intent to Ship» en 09/2026). No añade nada a `beforeinstallprompt` para instalarse a sí misma: revisar cuando sea estable |
| Aviso modal al entrar | Google penaliza los intersticiales y molesta: descartado. La bienvenida es una tarjeta baja que no bloquea |
| Sólo un icono en la cabecera | Nadie sabe qué es hasta que se lo cuentan: va **con** el aviso, no en su lugar |
| Identificador por dispositivo para saber quién | Exige consentimiento y un servidor; y no diría el nombre: descartado |
| Recompensa por instalar (como la referencia) | No hay nada que regalar: no se promete |

## Sin probar en un aparato real

El detector (`getInstalledRelatedApps`, almacenamiento compartido, app de iPhone),
la hoja nativa de Android y los rótulos de los menús (iOS, Samsung, Firefox) se
han comprobado con emulación, documentación y manuales, **no en un teléfono**.
Al publicar: un Android con Chrome, un Samsung y un iPhone.
Progressier avisó (03/2026) de que Play Protect marcaba como inseguras apps
instaladas desde Samsung Internet; de ahí la salida a Chrome en esa hoja.
