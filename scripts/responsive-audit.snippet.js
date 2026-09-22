// Auditoría responsive — snippet para la consola del navegador (o para la
// herramienta de navegador de la IA). No es un script de Node: se pega tal cual
// en DevTools con la página cargada y devuelve un informe compacto.
//
// Qué detecta, en el ancho actual del viewport:
//  1. `hScroll`     — scroll horizontal de página (el fallo más grave).
//  2. `overflowing` — elementos visibles que sobresalen del viewport sin que
//                     ningún ancestro los recorte.
//  3. `overlaps`    — hermanos con texto que se pisan dentro de un flex/grid
//                     (el síntoma de `min-width: 0` mal puesto o de `nowrap`).
//  4. `nowrap`      — textos `white-space: nowrap` que desbordan su caja sin
//                     puntos suspensivos (se recortan o se pintan encima).
//
// Cómo se usa (procedimiento de `docs/ai/40-styling.md` → «Responsive»):
//   - Anchos obligatorios: 320 · 375 · 768 · 1024 · 1280 (y 1920 en proyección).
//   - Pegar el snippet; después `await __auditFn()` en cada ruta, o
//     `await __runAll(['/', '/anunturi', ...])` para recorrerlas sin recargar
//     (navega con el router, así los helpers sobreviven).
//   - Recorre la página entera antes de medir para que los `@defer (on viewport)`
//     se monten (pie, galería…).
//   - Falsos positivos conocidos: `.u-sr-only` (oculto a propósito) y
//     `.footer__version` (contiene el tooltip absoluto).
(() => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return el.tagName.toLowerCase() + cls;
  };
  const ignored = (el) => /u-sr-only|footer__version/.test(String(el.className));

  window.__auditFn = async () => {
    const se = document.scrollingElement;
    for (let y = 0; y <= se.scrollHeight; y += Math.max(300, innerHeight * 0.8)) {
      se.scrollTo({ top: y, behavior: 'instant' });
      await wait(100);
    }
    se.scrollTo({ top: 0, behavior: 'instant' });
    await wait(250);

    const vw = innerWidth;
    const all = [...document.querySelectorAll('body *')].filter(visible);

    const overflowing = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 && r.left >= -1) continue;
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) {
        if (/hidden|auto|scroll|clip/.test(getComputedStyle(p).overflowX)) { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped) overflowing.push(`${label(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }

    const overlaps = [];
    for (const c of all) {
      if (c.children.length < 2 || !/flex|grid/.test(getComputedStyle(c).display)) continue;
      const kids = [...c.children].filter(visible).filter((k) => !/absolute|fixed/.test(getComputedStyle(k).position));
      for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 && oy > 4 && (kids[i].textContent.trim() || kids[j].textContent.trim())) {
          overlaps.push(`${label(c)} > ${label(kids[i])} × ${label(kids[j])} (${Math.round(ox)}×${Math.round(oy)})`);
        }
      }
    }

    const nowrap = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim()
          && cs.textOverflow !== 'ellipsis' && !ignored(el)) {
        nowrap.push(`${label(el)} (${el.scrollWidth}>${el.clientWidth})`);
      }
    }

    return {
      url: location.pathname,
      vw,
      hScroll: se.scrollWidth > se.clientWidth ? `${se.scrollWidth} > ${se.clientWidth}` : null,
      overflowing: [...new Set(overflowing)].slice(0, 10),
      overlaps: [...new Set(overlaps)].slice(0, 10),
      nowrap: [...new Set(nowrap)].slice(0, 10),
    };
  };

  window.__go = async (path) => {
    history.pushState(null, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
    await wait(1500);
  };

  window.__runAll = async (paths) => {
    const out = [];
    for (const p of paths) {
      await window.__go(p);
      const r = await window.__auditFn();
      const dirty = r.hScroll || r.overflowing.length || r.overlaps.length || r.nowrap.length;
      out.push(dirty ? r : { url: r.url, ok: true });
    }
    return out;
  };

  return 'listo: await __auditFn()  ·  await __runAll([rutas])';
})();
