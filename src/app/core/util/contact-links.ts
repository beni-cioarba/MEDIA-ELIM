/**
 * Enlaces de contacto directo (llamada y WhatsApp) — helpers compartidos.
 *
 * Los usan el pie y la página de contacto. Viven aquí para que ambos abran
 * exactamente lo mismo: si mañana cambia el formato del enlace de WhatsApp,
 * se cambia en un sitio.
 */

/** `tel:` a partir del teléfono en formato internacional (`+34678668977`). */
export function telHref(phone: string): string {
  return `tel:${phone}`;
}

/**
 * Chat de WhatsApp con la iglesia, con un primer mensaje ya escrito.
 *
 * `wa.me` es el enlace universal de WhatsApp: en el móvil abre la app con el
 * chat de ese número; en el ordenador, WhatsApp Desktop si está instalado o
 * WhatsApp Web. No hace falta tener el número guardado en la agenda.
 *
 * El texto va prellenado (la persona lo puede editar antes de enviar) para
 * que quien escribe no se quede ante un chat en blanco y la iglesia sepa de
 * dónde llega el mensaje.
 *
 * @param number Sólo dígitos, con prefijo de país y sin «+» (`34678668977`).
 * @param text Primer mensaje, ya traducido. Vacío → chat sin texto.
 */
export function whatsappHref(number: string, text = ''): string {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
