# 37 · Cauzele Bisericii Elim (causas de oración)

> Lee este shard antes de **cambiar la lista de causas** o tocar su diseño.

## Qué es

La lista **vigente** de causas por las que ora la iglesia (antes, una
diapositiva de PowerPoint «LISTA BOLNAVI ACTUALA»). No es semanal ni caduca: se
edita cuando cambia y se actualiza la fecha.

| Dónde | Qué se ve |
| --- | --- |
| Web `/cauze-de-rugaciune` | Tablero completo + «Listă actualizată la …». `noindex` (nombres de enfermos) |
| Proyección, bloque `causes` | **Toda la lista en una diapositiva**, detrás de las familias |
| Menú | Program → «Cauze de rugăciune» (icono `heart`) |

## Modelo (`core/prayer-causes.config.ts`)

```ts
{
  updatedOn: '2026-09-28',            // se muestra: «Listă actualizată la…»
  causes: [
    { id: 'vindecare', title: 'Vindecare',
      people: ['Neluțu Andor', 'Mirela Bucur'] },          // por nombre
    { id: 'romania', title: 'România',
      intent: 'Pentru țara noastră' },                     // por intención
  ],
}
```

- **La forma la decide el dato**: con `people` → tarjeta «por nombre»; sin
  `people` → ficha con insignia, título e `intent`. `PrayerCausesService`
  separa `named` / `general` conservando el orden.
- Nombres: nombre de pila primero, capitalización normal y diacríticos
  (el PowerPoint los traía en mayúsculas y en órdenes mezclados).
- Títulos cortos: el rótulo ya dice «Bisericii Elim» (por eso «Fiii
  risipitori», no «Fiii risipitori ai Bisericii Elim»).

Cambiar la lista = editar el array y `updatedOn`. Nada más.

## Diseño

Un solo renderizador (`features/prayer-causes/causes-board/`, hoja global).
**Sólo tipografía** (revisión del 28/09/2026: «más profesional y serio»): sin
iconos, viñetas, contadores ni cajas. Dos zonas:

- **Por nombre** (web: blanco; proyección: navy): epígrafe en versalitas oro y los nombres en dos
  columnas limpias, cada nombre entero.
- **Por intención** (panel navy, el mismo lenguaje que las fichas de
  familias): título en oro y la intención en blanco debajo.
- Web: las dos zonas lado a lado (3 : 2), apiladas en móvil.
- Proyección (revisión del **03/10/2026**, sustituye a la del 29/09): **blanco
  y negro** a sangre (casi negro, sólo blancos y grises: nada compite con los
  nombres y no ilumina la sala). Franjas a todo el ancho: rótulo con filete,
  una franja por causa con nombres (1-3 columnas según cuántos, `--cols`) e
  intenciones en columnas iguales (`--n`) bajo un filete. `appFitToBox` hasta
  1,4 y ahora mide alto **y ancho** (cada texto `nowrap`), así nada se sale.
  Abajo 7u libres para la cuenta atrás del culto. Lo de debajo es histórico.
- (Histórico, 29/09/2026) **a sangre sobre navy entero**
  (`.stage--bleed`, como las familias) para que la pantalla no ilumine la
  sala mientras se ora; sin blancos grandes ni firma ELIM. 58 / 42 a todo el
  alto: título + nombres en blanco al 90 % | causas sobre `--c-primary-deep`
  (el cambio de tono separa, sin filetes), intención al 75 %. Todo **arranca
  arriba** en la misma línea (título y primera causa), márgenes 5u / 4,5u.
  `appFitToBox` de 0,7 a 1,2 va en la sección y mide `.causes__inner` (una
  escala para las dos zonas; nombres a `lead`, títulos de causa a `lead`,
  intención a `body`; suelo 3,2u). Ojo: no existe `--pj-sp-5`.

## Ficheros

| Fichero | Papel |
| --- | --- |
| `core/prayer-causes.config.ts` | Tipos y lista |
| `core/services/prayer-causes.service.ts` | `named`, `general`, fecha formateada |
| `features/prayer-causes/prayer-causes.component.ts` | Página `/cauze-de-rugaciune` |
| `features/prayer-causes/causes-board/` | Tablero (web + proyección) |
| `features/stage/blocks/causes-block/` | Bloque del escenario |
| `assets/i18n/{es,ro}.json → prayer_causes.*`, `nav.prayer_causes*`, `seo.prayer_causes.*` | Textos de interfaz |
