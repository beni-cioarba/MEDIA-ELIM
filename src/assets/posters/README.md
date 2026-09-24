# Carteles de eventos y anuncios

Aquí van los carteles que la iglesia publica en redes (los cuadrados de
Instagram y los verticales). **Basta con dejar el fichero y apuntarlo en el
config**: la portada de la tarjeta lo coge solo.

## Cómo añadir uno

1. Deja el `.webp` (o `.jpg`) en esta carpeta, con un nombre que se entienda:
   `aniversare-25-ani.webp`, `conferinta-ancorat.webp`.
2. En `src/app/core/church.config.ts`, añade `poster` al evento o al anuncio:

   ```ts
   {
     id: 'aniversare_25',
     date: '2026-10-18',
     time: '10:00',
     title: 'Aniversare: 25 de ani…',
     poster: 'assets/posters/aniversare-25-ani.webp',
   }
   ```

Eso es todo. La tarjeta de la portada pasa a enseñar el cartel.

## Por qué se ven enteros y no recortados

Los carteles son cuadrados (1:1) o verticales (4:5) y la portada de la tarjeta
es 16:9. Recortarlos les cortaría el texto —la fecha, el invitado—, que es
justo lo que los hace útiles. Así que se muestran **enteros y centrados sobre
una copia de sí mismos ampliada y desenfocada**, que rellena los lados con sus
propios colores (`promo__cover--poster`). Es lo que hacen los reproductores
cuando la carátula no encaja en el marco.

En la tarjeta el cartel funciona como **identidad**, no como texto legible: a
296 px de alto no se lee. La información la llevan el titular, la descripción y
el pie; el cartel entero está a un clic, en su sección.

## Tamaño: no te preocupes, hay script

Suelta el fichero tal cual salga de Canva (PNG de 6-10 MB, da igual) y ejecuta:

```bash
npm run posters
```

Lo deja en WebP de 1080 px y calidad 80 —entre 80 y 200 kB— y de paso arregla
el nombre que pone el navegador al descargar (`cartel.webp (1).png` →
`cartel.webp`). Es idempotente: pasarlo dos veces no hace nada.

Por qué importa: en la tarjeta de la portada el cartel se ve a 296 px de alto.
Los 9,5 MB del PNG original serían íntegramente tiempo de carga tirado.
