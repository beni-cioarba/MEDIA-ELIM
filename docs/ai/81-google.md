# 81 · Google: cómo aparece la iglesia y qué falta

> Léelo si vas a tocar **títulos, imagen de compartir o datos estructurados**, o
> si alguien pregunta por qué Google enseña esto o aquello. Auditoría: 25/11/2026.

## Dos «cuadros» distintos

| Qué | De dónde sale | Quién lo cambia |
| --- | --- | --- |
| Resultado (izquierda): nombre, título, descripción, miniatura | La **web** | El código; Google tarda días o semanas en releerlo |
| Ficha (derecha): fotos, mapa, teléfono, horario, reseñas | **Perfil de Empresa de Google** | Sólo su propietario. **Sin reclamar**: sale «¿Eres el propietario de esta empresa?» |

## Estado del resultado

- **Bien**: título y descripción nuevos, favicon, 200 y canónica, sitemap,
  `http`, `www` y la dirección antigua de GitHub redirigen con 301.
- **Nombre**: sale `elimarganda.com` en vez de «Biserica Elim Arganda». El
  `WebSite` es correcto; Google pone el dominio mientras duda del nombre, y
  fuera de la web la iglesia figura como «Elim Arganda» (Maps, YouTube, Facebook,
  Instagram). Ahora `alternateName` empieza por «Elim Arganda»; «Biserica Elim»,
  genérico, queda sólo en la iglesia. **No** añadir el dominio como alternativo:
  Google lo tomaría como preferencia.
- **Miniatura**: `og-image.jpg` recortada a cuadrado dejaba «Biserica E». Ahora
  todo cabe en el cuadrado central, y `primaryImageOfPage` propone
  `og-square.jpg`. Las tres fotos de la sala (1:1, 4:3, 16:9) van en la iglesia.
  Se regeneran con `npm run pwa:icons`.
- `max-image-preview:large` en las páginas indexables; las privadas, `noindex`.
- **Enlaces de sitio** (subpáginas bajo el resultado): los decide Google; no se
  pueden pedir. Ayuda que indexe las páginas interiores (Search Console).
- «Traducir esta página»: Google sólo conoce el rumano. El español no tiene URL
  propia; haría falta `/es/…` con `hreflang` (`70-roadmap.md`).

## Lo que falta fuera del código

1. **Search Console**: propiedad *Dominio* **verificada el 25/11/2026** (TXT
   `google-site-verification=…` en IONOS, con la cuenta de Google de la iglesia).
   **No borrar ese TXT.** Falta: *Sitemaps* → `https://elimarganda.com/sitemap.xml`
   y, ya publicados los cambios del 25/11, *Inspección de URLs* → la portada →
   **Solicitar indexación** (una vez: repetirla no acelera).
   Ojo en IONOS: la vía automática («Domain Connect») quería quitar el MX del
   correo del dominio; el registro se añade **a mano**. Y el aviso «sin
   certificado SSL» se ignora: lo pone GitHub Pages.
2. **Perfil de Empresa**: pulsar «¿Eres el propietario de esta empresa?» en la
   ficha, con una cuenta de Google **de la iglesia**, no personal. Google
   verifica por vídeo, teléfono o carta. Luego revisar los datos de abajo.
3. **Mismos datos en todas partes** (nombre, dirección, teléfono). El público
   es el **+34 678 66 89 77** (confirmado el 25/11/2026; es el de la web). La
   ficha de Google aún da 918 72 00 94: cambiarlo al reclamarla.

### Datos para el perfil

- **Nombre**: el que use la iglesia en el rótulo (Google no admite añadidos).
  Recomendado: «Biserica Elim Arganda», igual que en la web.
- **Categoría**: Iglesia pentecostal · **Web**: `https://elimarganda.com/`
- **Dirección**: Av. de Madrid, 30, 28500 Arganda del Rey
- **Teléfono**: +34 678 66 89 77
- **Horario**: lun–vie 20:30 · dom 10:00 y 18:00 (`weekly.content.ts`). La hora
  de cierre la pone la iglesia.
- **Descripción** (máx. 750 caracteres):

  > Iglesia cristiana pentecostal rumana en Arganda del Rey. Somos una familia
  > que adora, sirve y crece junta, y toda persona es bienvenida. Nos reunimos
  > los domingos a las 10:00 y a las 18:00, y de lunes a viernes a las 20:30:
  > oración, estudio bíblico y encuentro de jóvenes los viernes. Los cultos son
  > en rumano, con traducción en directo al español, y se retransmiten por YouTube. En la web tienes el
  > programa, los anuncios, cómo llegar y una página de bienvenida si nos visitas
  > por primera vez.

- **Fotos**: portada = `biserica-elim-arganda-16x9.jpg`; logotipo =
  `assets/pwa/icon-any-512.png`; además, fachada e interior actuales (hoy sale
  una foto antigua de Street View).

## Título de la app instalada

Chrome sólo enseña el título en la ventana de la app si empieza **exactamente**
por el `name` del manifiesto; si no, pinta el nombre a secas (medido en
Chrome 157: no valen el `short_name` ni `<meta name="application-title">`). Por
eso desaparecía en español y en las páginas interiores. En ventana de app el
título es `APP_NAME · <página>` (`page-title.ts`, `PwaInstallService.openAsApp`);
en la pestaña y en `og:title`, el de siempre. El nombre de la app no cambia con
el idioma.
