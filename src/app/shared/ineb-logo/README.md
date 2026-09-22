# Marca INEB — componente y hoja de marca

Todo lo necesario para usar, copiar o **reproducir desde cero** el logotipo de INEB. El componente
(`ineb-logo.component.ts`) es la fuente de verdad: si algo de este documento y el código no
coinciden, manda el código.

> **Carpeta compartida.** Esta carpeta es idéntica a `shared/ui/ineb-logo/` de la app
> administrativa (`INEB_ELIM_Administrativ/elim-admin`). Un cambio en la marca se hace en una y
> se copia la carpeta entera a la otra; nunca se retoca sólo en un sitio.
>
> **En esta web (MEDIA-ELIM)** el logo aparece una única vez: en la franja legal del pie
> (`shared/footer`), forma completa a 32–36 px sobre navy (`tone="dark"`), dentro del enlace a
> ineb.es. Qué logo va en cada sitio: `docs/ai/45-design-system.md` → «Marca».

---

## 1. Anatomía

La marca tiene tres piezas:

| Pieza | Qué es | Color |
|---|---|---|
| **Placa TECH** | Rectángulo con el descriptor dentro | Fondo amarillo, letras en navy |
| **«IN»** | Primera mitad del nombre | Tinta del nombre (blanco o navy, según el fondo) |
| **«EB»** | Segunda mitad del nombre | Rojo de marca, en cualquier fondo |

La forma completa las coloca en **dos alturas**: a la izquierda la placa sobre «IN», ambas del
mismo ancho; a la derecha «EB» a toda altura, compartiendo línea base con «IN».

---

## 2. Retícula y medidas exactas

Todo está medido sobre el arte original de 6000 × 1875 px. **1 unidad del `viewBox` = 50 px de
aquel lienzo.** Los `viewBox` van a ras de tinta: no hay margen incluido.

### Forma completa (`lockup`) — `viewBox="0 0 118.2 35.5"`

| Elemento | X | Y | Notas |
|---|---|---|---|
| Placa | 0 – 38.9 | 1.26 – 9.48 | 38.9 × 8.22 |
| «I» | 0 – 7.7 | 11.2 – 35.0 | asta 7.7 |
| «N» | 15 – 38.9 | 11.2 – 35.0 | astas 7.1 y 7.0; diagonal de 22.1,10.7 a 31.9,23.2 |
| «E» | 46.8 – 76.9 | 0.5 – 35.0 | asta 11; barras 8.3 / 7.9 / 8.2; **la central más corta** (hasta 73.9) |
| «B» | 85 – 118.2 | 0 – 35.5 | asta 11; cuenco inferior más ancho; contrapuntos en 8.8–13.6 y 21.5–26.8 |

Huecos entre bloques: **«IN» → «E» = 7.9** · **«E» → «B» = 8.1**.

**Letras de TECH** — altura 5.46 (y 2.64 – 8.10), **astas 1.76**, **barras 1.26 – 1.40**:

| Letra | X | Detalle |
|---|---|---|
| T | 1.63 – 6.95 | barra 1.40, asta centrada de 1.76 |
| E | 11.98 – 16.76 | barras 1.32 / 1.26 / 1.32; la central más corta (hasta 16.34) |
| C | 21.79 – 26.81 | anillo: exterior rx 2.53 ry 2.81, interior rx 0.73 ry 1.49; **abertura de 0.98** (17 % de la letra) con los remates cortados en horizontal |
| H | 31.83 – 37.27 | astas 1.76, travesaño 1.40 |

Tracking de TECH: **5.03 entre letras**, márgenes de **1.63** a cada lado dentro de la placa, y
centrado vertical exacto (1.38 arriba y abajo).

### Forma compacta (`compact`) — `viewBox="0 0 132.7 35.5"`

Las mismas letras, todas a la misma altura y con **tracking único de 8.0**. «I» y «N» son las de la
forma completa escaladas ×1.4375 (así el asta de la I pasa de 7.7 a 11.07, que es el asta de la E).

| Letra | X |
|---|---|
| I | 0 – 11.07 |
| N | 19.07 – 53.43 |
| E | 61.43 – 91.53 |
| B | 99.53 – 132.7 |

### Isotipo (`mark`) — `viewBox="0 0 48 48"`

El bloque izquierdo de la forma completa (placa + «IN», 38.9 × 33.74) escalado ×1.013 y centrado:
márgenes de **4.3** a los lados y **6.9** arriba y abajo. No es un dibujo nuevo, es un recorte del
logotipo, para que se reconozca al lado de la versión larga.

### Correcciones ópticas (no se pueden omitir)

1. **La «B» desborda 0.5 arriba y abajo** la línea de la «E», y **la C de TECH 0.08**: una forma
   redonda a la misma altura que una plana se ve más pequeña.
2. **Las barras horizontales son más finas que las astas verticales** (1.26–1.40 frente a 1.76),
   o la letra se ve pesada de arriba abajo.
3. **La barra central de la E y de la B es más corta** que las de arriba y abajo.

---

## 3. Colores

| Color | HEX | RGB | CMYK aprox. | Uso |
|---|---|---|---|---|
| Amarillo | `#FFD230` | 255, 210, 48 | 0 / 18 / 81 / 0 | Fondo de la placa |
| Rojo | `#FF3131` | 255, 49, 49 | 0 / 81 / 81 / 0 | «EB», en cualquier fondo |
| Navy | `#10144A` | 16, 20, 74 | 78 / 73 / 0 / 71 | Letras de la placa, nombre sobre claro, cuadro del isotipo |
| Blanco | `#FFFFFF` | 255, 255, 255 | — | Nombre sobre oscuro |

> El CMYK es una conversión directa desde sRGB, **para orientar, no para imprimir**: el rojo y el
> amarillo son muy saturados y se apagarán en cuatricromía. Antes de imprimir, elige el Pantone
> sobre una guía física y anótalo aquí.

**Contrastes medidos** (sobre el navy institucional `#1B2A4A`): blanco 14.2 · amarillo 9.8 ·
rojo 3.9. Sobre blanco: navy 17.2 · rojo 3.7. Dentro de la placa, navy sobre amarillo: 11.9.

El 3.9 del rojo **es suficiente**: el listón de WCAG para texto grande es 3, y los logotipos están
exentos. No lo aclares para "cumplir" un umbral que no aplica; lo único que consigues es apagarlo.

---

## 4. Formas, tamaños mínimos y cuándo usar cada una

| Forma | Proporción | Mínimo | Cuándo |
|---|---|---|---|
| `lockup` | 3.33 : 1 | **32 px de alto** | La forma preferente. Por debajo de 32, TECH deja de leerse |
| `compact` | 3.74 : 1 | **16 px de alto** | Barras estrechas, móvil, firmas de correo, anchos justos |
| `mark` | 1 : 1 | **16 × 16** | Favicon, avatar, icono de app, cualquier hueco cuadrado |

**Espacio de respeto**: el alto de la placa (8.22 unidades ≈ 23 % del alto de la marca) libre a los
cuatro lados. Es una medida de la propia marca, así que escala sola.

---

## 5. Fondos

| Fondo | Ajuste |
|---|---|
| Claro | `tone="light"` — el nombre va en navy |
| Oscuro | `tone="dark"` — el nombre va en blanco |
| Foto o textura | Usa `mark` con `tile` (cuadro navy), o reserva una caja sólida |
| Una sola tinta | `mono` — la placa se llena de tinta y TECH se cala en el color del papel |

`mono` cubre sello, grabado, bordado, fax y fotocopia. Necesita fondo sólido y que
`--ineb-paper` coincida con él.

---

## 6. Lo que no se hace

- No cambiar los colores ni "actualizarlos" (salvo `mono`, que es una tinta plana).
- No deformar: la proporción de cada forma es fija.
- No girar, inclinar ni curvar.
- No poner contorno, sombra, degradado ni relieve.
- No usar la forma completa por debajo de 32 px: usa `compact` o `mark`.
- No rehacer la palabra con una tipografía del sistema: las letras son trazados propios y cambian
  de forma en cada sistema operativo.
- No separar «IN» de «EB» ni cambiarles el tamaño relativo.

---

## 7. Cómo usarlo

### Angular (esta app y cualquier otra)

Copia la carpeta `ineb-logo/` entera. No depende de nada más: ni tokens, ni i18n, ni servicios.
En Angular < 19 añade `standalone: true` al decorador (aquí ya está); en Angular ≥ 19 es lo
implícito y sobra. El resto —`input()`, `computed`, bloques `@if`— existe desde Angular 17.1.

```html
<app-ineb-logo tone="dark" />                          <!-- forma completa -->
<app-ineb-logo tone="light" variant="compact" />       <!-- una línea -->
<app-ineb-logo variant="mark" [tile]="true" />         <!-- icono cuadrado -->
<app-ineb-logo [mono]="true" tone="light" />           <!-- una tinta -->
<app-ineb-logo variant="auto" tone="dark" />           <!-- completa o compacta según el ancho -->
<app-ineb-logo label="INEB" />                         <!-- con nombre accesible -->
```

El tamaño lo decide el contexto, no el componente:

```css
.mi-pie app-ineb-logo { --ineb-size: clamp(34px, 2.9vw, 40px); }
```

En esta web el pie usa `--ineb-size: clamp(32px, 2.4vw, 36px)`: nunca por debajo de los 32 px de
la forma completa (en **px**, no en `rem`: la raíz baja a 15 px en móvil y 2rem serían 30 px). La
franja legal es una línea compacta y el logo va atenuado (`opacity: .75`) hasta el hover, para no
competir con la marca de la iglesia.

| Entrada | Valores | Por defecto |
|---|---|---|
| `tone` | `light` · `dark` | `dark` |
| `variant` | `lockup` · `compact` · `mark` · `auto` | `lockup` |
| `mono` | `true` · `false` | `false` |
| `tile` | `true` · `false` (solo en `mark`) | `false` |
| `label` | texto; vacío = decorativo | `''` |

| Variable CSS | Para qué |
|---|---|
| `--ineb-size` | Alto de la marca (lado, en `mark`) |
| `--ineb-yellow` `--ineb-red` `--ineb-navy` | Paleta; tocarlas deja de ser la marca |
| `--ineb-paper` | Color del papel en `mono` |

### React, Vue, HTML plano, correo

Copia el `<svg>` de la forma que necesites desde el componente y sustituye los `[attr.fill]` por
colores literales. Ejemplo de la compacta sobre fondo oscuro:

```html
<svg viewBox="0 0 132.7 35.5" fill="none" role="img" aria-label="INEB" style="height:40px;width:auto">
  <g fill="#ffffff">
    <rect y=".5" width="11.07" height="34.5"/>
    <g transform="translate(-2.49,-15.6) scale(1.4375)">
      <path d="M15 11.2h7.1l9.8 12.5V11.2h7v23.8h-7l-9.8-11.6v11.6H15z"/>
    </g>
  </g>
  <g fill="#ff3131">
    <path transform="translate(14.63,0)" d="M46.8 .5h29.8v8.3H57.8v4.8h16.1V21.5H57.8v5.3h19.1v8.2H46.8z"/>
    <path transform="translate(14.53,0)" fill-rule="evenodd" clip-rule="evenodd"
          d="M85 0h26.5a5.8 8.55 0 0 1 .2 17.1 6.95 9.2 0 0 1-.9 18.4H85zM96 8.8h7.7a2.4 2.4 0 0 1 0 4.8H96zM96 21.5h8.25a2.65 2.65 0 0 1 0 5.3H96z"/>
  </g>
</svg>
```

Para **favicon**, el isotipo con cuadro: mismo SVG del bloque `mark`, con `<rect width="48"
height="48" fill="#10144a"/>` detrás. Un SVG vale como favicon en todos los navegadores actuales;
si hace falta PNG, exporta a 16, 32, 180 (Apple) y 512 (PWA).

---

## 8. Reproducirlo desde cero

Si hay que redibujarlo (otra herramienta, un generador de imágenes, un rótulo), esto es lo que
define la marca:

> Logotipo de dos alturas sobre fondo transparente. A la izquierda, un rectángulo amarillo
> `#FFD230` de proporción 4.73 : 1 con la palabra «TECH» dentro, en navy `#10144A`, en mayúsculas
> de palo seco muy pesado, con mucho tracking y centrada; debajo y del mismo ancho exacto, las
> letras «IN» en blanco (o navy sobre fondo claro). A la derecha, pegadas, las letras «EB» en rojo
> `#FF3131`, **más altas que «IN»** —«IN» mide el 69 % de su altura— y apoyadas en la misma línea
> base. Tipografía: grotesca geométrica extra negra, astas verticales de un 32 % de la altura de la
> letra, barras horizontales un 25 % más finas, terminaciones rectas, contrapuntos rectangulares
> con el extremo redondeado. Sin contorno, sin sombra, sin degradado.

Las medidas de la sección 2 permiten reconstruirlo al punto. El orden de trabajo que funciona:
retícula → placa → letras de TECH → «IN» → «EB» → correcciones ópticas.

---

## 9. Origen

El arte de partida (`logo-ineb.png`, 6000 × 1875, fondo transparente; en esta web era el PNG de
139 kB que vivía en `assets/` y se ha retirado) solo servía sobre fondo oscuro, se veía borroso al
escalar y costaba una petición de red. Esta versión es una **reconstrucción
vectorial medida** sobre ese arte, con las correcciones ópticas y de coherencia que el original no
traía. Si aparece el vector original del diseñador, se sustituyen los trazados y el resto del
componente —tonos, formas, tamaños, accesibilidad— sigue igual.
