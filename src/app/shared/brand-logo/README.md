# Marca ELIM — wordmark, componente y hoja de marca

Todo lo necesario para usar, copiar o **reproducir desde cero** la marca de la iglesia ELIM
Arganda del Rey. El componente (`brand-logo.component.ts`) es la fuente de verdad: si algo de este
documento y el código no coinciden, manda el código.

> **Carpeta compartida.** Está pensada para copiarse tal cual a cualquier app Angular de la
> iglesia (la administrativa, `INEB_ELIM_Administrativ/elim-admin`, lleva hoy un *port* con sus
> propios tokens: debe sustituirse por esta carpeta). Un cambio en la marca se hace en una app y se
> copia la carpeta entera a la otra; nunca se retoca sólo en un sitio.
>
> **Sistema de marca completo** (qué pieza va en cada sitio: wordmark, emblema del icono de la
> app, marca INEB): `docs/ai/45-design-system.md` → «Marca».

---

## 1. Anatomía

La marca es **tipográfica**: no hay dibujo, hay dos líneas de texto con una relación fija.

| Pieza | Qué es | Tipografía | Color |
|---|---|---|---|
| **Nombre** | «ELIM» en versales | Playfair Display **600**, tracking 0,22 em | Tinta (navy o papel, según el fondo) |
| **Localidad** | «ARGANDA DEL REY» en versales, justificada al ancho exacto del nombre | Inter **600**, tracking 0,06 em | Acento oro (profundo o claro, según el fondo) |

El **emblema** (paloma, cruz y llama sobre disco claro) **no forma parte del wordmark**: sólo vive
en el icono de la app (favicon, PWA, Apple), generado con `npm run pwa:icons`. No se coloca al lado
del nombre ni dentro de una página.

---

## 2. Retícula y medidas exactas

Todo deriva de **una medida: S = cuerpo del nombre** (`--brand-size`). Cambiar S cambia todo el
bloque sin descuadrarlo.

| Elemento | Medida | Notas |
|---|---|---|
| Cuerpo del nombre | **S** | `font-size` de «ELIM» |
| Tracking del nombre | 0,22 S | El margen final negativo (−0,22 S) descuenta el hueco que cuelga tras la «M»: la caja mide **tinta** |
| Hueco entre líneas | 0,14 S | `row-gap`; deriva de S, no del cuerpo del contexto |
| Cuerpo de la localidad | **0,289 S** | Con Inter 600 y tracking 0,06 em, «ARGANDA DEL REY» justificada queda exactamente bajo «ELIM» |
| Ancho total (tinta) | ≈ **3,16 S** | Medido con Playfair Display 600 (≈ 3,2 : 1) |
| Alto total | **1,43 S** | S + 0,14 S + 0,289 S (`line-height: 1`) |
| Forma compacta (solo nombre) | 1 S de alto, ≈ 3,16 S de ancho | `showLocation = false` |

**Justificación de la localidad** (la parte no obvia): la rejilla tiene una sola columna
`max-content` fijada por el nombre; la localidad no aporta ancho (`width: 0; min-width: 100%`) y
reparte la holgura entre sus palabras con `text-align-last: justify`. Requiere ≥ 2 palabras y es
incompatible con `white-space: nowrap`. Verificado de 375 a 1800 px: una sola línea y ≤ 0,6 px de
diferencia entre los bordes derechos.

**Alineación óptica**: «ELIM» empieza en el borde izquierdo de la columna; la «E» de Playfair no
tiene remate saliente, así que no hace falta compensación óptica a la izquierda.

---

## 3. Colores

| Color | HEX | Token de la app equivalente | Uso |
|---|---|---|---|
| Navy | `#1A365D` | `navy(700)` = `--c-primary` | Nombre sobre fondo claro |
| Navy profundo | `#122844` | `navy(800)` | Nombre al hover sobre claro |
| Papel | `#FAF9F6` | `neutral(50)` = `--c-on-primary` | Nombre sobre fondo oscuro |
| Oro | `#D4AF37` | `gold(500)` = `--c-gold` | Localidad sobre fondo **oscuro** |
| Oro profundo | `#9C7A1E` | `gold(700)` = `--c-gold-deep` | Localidad sobre fondo **claro** |
| Oro claro | `#E3C766` | `gold(300)` = `--c-gold-soft` | Nombre al hover sobre oscuro |

El componente declara estos valores **literalmente** (variables `--brand-*`): coinciden con los
tokens de la app, pero la marca no depende del tema. En otra app se ven igual sin tocar nada.

**Contrastes medidos** (WCAG, relación de luminancia):

| Sobre | Tinta | Acento | Veredicto |
|---|---|---|---|
| Alabastro `#FAF9F6` (`tone="light"`) | navy **11,5** | oro profundo **3,8** | Nombre AAA. Localidad: es un logotipo (exento), pero 3,8 supera el listón de texto grande (3) |
| Blanco `#FFFFFF` | navy 12,1 | oro profundo 4,0 | Ídem |
| Navy `#1A365D` (`tone="dark"`, pie) | papel **11,5** | oro **5,8** | Ambos cómodos; hover oro claro 7,3 |
| Navy profundo `#122844` | papel 14,1 | oro 7,1 | Mejor aún |
| Escenario `#060914` | papel 18,9 | oro 9,4 | Reservado para el fondo oscuro del escenario |

Los dos oros **no son intercambiables**: oro claro sobre alabastro da 2,0 y oro profundo sobre
navy da 3,0. Por eso cada tono lleva el suyo y no hay que elegirlo a mano.

---

## 4. Tamaños mínimos y presets

| Forma | Mínimo | Cuándo |
|---|---|---|
| **Completa** (nombre + localidad) | **S = 24 px** (localidad 6,9 px) | La forma preferente. Por debajo la localidad deja de leerse y estorba. Es el mismo listón que INEB aplica a «TECH» en su mínimo (≈ 5 px): fino, pero nítido en pantallas de alta densidad |
| **Compacta** (`showLocation = false`) | **S = 16 px** | Barras estrechas, chips, firmas, anchos justos |

Presets del componente (`size`):

| `size` | S | Dónde |
|---|---|---|
| `sm` | 24 px | Chip del panel de control: el mínimo de la completa, fijo |
| `md` | `clamp(24px, 5vw, 1.8rem)` | Cabecera: fluida, 24 px en móvil (375 px de ancho no dan para más junto a las acciones) y ~36 px en escritorio |
| `lg` | 2,25 rem (34–45 px) | Pie |
| `xl` | `clamp(2.5rem, 5vw, 4.5rem)` (recortado a `clamp(2rem, 3.5vw, 3rem)` en apaisado bajo) | Proyección: manda el ancho de pantalla |
| `context` | el `--brand-size` del consumidor (24 px si no hay) | Cuando el contexto sabe cuánto sitio hay: panel de control (`clamp(26px, 2.2vw, 38px)`, se ajusta a la barra), escenario proyectado (`calc(var(--pj-u) * 5)`), otras apps |

**Espacio de respeto**: 0,5 S libre a los cuatro lados (la mitad del cuerpo del nombre). Escala
sola con la marca.

---

## 5. Fondos

| Fondo | Ajuste |
|---|---|
| Claro (alabastro, blanco, superficies claras) | `tone="light"` — navy + oro profundo |
| Oscuro (navy del pie, escenario, barras oscuras) | `tone="dark"` — papel + oro |
| Foto o textura | Reserva una caja sólida (pastilla clara u oscura) y usa el tono de la caja. Nunca directamente sobre foto |
| Una sola tinta | `mono` — la localidad toma la tinta del nombre |

`mono` cubre sello, grabado, bordado, fax y fotocopia; combínalo con el `tone` del fondo.

---

## 6. Lo que no se hace

- No cambiar los colores ni «actualizarlos»; no usar el oro claro sobre claro ni el profundo
  sobre oscuro.
- No sustituir las tipografías (Playfair Display 600 / Inter 600) ni el peso: sin ellas cambia la
  forma de la marca. Si la app no carga las fuentes, cárgalas.
- No cambiar el tracking ni la proporción 0,289 de la localidad.
- No escribir el wordmark a mano en un componente: se importa `app-brand-logo`.
- No poner el emblema junto al nombre, ni una imagen PNG/WebP de la marca.
- No usar la forma completa por debajo de 24 px: `showLocation = false`.
- No traducir «Elim» ni «Arganda del Rey»: son constantes de identidad (por eso no están en
  `i18n/*.json`). Lo que sí se traduce es el nombre accesible («Iglesia Elim» / «Biserica Elim»).
- No añadir contorno, sombra propia, degradado ni relieve. (La proyección aplica una sombra al
  contenedor sobre el fondo web y la quita al proyectar: es cosa del escenario, no de la marca.)

---

## 7. Cómo usarlo

### Angular (esta app y cualquier otra)

Copia la carpeta `brand-logo/` entera. Depende sólo de Angular (`RouterLink`) y, **opcionalmente**,
de `@ngx-translate/core`: si el inyector tiene `TranslateService`, el nombre accesible sale de la
clave `brand.name`; si no, de `label` o del valor por defecto. En Angular < 19 se necesita
`standalone: true` (aquí ya está).

```html
<app-brand-logo />                                     <!-- cabecera: md, claro, enlace a "/" -->
<app-brand-logo tone="dark" size="lg" />               <!-- pie -->
<app-brand-logo size="xl" [link]="null" />             <!-- proyección: imagen no navegable -->
<app-brand-logo size="sm" [showLocation]="false" />    <!-- compacta -->
<app-brand-logo [mono]="true" tone="light" />          <!-- una tinta -->
<app-brand-logo size="context" link="https://elim…" /> <!-- otra app: tamaño del layout, enlace externo -->
<app-brand-logo label="Iglesia Elim" />                <!-- nombre accesible explícito -->
```

Con `size="context"` el tamaño lo decide el consumidor:

```css
.mi-cabecera app-brand-logo { --brand-size: clamp(28px, 3vw, 36px); }
```

| Entrada | Valores | Por defecto |
|---|---|---|
| `size` | `sm` · `md` · `lg` · `xl` · `context` | `md` |
| `tone` | `light` · `dark` | `light` |
| `link` | ruta interna · `https://…` (pestaña nueva) · `null` (no navegable, `role="img"`) | `'/'` |
| `showLocation` | `true` · `false` | `true` |
| `mono` | `true` · `false` | `false` |
| `name` · `location` | textos de la marca | `'Elim'` · `'Arganda del Rey'` |
| `label` | nombre accesible; vacío = traducción o «Biserica Elim» | `''` |

| Variable CSS | Para qué |
|---|---|
| `--brand-size` | Cuerpo del nombre (sólo con `size="context"`; los presets la fijan ellos) |
| `--brand-navy` `--brand-navy-deep` `--brand-paper` `--brand-gold` `--brand-gold-deep` `--brand-gold-soft` | Paleta; tocarlas deja de ser la marca |
| `--brand-font-name` `--brand-font-location` | Tipografías (con fallback) |
| `--c-focus` | Si la app la define, el anillo de foco la usa; si no, oro 600 |

### HTML plano, correo, otra tecnología

Dos `<span>` en una rejilla. Ejemplo de la completa sobre fondo oscuro a 36 px:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@600&display=swap" rel="stylesheet">
<span role="img" aria-label="Biserica Elim"
      style="display:grid;grid-template-columns:max-content;row-gap:5px;line-height:1;text-transform:uppercase">
  <span style="font:600 36px 'Playfair Display',Georgia,serif;letter-spacing:.22em;margin-right:-.22em;color:#faf9f6">Elim</span>
  <span style="width:0;min-width:100%;font:600 10.4px Inter,system-ui,sans-serif;letter-spacing:.06em;margin-right:-.06em;text-align-last:justify;color:#d4af37">Arganda del Rey</span>
</span>
```

Sobre fondo claro: nombre `#1a365d`, localidad `#9c7a1e`. Para correo (sin `text-align-last`
fiable), usa la forma compacta o exporta a PNG a 2× desde el navegador.

---

## 8. Reproducirlo desde cero

Si hay que redibujarlo en otra herramienta (rótulo, vinilo, papelería), esto es lo que define la
marca:

> Wordmark de dos líneas alineadas a la izquierda y con el mismo ancho exacto. Arriba, «ELIM» en
> versales de Playfair Display SemiBold (600) con tracking amplio (22 % del cuerpo). Debajo, a un
> hueco del 14 % del cuerpo, «ARGANDA DEL REY» en versales de Inter SemiBold al 28,9 % del cuerpo,
> tracking 6 %, con las palabras repartidas para que la línea ocupe exactamente el ancho de
> «ELIM». Sobre claro: nombre navy `#1A365D` y localidad oro profundo `#9C7A1E`; sobre oscuro:
> nombre papel `#FAF9F6` y localidad oro `#D4AF37`. Sin contorno, sombra ni degradado.

Orden de trabajo: fija S → compón «ELIM» con su tracking → mide su ancho de tinta → compón la
localidad a 0,289 S y justifícala a ese ancho → separa 0,14 S → aplica el par de colores del fondo.

---

## 9. Origen

Antes convivían tres marcas: este wordmark en la cabecera, un `logo-elim.webp` (texto blanco con
llama dorada, sólo válido sobre oscuro) en el pie y otro en el escenario. Se unificó en el wordmark
por peso (0 kB), nitidez a cualquier escala, dos tintas sin dos ficheros y lectura por buscadores y
lectores de pantalla. Las imágenes se retiraron; el símbolo de la iglesia (paloma, cruz y llama)
sobrevive como **emblema del icono de la app**, tomado del disco interior del sello institucional.
