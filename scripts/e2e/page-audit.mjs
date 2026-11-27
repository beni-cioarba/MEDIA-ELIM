/**
 * Comprobación de una página **ya cargada**, ejecutada dentro del navegador
 * (`page.evaluate(auditPage, opciones)`): por eso es una sola función sin
 * dependencias de fuera.
 *
 * Sólo lo **funcional**, lo que la gente vería roto (26/11/2026: el diseño y
 * la accesibilidad —h1, contraste, objetivos táctiles…— dejaron de bloquear
 * el despliegue; se revisan a mano, no en esta puerta):
 *  · claves de traducción sin traducir a la vista (`nav.algo`);
 *  · los enlaces internos de la página, que `smoke.mjs` pide luego por HTTP.
 *
 * @param {{ roots: string[] }} options `roots`: raíces de los diccionarios
 *   i18n, para reconocer una clave sin traducir.
 */
export function auditPage(options) {
  const fallos = [];

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
    }
    return true;
  };

  // ── Claves sin traducir ───────────────────────────────────────────────
  const roots = new Set(options.roots);
  const keyLike = /^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+$/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim();
    if (text.length > 80 || !keyLike.test(text) || !roots.has(text.split('.')[0])) continue;
    if (node.parentElement && visible(node.parentElement)) fallos.push({ regla: 'i18n', detalle: `clave a la vista: ${text}` });
  }

  return {
    links: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((href) => href.startsWith(location.origin)).map((href) => href.split('#')[0].split('?')[0]))],
    fallos,
  };
}
