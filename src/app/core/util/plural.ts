/**
 * Categoría plural de un número para elegir la clave de traducción:
 * `one` · `few` (rumano: 2–19, «5 versete») · `other` («26 de versete»).
 * Las reglas salen de `Intl.PluralRules` del idioma; `two`/`many`/`zero` no se
 * usan en ro ni es y caen en `other`.
 */
export function pluralKey(rules: Intl.PluralRules, count: number): 'one' | 'few' | 'other' {
  const rule = rules.select(count);
  return rule === 'one' || rule === 'few' ? rule : 'other';
}
