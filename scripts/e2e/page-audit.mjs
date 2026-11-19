/**
 * Auditoría de una página **ya cargada**, ejecutada dentro del navegador
 * (`page.evaluate(auditPage, opciones)`): por eso es una sola función sin
 * dependencias de fuera.
 *
 * Es el barrido que se hizo a mano en la auditoría de noviembre de 2026
 * (`docs/ai/76-plan-maestro.md` § 2.7), convertido en puerta: lo que aquí
 * sale como `fallos` impide publicar.
 *
 * Qué mira:
 *  · estructura: un `h1` visible, un solo `main`, sin saltos de nivel;
 *  · sin scroll horizontal;
 *  · imágenes con `alt`; controles con nombre accesible; campos con etiqueta;
 *    `id` sin repetir;
 *  · claves de traducción sin traducir a la vista (`nav.algo`);
 *  · contraste AA de cada texto sobre color plano (se salta lo que va sobre
 *    foto o degradado: eso no se puede calcular);
 *  · objetivos táctiles de 24 px (WCAG 2.5.8), contando el área ampliada con
 *    `::after` (mixin `tap-target`, enlaces estirados) y la excepción de
 *    separación.
 *
 * @param {{ mobile: boolean, roots: string[] }} options `roots`: raíces de los
 *   diccionarios i18n, para reconocer una clave sin traducir.
 */
export function auditPage(options) {
  const fallos = [];
  const fail = (regla, detalle) => fallos.push({ regla, detalle });

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
    }
    return true;
  };
  const sel = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls.map((c) => '.' + c).join('')).slice(0, 80);
  };

  // ── Estructura ────────────────────────────────────────────────────────
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => {
    // Un `h1` sólo para lectores de pantalla cuenta: es el título de la página.
    const r = h.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const h1 = headings.filter((h) => h.tagName === 'H1');
  if (h1.length !== 1) fail('h1', `${h1.length} h1 (debe haber exactamente uno)`);
  const mains = document.querySelectorAll('main, [role="main"]').length;
  if (mains !== 1) fail('main', `${mains} landmarks main (debe haber exactamente uno)`);
  let previous = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    if (previous && level > previous + 1) fail('encabezados', `salto h${previous} → h${level}: «${h.textContent.trim().slice(0, 40)}»`);
    previous = level;
  }

  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  if (overflow > 1) fail('desborde', `scroll horizontal de ${overflow} px`);

  // ── Imágenes, nombres, etiquetas, ids ────────────────────────────────
  for (const img of document.querySelectorAll('img:not([alt])')) fail('alt', sel(img));

  const accessibleName = (el) =>
    (el.getAttribute('aria-label') || '').trim() ||
    (el.getAttribute('aria-labelledby') || '')
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim() ||
    (el.textContent || '').trim() ||
    (el.getAttribute('title') || '').trim() ||
    [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ').trim();
  const interactive = [...document.querySelectorAll('a[href], button, [role="button"], [role="link"], [role="tab"], summary')].filter(visible);
  for (const el of interactive) if (!accessibleName(el)) fail('nombre', sel(el));

  for (const field of [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(visible)) {
    const labelled = (field.labels && field.labels.length > 0) || field.getAttribute('aria-label') || field.getAttribute('aria-labelledby') || field.getAttribute('title');
    if (!labelled) fail('etiqueta', sel(field));
  }

  const ids = new Map();
  for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) ?? 0) + 1);
  for (const [id, count] of ids) if (count > 1) fail('id', `#${id} × ${count}`);

  // ── Claves sin traducir ───────────────────────────────────────────────
  const roots = new Set(options.roots);
  const keyLike = /^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+$/;
  const walkerKeys = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walkerKeys.nextNode(); node; node = walkerKeys.nextNode()) {
    const text = node.nodeValue.trim();
    if (text.length > 80 || !keyLike.test(text) || !roots.has(text.split('.')[0])) continue;
    if (node.parentElement && visible(node.parentElement)) fail('i18n', `clave a la vista: ${text}`);
  }

  // ── Contraste ─────────────────────────────────────────────────────────
  const parse = (value) => {
    let m = value.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
    }
    m = value.match(/^color\(srgb\s+([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] === undefined ? 1 : p[3] };
    }
    return null;
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const luminance = ({ r, g, b }) => {
    const channel = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const x = luminance(a);
    const y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  /** Fondo efectivo, o `null` si por medio hay una imagen o un degradado. */
  const backgroundOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const color = parse(cs.backgroundColor);
      if (!color) return null;
      if (color.a > 0) {
        layers.push(color);
        if (color.a === 1) break;
      }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    if (layers.length && layers[layers.length - 1].a === 1) base = layers.pop();
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  /** ¿El texto va encima de una foto o un vídeo (hermano posicionado detrás)? */
  const overMedia = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const parent = e.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        if (sibling === e) continue;
        if (/^(IMG|VIDEO|PICTURE|CANVAS|IFRAME)$/.test(sibling.tagName)) return true;
        if (sibling.querySelector?.('img, video') && /absolute|fixed/.test(getComputedStyle(sibling).position)) return true;
      }
    }
    return false;
  };
  let contrastChecked = 0;
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim();
    const el = node.parentElement;
    if (text.length < 2 || !el || seen.has(el)) continue;
    seen.add(el);
    if (/^(SCRIPT|STYLE|NOSCRIPT|OPTION)$/.test(el.tagName) || !visible(el)) continue;
    // Recortado para lectores de pantalla (`u-sr-only`): no se ve, no se mide.
    const box = el.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1) continue;
    const cs = getComputedStyle(el);
    const ink = parse(cs.color);
    if (!ink || overMedia(el)) continue;
    const background = backgroundOf(el);
    if (!background) continue;
    let alpha = ink.a;
    for (let e = el; e; e = e.parentElement) alpha *= parseFloat(getComputedStyle(e).opacity);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const needed = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const got = ratio(over({ ...ink, a: alpha }, background), background);
    contrastChecked++;
    if (got + 0.02 < needed) fail('contraste', `${got.toFixed(2)}:1 (mín. ${needed}) ${Math.round(size)}px «${text.slice(0, 30)}» ${sel(el)}`);
  }

  // ── Objetivos táctiles (sólo en móvil) ────────────────────────────────
  if (options.mobile) {
    const MIN = 24;
    const targets = interactive
      .filter((el) => getComputedStyle(el).display !== 'inline')
      .map((el) => {
        const r = el.getBoundingClientRect();
        let width = r.width;
        let height = r.height;
        // Área ampliada con `::after` (mixin `tap-target`, enlaces estirados).
        const after = getComputedStyle(el, '::after');
        if (after.content !== 'none' && after.position === 'absolute') {
          width = Math.max(width, parseFloat(after.width) || 0);
          height = Math.max(height, parseFloat(after.height) || 0);
        }
        return { el, r, width, height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      });
    for (const t of targets) {
      if (t.width >= MIN - 0.5 && t.height >= MIN - 0.5) continue;
      // Excepción de separación: un círculo de 24 px centrado en el objetivo
      // no toca ningún otro objetivo.
      const crowded = targets.some((o) => {
        if (o === t || o.el.contains(t.el) || t.el.contains(o.el)) return false;
        const dx = Math.max(o.r.left - t.cx, 0, t.cx - o.r.right);
        const dy = Math.max(o.r.top - t.cy, 0, t.cy - o.r.bottom);
        return Math.hypot(dx, dy) < MIN / 2;
      });
      if (crowded) fail('táctil', `${Math.round(t.width)}×${Math.round(t.height)} px ${sel(t.el)}`);
    }
  }

  return {
    title: document.title,
    h1: h1[0]?.textContent.trim().slice(0, 60) ?? null,
    contrastChecked,
    links: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((href) => href.startsWith(location.origin)).map((href) => href.split('#')[0].split('?')[0]))],
    fallos,
  };
}
