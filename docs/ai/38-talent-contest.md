# 38 · Talantul în Negoț (concurso bíblico)

> Página `/talantul-in-negot` (menú **Programa**, último). Sólo para
> **participantes**: qué es, fases y fechas, qué estudia cada categoría, cómo
> es el examen, beneficios, cómo apuntarse, materiales y vídeos. Nada de la
> parte de líderes (plataforma, escaneo de hojas, inscripción de líderes).

## Fuente del dato (auditada el 30/09/2026)

Todo sale de <https://talantulinnegot.com/> y de sus documentos públicos:

| Dato | Documento |
|---|---|
| Libros y 10 versículos por categoría, memorización (Apocalipsa 1–5), corte de «35+» | Bibliografía 2027 (Drive, `/fisiere/bibliografie-2027`) |
| Fases y fechas, categorías, beneficios, «cómo participar», versión Cornilescu SBR Oradea 2006 | Folleto 2027 (Drive, `/fisiere/pliant-de-prezentare-2027`) |
| Formato del examen: 5 apartados, 100 puntos | Test y baremo de la fase internacional 2026 + hoja de respuestas V3.0 |
| Corrección de la memorización (versículo a versículo, palabras de enlace) | Barem memorare 2027 (PDF) |
| Cifras 2026 (17 países · 500 iglesias · 13.500) y vídeos | Portada de la web |

El **reglamento 2027** aún no está publicado («va fi disponibil în curând»):
la página lo dice y enlaza a la web oficial.

## Arquitectura

```
core/talent-contest.config.ts        TALENT_CONTEST: fases, examen, cifras, recursos, vídeos, web oficial
core/talent-contest.categories.ts    CONTEST_CATEGORIES + contestCategory(): libros y versículos (~50 kB)
core/services/talent-contest.service  fases con estado (done/live/next/upcoming) y días que faltan (ClockService)
core/services/calendar.service        downloadAllDay(): .ics de eventos de día completo (genérico)
features/talent-contest/
  talent-contest.component.*          la página (cabecera + 7 bloques, el último: web oficial)
  contest-categories/                 selector de categoría (radiogroup) + libros + versículos
  contest-teaser/                     franja de la portada (qué es + cuenta atrás + acceso)
```

- **Categorías aparte** (`talent-contest.categories.ts`): son ~50 kB de
  versículos que sólo usa la página. El servicio no las conoce, así la franja
  de la portada lo usa sin meterlas en su chunk (comprobado en el build: los
  versículos sólo están en `talent-contest-component`).
- **Franja de la portada** (`<app-contest-teaser />`, tras «Últimas
  emisiones»): superficie oscura del módulo, cifra de días a la fase que toca
  y un botón; toda la tarjeta es pulsable con enlace «estirado» (el nombre
  accesible es sólo el del botón). Sin fase por delante, no se pinta.
- **Diapositiva de proyección** (bloque `talent`, `stage/blocks/talent-block`):
  cartel a sangre (superficie oscura entera) tras «Evenimente». Izquierda:
  título, las cinco fases (nodo + fecha corta, «6 – 8 aug.»), las ocho
  categorías en pastillas, la memorización y, al pie, la franja oro «Înscrieri
  la» con nombre y teléfono de cada persona (el teléfono a tamaño de cuerpo);
  derecha: cuenta atrás y QR a la página del concurso. La entradilla no se
  proyecta: le cedió el sitio a los contactos (en la columna lateral dejaban
  el QR en 15 px). El QR se dimensiona con container query (`min(100cqw, 100cqh)`)
  y va sin la leyenda del componente (`[captionKey]="null"`): dentro heredaba
  el ancho del código y se partía. Auto: mientras quede alguna fase. Prueba
  de banco (960 × 540, ES y RO): sin desbordes ni solapes, mínimo 3,2u. En la
  web, `/media/talantul-in-negot` redirige a la página.
- **Web oficial** (último bloque): botón con el dominio a la vista y los
  apartados útiles para el participante (`officialLinks`: proyecto, recursos,
  novedades, vídeos, contacto). Sin la plataforma ni la inscripción de líderes.

- **Rumano en el dato, ES/RO en la interfaz.** Libros, referencias y textos
  de los versículos van tal cual la bibliografía (es lo que se estudia y se
  escribe de memoria); los textos de la página, en `talent_contest.*`.
- **Categoría en la URL** (`?categoria=8-9`) con `Location.replaceState`,
  no con el router: con `scrollPositionRestoration` el router volvía arriba.
  Así se puede mandar «mira lo tuyo» a un niño o a sus padres.
- **Quién inscribe** (`TALENT_CONTEST.enrollers`, dato local de la iglesia,
  30/09/2026): Simona Pintilei y Mari Dobre, las educadoras de niños. Una sola
  fuente para la página y la diapositiva. «Quiero participar» (cabecera) baja
  al cierre (`#inscriere`), donde cada persona tiene nombre, teléfono (`tel:`)
  y dos botones: llamar y WhatsApp con edición y categoría elegida en el
  mensaje. Ya no se usa el WhatsApp general de la iglesia.
- **Añadir al calendario**: las cinco fases como eventos de día completo
  (`DTEND` exclusivo; aviso a las 18:00 del día anterior).
- **Edades orientativas** por categoría (curso rumano ≈ edad): la página
  dice que las confirma el líder. «35+» usa el corte oficial.
- En la **diáspora** las fases las coordina el líder nacional: la página no
  inventa sedes ni horas y dice que se confirman al inscribirse.

## Diseño

Línea propia, «profesional y futurista» (pedido explícito, fuera de la guía):
superficies oscuras con rejilla técnica y halo oro (cabecera y cierre),
tarjeta de cristal con la cuenta atrás, cifras tabulares, línea de fases que
se enciende hasta la fase que toca, barra de 100 puntos proporcional al peso
de cada apartado. Entre medias, secciones claras y densas en la columna común
(`--page-max` + `--page-gutter`). Beneficios en 4 × 2 (2 en tableta, 1 en
móvil). Selector: las ocho siempre a la vista, 2 columnas en móvil y 4 desde
`sm` (la tira deslizable del principio no se podía mover con ratón y en
táctil no se intuía que hubiera más).
`prefers-reduced-motion` apaga el pulso y los desplazamientos.

## Nueva edición (receta)

1. Descarga la bibliografía y el folleto nuevos de la web oficial.
2. En `talent-contest.config.ts`: `edition`, `phases`, `memorization`,
   `seniorCutoff`, `lastEdition`, `resources` (los enlaces `/fisiere/…`
   suelen mantenerse) y `videos`. En `talent-contest.categories.ts`, los
   libros y versículos de cada categoría.
3. Si cambia una categoría (en 2027 «18-45» → «18-35»), añade su clave en
   `talent_contest.categories.<id>` de **los dos** JSON de idioma.
4. Si cambia el formato del examen, ajusta `exam` (debe sumar 100) y sus
   textos en `talent_contest.exam.parts*`.
