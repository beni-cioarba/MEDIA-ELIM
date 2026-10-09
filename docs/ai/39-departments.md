# 39 · Departamente

> Lee este shard si vas a **añadir un departamento, cambiar su contenido o
> tocar el bloque de la app de la masa de tineret** (ADM-TINERET).

## Qué hay (09/10/2026)

| Ruta                          | Componente                     | Qué es |
| ----------------------------- | ------------------------------ | ------ |
| `/departamente`               | `DepartmentsHomeComponent`     | Portada propia: cabecera con cifras, acceso rápido, mosaico de fotos, franja viva de la masa e «Implícate» |
| `/departamente/<slug>`        | `DepartmentPageComponent`      | Una plantilla para todos: portada a sangre, acceso rápido, contenido + lateral |

Slugs (`DEPARTMENT_SLUGS`, `app-paths.ts`): `tineret` · `fanfara` · `cor` ·
`misiune-externa` · `ajutorare` · `evanghelizare`. Una ruta por departamento
(`departmentRoute()` en `app.routes.ts`), no `:slug`: así cada una lleva su
título y descripción SEO; componente y chunk son el mismo.

**No usa `NavHubComponent`**: aquí cada entrada es un ministerio con cara
propia y un mosaico de fotos dice más que una lista de filas.

## Ficheros

```
core/departments.config.ts      ⭐ DEPARTMENTS (estructura) + YOUTH_MEAL_APP (la app hermana)
core/util/meal-feed.ts             Lector puro del calendario .ics de ADM-TINERET (sin nombres)
features/departments/
  _departments.scss                Mixins de la línea: tech-grid, gold-edge, cta-gold, cta-glass
  department.view.ts               Responsables derivados del organigrama
  departments-home/                Portada /departamente
  department-page/                 Página de un departamento
  dept-switcher/                   Acceso rápido (fila fija de pastillas)
  youth-meal/                      Servicio del feed + bloque completo + franja compacta
layout/top-nav/departments-aside.component.ts   Destacado del panel de escritorio (@defer)
```

Textos: `departments.*` (+ `nav.departments*`, `nav.dept_*_desc`) en es/ro.
Los de 09/10/2026 son **provisionales** (TODO(iglesia): que cada
departamento revise los suyos). Versículos: Cornilescu (ro) y RVR1960 (es).

## Receta: departamento nuevo

1. `DEPARTMENT_SLUGS` → `id: 'slug'` (el compilador exige el resto).
2. `DEPARTMENTS` → entrada: `icon`, `cover?` (sin foto = navy con el icono),
   `leadership?` (id del departamento en `SERVICE_AREAS`: los responsables
   salen de ahí, no se escriben), `weeklyProgramId?`, `pillars`,
   `activities`, `modules`.
3. `MAIN_NAV` → hijo `dept-<id>` del grupo `departments`.
4. Textos `departments.<id>.{name,tagline,intro,pillars.*,activities.*,verse,join}`
   y `nav.dept_<id>_desc`, en los dos idiomas.

Nada más: ruta, mosaico, acceso rápido, panel, cajón, pie y resumen vivo
salen solos. El mosaico es rejilla (destacado 2 × 2 desde `lg`; la última
celda suelta se estira entre `sm` y `lg`).

## Módulos (`DepartmentModule`)

Unión discriminada: cada `kind` es una pieza que la página sabe pintar.

- `youth-meal` → la app de la masa de tineret (abajo).
- `events` → eventos futuros de `upcomingEvents` cuyo `departments`
  incluye el id. Sin eventos, no se pinta. Para asociar un evento:
  `departments: ['youth']` en `church.config.ts`.

Pieza nueva (galería propia, documentos, inscripción…) = un `kind` más y su
`@case` en `department-page.component.html`.

## La app de la masa de tineret (ADM-TINERET)

App hermana: `C:\workspace\INEB_ELIM_Administrativ\elim-admin` (Angular 22
zoneless, sin backend), publicada en
`https://beni-cioarba.github.io/ADM-TINERET/`. Cada vineri un equipo de
tineri prepara la masa y dos părinți traen la comida.

La web **no copia sus datos**: lee el calendario público que la app genera en
cada despliegue (`assets/calendars/toate.ics`; mismo dominio de GitHub Pages
y `Access-Control-Allow-Origin: *`). `parseMealFeed` sólo extrae fecha,
equipo y horas (sosire / mâncare / program); **coordinador y personas se
ignoran a propósito**: los nombres se quedan en la app.

- `YouthMealService`: un `fetch` por sesión, al entrar el bloque en pantalla
  (`@defer (on viewport)`); «hoy» con `ClockService`. Si falla, el bloque se
  queda en la explicación y los accesos.
- Bloque completo (`#masa` en Tineret): qué es · para tineri / para părinți
  con enlace directo a su pestaña · tablero vivo (próximo turno + horario +
  siguientes 3) · abrir la app · suscribirse (`webcal:`) · QR (sólo con ratón).
  Por debajo de `lg` el tablero va **primero**: desde el teléfono se busca
  «¿a quién le toca?».
- Franja compacta en la portada de Departamente → `#masa`. El ancla vive
  fuera del `@defer` para que exista al llegar por enlace.

Si la app cambia de URL o de pestañas: `YOUTH_MEAL_APP` (un sitio).

## Diseño (línea propia, no catálogo)

Navy y oro con dos gestos «de producto tecnológico» contenidos:
retícula de 1 px al 4–5 % sobre navy (`tech-grid`, se desvanece) y filete de
luz dorada en el borde superior (`gold-edge`). Verde = «hoy / ahora» (el
mismo `color-mix(--c-success 62 %, #fff)` de la portada y de la barra de
pestañas). Medidas: portada `clamp(26rem, 64svh, 38rem)` (27 rem en
teléfono), lateral 21 rem fijo con `sticky` desde `lg`, pilares en rejilla
`auto-fit` (en teléfono una sola superficie con filetes: ~620 → ~430 px).
El velo de la portada es más parejo por debajo de `md` (el titular competía
con la pantalla luminosa de la foto de Tineret).

## Verificado (09/10/2026)

Auditoría responsive (`scripts/responsive-audit.snippet.js`) limpia en 320 ·
375 · 768 · 1024 · 1280 en `/departamente` y en las seis páginas. Bundle
inicial 619 kB (el destacado del panel de escritorio va diferido: costaba
~4 kB del arranque).

## Auditoría de ADM-TINERET (09/10/2026, para su repo)

Sin errores de consola, sin scroll horizontal a 375. Pendiente allí:

1. El pie enlaza `/admin` (`footer.component.ts`), contra su propia regla 7
   («ruta oculta… ni enlazada desde ningún sitio»).
2. `og:url` y `og:image` apuntan a `beni-nc.github.io/INEB_ELIM_Administrativ/`:
   el enlace que circula es `/ADM-TINERET/`, así que la vista previa al
   compartir sale de otro dominio.
3. Los enlaces profundos (`/ADM-TINERET/parinti`, `/admin`) responden
   **HTTP 404** (GitHub Pages sirve el `404.html` de la SPA): funcionan en
   el navegador, pero algunos generadores de vista previa (WhatsApp) no
   muestran tarjeta con un 404.
4. Los chevrones de expandir (`ui-btn--icon` con `aria-hidden` +
   `tabindex="-1"`) no tienen nombre: correcto mientras la fila entera sea el
   control accesible; si algún día son el único control, necesitan `aria-label`.
5. `theme-color` blanco con cabecera clara: correcto en claro; el modo oscuro
   ya lo cambia por script.
