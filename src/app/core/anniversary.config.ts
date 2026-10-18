import type { BrandSeal } from '../shared/brand-logo/brand-logo.component';

/**
 * Sello de aniversario junto a la marca (cabecera y pie) — **temporal**.
 *
 * Mientras la fecha de hoy cae dentro de `[from, until]` (ambos inclusive, hora
 * local del visitante), `app-brand-logo` pinta un «25» dorado a la izquierda
 * de «ELIM / ARGANDA DEL REY». Fuera de la ventana desaparece solo: no hay que
 * tocar código para retirarlo. Para otra celebración basta con cambiar estos
 * datos. Diseño y medidas: `brand-logo/README.md` → «Sello».
 */
export const ANNIVERSARY = {
  /** 25 años de la iglesia (2001–2026); el culto de aniversario fue el 18/10/2026. */
  seal: { value: '25', label: 'Aniversare' } satisfies BrandSeal,
  from: '2026-10-01',
  until: '2026-12-31',
} as const;

/** El sello vigente hoy, o `null` fuera de la ventana. Fechas ISO: se comparan como texto. */
export function activeBrandSeal(today: Date = new Date()): BrandSeal | null {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return iso >= ANNIVERSARY.from && iso <= ANNIVERSARY.until ? ANNIVERSARY.seal : null;
}
