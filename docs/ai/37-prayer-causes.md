# 37 · Cauzele Bisericii Elim (causas de oración)

> Lee este shard antes de **cambiar la lista de causas** o tocar su diseño.

## Qué es

La lista **vigente** de causas por las que ora la iglesia (antes, una
diapositiva de PowerPoint «LISTA BOLNAVI ACTUALA»). No es semanal ni caduca: se
edita cuando cambia y se actualiza la fecha.

| Dónde | Qué se ve |
| --- | --- |
| Web `/cauze-de-rugaciune` | Tablero completo + «Listă actualizată la …». `noindex` (nombres de enfermos) |
| Proyección, bloque `causes` | **Toda la lista en una diapositiva**, justo detrás de los anuncios y delante de las familias (desde el 04/10/2026) |
| Menú | Program → «Cauze de rugăciune» (icono `heart`) |

## Modelo (`core/prayer-causes.config.ts`)

```ts
{
  updatedOn: '2026-11-09',            // se muestra: «Listă actualizată la…»
  causes: [
    { id: 'vindecare', title: 'Vindecare',
      people: ['Neluțu Andor', 'Mirela Bucur'] },          // por nombre
    { id: 'romania', title: 'România',
      intent: 'Pentru țara noastră' },                     // por intención
  ],
}
```

- **La forma la decide el dato**: con `people` → causa «por nombre»; sin
  `people` → fila «título | intención». `PrayerCausesService` separa `named` /
  `general` conservando el orden, y a cada causa con nombres le calcula su
  rejilla: `longest` (letras del nombre más largo → `--name-ch`, columnas de
  la web) y `columns` (1 | 2 → `--cols`, proyección: 2 para nombres sueltos
  desde 4; las parejas, de una en una). El marcado no decide medidas.
- Nombres: nombre de pila primero, capitalización normal y diacríticos
  (el PowerPoint los traía en mayúsculas y en órdenes mezclados).
- Títulos cortos: el rótulo ya dice «Bisericii Elim» (por eso «Fiii
  risipitori», no «Fiii risipitori ai Bisericii Elim»).
- Intenciones: una frase nominal, sin punto final, con mayúscula sólo al
  principio («O generație statornică în credință și în chemare, care Îl
  caută pe Dumnezeu», tineretul, 09/11/2026). Cuanto más corta, más grande
  sale todo en la proyección.

Cambiar la lista = editar el array y `updatedOn`. Nada más.

## Diseño

Un solo renderizador (`features/prayer-causes/causes-board/`, hoja global).
**Sólo tipografía** (revisión del 28/09/2026: «más profesional y serio»): sin
iconos, viñetas ni contadores. Desde el **09/11/2026** (al entrar la 5.ª causa,
«Tineretul bisericii») la web y la proyección comparten estructura:
**columna de nombres + columna lateral** con las causas por intención.

### Web (`/cauze-de-rugaciune`)

Tarjeta blanca; la lateral, en navy. Decide el ancho **de la tarjeta**
(`container: causes`), no el de la ventana:

| Tarjeta | Distribución |
| --- | --- |
| < 48rem | Apilado: nombres arriba, banda navy debajo |
| ≥ 48rem | Dos columnas 3 : 2 |
| Lateral en tabla | Banda entera ≥ 36rem, o lateral con la tarjeta ≥ 70rem; si no, título sobre intención |

- **Nombres** a `--fs-h3` (navy, 600), epígrafe en versalitas `--c-gold-deep`
  (5,4 : 1). Columnas derivadas: mínimo = `--name-ch` × 0,58em (los nombres
  de hoy miden 0,50-0,55em por letra), como mucho 3. A 375 px los enfermos
  van de dos en dos; las parejas, de una en una. Ningún nombre se parte.
- **Lateral navy**: una fila por causa con filetes; en tabla, título
  (`--c-gold-soft`, 7,3 : 1) e intención (blanco al 85 %) en dos columnas
  alineadas por `subgrid`.
- Medido con 5 causas (alto de la tarjeta, antes → ahora): 1920: 433 → 286 px;
  1440: ~430 → 281; 1024: 379; 768: 475; 375: 688 → 581. Antes la lateral
  marcaba el alto y la columna de nombres dejaba vacía casi la mitad de abajo.

### Proyección (bloque `causes`)

**Blanco y negro** a sangre (03/10/2026: casi negro, no ilumina la sala; sin
oro ni navy, la jerarquía la dan tamaño, peso y opacidad). Abajo 7u libres
para la cuenta atrás. `appFitToBox` hasta 1,4, mide alto **y ancho** (nombres
y títulos son `nowrap`).

- **Lienzo ancho (16:9, 16:10)**: rejilla `max-content | resto`. Nombres a su
  ancho justo (`--cols`) y las causas por intención en una **lateral a todo
  el alto** con filete vertical (título e intención a `body`; intención
  `text-wrap: balance`). Las causas con nombres van con `space-between`: la
  primera y la última enrasan con la lateral.
- **Lienzo alto (≤ 3:2: 3:2, 4:3, 5:4)**: las causas por intención pasan
  **debajo**, en 3 columnas bajo un filete. Con la lateral, a 4:3 se quedaba
  en 244 px (la intención del tineret en 6 líneas) y abría un hueco de un
  cuarto a un tercio del alto entre las causas con nombres.

Medido el 10/11/2026 (nombres / intención, ningún desborde):

| Lienzo | Distribución | `--fit` | Nombres | Intención |
| --- | --- | --- | --- | --- |
| 1920×1080 (16:9) | lateral | 0,891 | 77 px | 44 px |
| 1920×1200 (16:10) | lateral | 0,935 | 81 px | 46 px |
| 1280×800 (16:10) | lateral | 0,935 | 54 px | 31 px |
| 1440×960 (3:2) | debajo | 0,842 | 55 px | 31 px |
| 1024×768 (4:3) | debajo | 0,924 | 43 px | 24 px |
| 1280×1024 (5:4) | debajo | 0,990 | 57 px | 33 px |
| Monitor de `/media/control` (972×547) | lateral | 0,891 | 39 px | 22 px |

Antes, con 4 causas en una fila de columnas iguales: 71 px a 16:9; con la 5.ª
en esa fila caía sola a otra línea y todo bajaba a 0,70 (60 px). Capacidad a
16:9: 12 enfermos a 0,84; con 16 llega al mínimo (0,70). Sin causas por
intención, `.causes__inner--solo` da todo el ancho a los nombres.

Descartado (medido): las causas por intención en una fila debajo a 16:9 (no
caben: 0,70 y desborda), etiquetas colgadas a la izquierda de los nombres
(roban ancho: ~0,73) y la lateral con letra más pequeña a 4:3 (+8 % de
nombre, pero el hueco sigue).

Historia: 29/09 a sangre sobre navy, 58 / 42; 03/10 blanco y negro en franjas
a todo el ancho con las intenciones en columnas iguales (`--n`), sustituido
el 09/11 por lo de arriba.

## Ficheros

| Fichero | Papel |
| --- | --- |
| `core/prayer-causes.config.ts` | Tipos y lista |
| `core/services/prayer-causes.service.ts` | `named` (con `longest` y `columns`), `general`, fecha formateada |
| `features/prayer-causes/prayer-causes.component.ts` | Página `/cauze-de-rugaciune` |
| `features/prayer-causes/causes-board/` | Tablero (web + proyección) |
| `features/stage/blocks/causes-block/` | Bloque del escenario |
| `assets/i18n/{es,ro}.json → prayer_causes.*`, `nav.prayer_causes*`, `seo.prayer_causes.*` | Textos de interfaz |
