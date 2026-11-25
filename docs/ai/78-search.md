# 78 · Buscador de la web

> Lee este shard antes de tocar el buscador de la cabecera o de hacer que un
> módulo se encuentre. Hecho el 24/11/2026.

## Qué es

Botón en la cabecera (todos los anchos) que abre un diálogo: al escribir salen
enlaces a lo que hay **dentro** de la web, agrupados por tipo. Atajos: `Ctrl/⌘ +
K` y `/`. Sin backend y sin terceros: **lo que se escribe no sale del
dispositivo** (tampoco a la analítica; `telemetry` manda la ruta sin `?q=`).

| Pieza | Fichero |
| --- | --- |
| Contrato (entrada, proveedor, tipos, token) | `core/search/search.model.ts` |
| Texto: plegado, raíz, erratas, resaltado, extracto | `core/search/search-text.ts` |
| Motor: índice invertido, puntuación, grupos | `core/search/search-engine.ts` |
| Páginas, sacadas del mapa de rutas | `core/search/page-entries.ts` |
| Reúne proveedores, índice por idioma y día | `core/search/search.service.ts` |
| Recientes (`localStorage`, se borran desde el diálogo) | `core/search/recent-searches.ts` |
| Botón (eager) y atajos | `layout/search/search-button.component.*` |
| Apertura perezosa, teclado de iOS, foco de vuelta | `layout/search/search-launcher.service.ts` |
| Diálogo | `layout/search/search-dialog.component.*` |
| Proveedor de cada módulo | `features/<x>/<x>.search.ts` |
| Rótulos y sinónimos | `assets/i18n/search.{ro,es}.json` (paquete, no arranque) |

## Receta: que un módulo se encuentre

**Su página ya sale sola** (la da el mapa de rutas: título del menú o SEO).
`new-module.mjs` no necesita nada. Opcional:

1. **Sinónimos**: `search.keywords.<ruta con _ en vez de />` en
   `search.ro.json` y `search.es.json` (`media_galerie`). Cada fichero, en su
   idioma: el buscador lee siempre los dos.
2. **Lo de dentro** (cada predicación, cada curso…): `features/<x>/<x>.search.ts`

   ```ts
   export const SERMONS_SEARCH: SearchProvider = async (ctx) => {
     const sermons = inject(SermonsService).published(); // inject() ANTES del primer await
     await ctx.pack('sermons', routePackLoader('sermons')); // sólo si usa un paquete de textos
     return sermons.map((s): SearchEntry => ({
       id: s.id,
       kind: 'media',
       title: s.title,
       altTitle: ctx.alt(`sermons.${s.id}.title`), // el título en el otro idioma
       context: s.preacher,                        // segunda línea, también se busca
       path: `/${APP_PATHS.sermons}/${s.id}`,      // nunca un literal
       icon: 'play',
       body: s.summary,                            // se busca y se enseña el trozo
       boost: 0.9,
     }));
   };
   ```

   y en sus rutas, **una línea**:
   `search: () => import('./sermons.search').then((m) => m.SERMONS_SEARCH)`.
3. Un grupo nuevo: valor en `SEARCH_KINDS` + `search.kinds.<kind>`.

Reglas: la **vigencia** la da el servicio (`active()`, `upcomingEvents()`…), no
se filtra por fecha en el proveedor; sólo destinos internos; un `fragment` tiene
que existir al llegar (si está dentro de un `@defer`, ancla al bloque); si la
página lee `queryParams` sólo al crearse, hay que escuchar los cambios (el
router reutiliza el componente: `leadership`, `talent-contest`).

Guardas: `app.search.spec.ts` monta el buscador **real** en los dos idiomas (ids
únicos, sin claves sin traducir, rutas que existen, vigencias, privacidad);
`scripts/modules.test.mjs` comprueba que un `<x>.search.ts` está en sus rutas.

## Privacidad (no negociable)

`noindex` es para los buscadores de fuera; una página del menú se encuentra
desde dentro. Lo que **no** se indexa son las personas:

| Contenido | Qué se encuentra | Qué no |
| --- | --- | --- |
| Botezuri | La página y cada botez por fecha (y quién predicó) | **Candidatos**: ni nombre, ni padres, ni testimonio. Edad y procedencia, **nunca** |
| Rugăciune pentru familii | La página | Familias, hijos, motivos |
| Cauze de rugăciune | La página y las causas por intención | Nombres y la causa «Vindecare» (salud, RGPD art. 9) |
| Anunțuri | Los vigentes: título, texto, programa | Listas de personas (`kind: 'people'`) |
| Talantul | Fases, categorías, materiales | Personas de contacto y teléfonos |
| Conducere | Personas y departamentos (página pública e indexable) | — |

Por qué ningún candidato y no «sólo los adultos»: que unos salgan y otros no
revela la edad. Cambiarlo es decisión de la iglesia, no técnica.

## Por qué así (comparación)

| Opción | Tamaño (min+gz aprox.) | A favor | Por qué no |
| --- | --- | --- | --- |
| **Índice propio en cliente** ✔ | 2-3 kB el motor | Datos vivos (caducan solos), dos idiomas, raíces ro/es, peso por tipo, sin dependencias | Hay que mantenerlo (~200 líneas con tests) |
| MiniSearch 7 | ~6 kB | Prefijo, erratas, campos, BM25 | Con 650 entradas no compensa; diacríticos, raíces, resaltado y extracto se escriben igual |
| FlexSearch 0.8 | ~11 kB | Muy rápido con cientos de miles | Sobredimensionado; su API de documentos es compleja |
| Fuse.js 7 | ~9 kB | Sencillo | Difuso por caracteres: ruido y sin palabras; lineal |
| Pagefind | ~30 kB + índice WASM por trozos | Índice del HTML en el build | Estático: enseña lo que caducó tras el despliegue, indexa los nombres del HTML, no entra en `ng serve` ni en el prerender actual |
| Algolia / Google CSE | — | Potentes | Terceros: las consultas salen (descartado) |

Umbral para revisarlo: decenas de miles de entradas (p. ej. transcripciones).
Se cambia sólo `SearchIndex`; el contrato de los módulos no se mueve.

Interfaz: patrón **combobox + listbox** de WAI-ARIA APG con selección automática
(foco siempre en el campo, `aria-activedescendant`, la opción se desplaza a la
vista a mano) dentro de un `<dialog>` modal nativo (inerte, `Esc`, «atrás» de
Android). Opciones = enlaces reales (`<a role="option">`): Ctrl + clic funciona.
4 por grupo y «Ver todos» (Baymard: 4-8 en móvil, ≤ 10 en escritorio). Resaltado
con subrayado dorado, sin fondos que compitan con la opción elegida.

## Cómo puntúa

Por palabra: exacta 1 · prefijo 0,8 · misma raíz 0,7 · dentro de palabra 0,35
(≥ 4 letras) · errata 0,45 (sólo si no hay otra; 1 desde 5 letras, 2 desde 8,
misma inicial). Por campo: título 10 · título en el otro idioma 9 · sinónimos 6 ·
contexto 3 · texto 1. Más rara = más peso. Extra si el título **es** lo escrito
(o su misma raíz), empieza por ello o lo contiene. Por `boost` de la entrada.
Tienen que estar todas las palabras; si no, al menos la mitad y se avisa.

## Cabecera (medido el 24/11/2026, RO y ES, 30 anchos de 320 a 1920)

Holgura = de la marca (o del último enlace) a la primera acción.

| Ancho | Buscador | Idioma | Directo | Holgura mínima |
| --- | --- | --- | --- | --- |
| 320–359 | Icono 44 | En el cajón | Una palabra | 43 px (320 ES) |
| 360–429 | Icono 44 | Código | Una palabra | 41 px (360 ES) |
| 430–719 | Icono 44 | Código | Entero | 89 px (430 ES) |
| 720–1023 | Icono + rótulo | Nombre | Entero | 232 px |
| 1024–1439 | Icono 36 | Código | Entero | 73 px (1024 ES), 77 (1280 ES) |
| 1440–1519 | Icono + rótulo | Nombre | Entero | 110 px |
| ≥ 1520 | + `Ctrl K` (ratón) | Nombre | Entero | 125 px |

Con el icono «Instalar» (teléfono y tableta sin la app) las holguras son otras:
`79-install.md` → «Icono de la cabecera».

El alto de la barra no cambia en ningún ancho. Orden y criterio:
`15-navigation.md` → «Reglas del menú».

## Coste

Arranque: botón y lanzador. El resto —diálogo, motor, proveedores, el otro
idioma y los paquetes de textos— se pide al apuntar, enfocar o abrir; son chunks
del build, así que el service worker los tiene precacheados y funciona sin red.
Medido en producción (24/11/2026): 89 kB gzip al abrirlo por primera vez, con las
páginas ya precargadas; 147 ms hasta ver la lista en local; nada en el arranque
salvo el botón (inicial 493 kB, tope 620). 652 entradas; ~3 ms por consulta en desarrollo.

## Trampas

- El diálogo **corta la propagación** de las teclas: en `/media` la `F` proyecta.
- Los atajos van en `window`; los de una página (`/` en Conducere y Credo), en
  `document` con `preventDefault`: mandan ellos.
- iOS sólo saca el teclado si el foco entra durante el toque: `holdKeyboard()`.
- `100dvh` no descuenta el teclado de iOS: el panel usa `visualViewport`.
- Los rótulos del diálogo están en el paquete `search`; el lanzador lo espera
  antes de montar. En el diccionario principal sólo `nav.search` y `nav.search_open`.
- Las emisiones de YouTube sólo salen si la visita ya las ha cargado: el
  buscador no pide nada a la red.
