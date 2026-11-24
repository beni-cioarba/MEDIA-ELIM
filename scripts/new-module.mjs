/**
 * Crea un módulo nuevo de la web con todo lo que necesita, ya conectado.
 *
 *   node scripts/new-module.mjs <id> [--path <segmento>] [--title "Título ro"] [--title-es "Título es"]
 *
 *   <id>       carpeta y nombre, en kebab-case: `rugaciuni`, `scoala-duminicala`
 *   --path     segmento de URL (por defecto, el id)
 *
 * Deja hecho:
 *   · `src/app/features/<id>/<id>.pages.ts`      página y SEO (datos puros)
 *   · `src/app/features/<id>/<id>.routes.ts`     ruta perezosa con `pageRoute`
 *   · `src/app/features/<id>/<id>.component.ts`  página con cabecera y una sección
 *   · `APP_PATHS.<camelId>` en `core/navigation/app-paths.ts`
 *   · su línea en `app.routes.ts` (import + `MODULES`)
 *   · textos `seo.<clave>.*` y `<clave>.*` en `ro.json` y `es.json`
 *
 * Con eso la página existe, se precarga, tiene título y descripción, sale en
 * el sitemap, tiene página estática en el despliegue y se encuentra en el
 * buscador de la cabecera (`docs/ai/78-search.md`). Lo que queda es
 * **decisión editorial**, no fontanería: si va en el menú (una entrada en
 * `core/navigation/navigation.config.ts`) y su contenido.
 *
 * Comprobación al final: `npm run check` (paridad i18n, fronteras, tests).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const id = args[0];
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error('Uso: node scripts/new-module.mjs <id-en-kebab-case> [--path <segmento>] [--title "…"] [--title-es "…"]');
  process.exit(1);
}

const segment = option('path') ?? id;
const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = camel[0].toUpperCase() + camel.slice(1);
const constant = id.replace(/-/g, '_').toUpperCase();
const i18nKey = id.replace(/-/g, '_');
const titleRo = option('title') ?? pascal;
const titleEs = option('title-es') ?? titleRo;

const DIR = join('src/app/features', id);
const APP_PATHS_FILE = 'src/app/core/navigation/app-paths.ts';
const ROUTES_FILE = 'src/app/app.routes.ts';

// ── Comprobaciones antes de tocar nada ────────────────────────────────
const appPaths = readFileSync(APP_PATHS_FILE, 'utf8');
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};
if (existsSync(DIR)) fail(`ya existe ${DIR}`);
if (new RegExp(`^\\s+${camel}:`, 'm').test(appPaths)) fail(`APP_PATHS ya tiene «${camel}»`);
if (new RegExp(`:\\s*'${segment}'`).test(appPaths)) fail(`el segmento «${segment}» ya lo usa otra ruta`);

/** Escribe conservando el fin de línea del fichero existente. */
const save = (file, text) => {
  let crlf = false;
  try {
    crlf = readFileSync(file, 'utf8').includes('\r\n');
  } catch {
    /* nuevo */
  }
  writeFileSync(file, crlf ? text.replace(/\r?\n/g, '\r\n') : text);
};

// ── Ficheros del módulo ───────────────────────────────────────────────
mkdirSync(DIR, { recursive: true });

save(
  join(DIR, `${id}.pages.ts`),
  `import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** ${titleRo}. Datos puros: los lee también \`scripts/generate-route-pages.mjs\`. */
export const ${constant}_PAGES = definePages({
  main: { path: APP_PATHS.${camel}, seo: { titleKey: 'seo.${i18nKey}.title', descriptionKey: 'seo.${i18nKey}.description' } },
});
`,
);

save(
  join(DIR, `${id}.routes.ts`),
  `import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { ${constant}_PAGES } from './${id}.pages';

export const ${constant}_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(${constant}_PAGES.main, {
      loadComponent: () => import('./${id}.component').then((m) => m.${pascal}Component),
    }),
  ],
};
`,
);

save(
  join(DIR, `${id}.component.ts`),
  `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';

/**
 * ${titleRo} — página \`/${segment}\`.
 *
 * Creada con \`scripts/new-module.mjs\`. Los textos van en \`${i18nKey}.*\`
 * (\`ro.json\` y \`es.json\`); si crecen y sólo los usa esta página, a su
 * paquete (\`core/i18n/route-packs.ts\`). Los datos, en \`core/content/\`.
 */
@Component({
  selector: 'app-${id}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, PageSectionComponent],
  template: \`
    <header class="page-hero">
      <div class="page-hero__inner">
        <h1 class="page-hero__title">{{ '${i18nKey}.title' | translate }}</h1>
        <p class="page-hero__lead">{{ '${i18nKey}.lead' | translate }}</p>
      </div>
    </header>

    <app-page-section>
      <p>{{ '${i18nKey}.lead' | translate }}</p>
    </app-page-section>
  \`,
  styles: \`
    @use 'ds' as *;
    @use '../../shared/styles/page-hero' as *;

    :host {
      display: block;
    }
  \`,
})
export class ${pascal}Component {}
`,
);

// ── APP_PATHS ─────────────────────────────────────────────────────────
const start = appPaths.indexOf('export const APP_PATHS');
const close = appPaths.indexOf('} as const;', start);
save(APP_PATHS_FILE, `${appPaths.slice(0, close)}  ${camel}: '${segment}',\n${appPaths.slice(close)}`);

// ── app.routes.ts: import + línea en MODULES ──────────────────────────
let routes = readFileSync(ROUTES_FILE, 'utf8').replace(/\r\n/g, '\n');
const importLine = `import { ${constant}_ROUTES } from './features/${id}/${id}.routes';\n`;
const layoutImport = "import { MainLayoutComponent } from './layout/main-layout/main-layout.component';";
if (!routes.includes(layoutImport)) fail('no encuentro el import de MainLayoutComponent en app.routes.ts');
routes = routes.replace(layoutImport, importLine + layoutImport);
const modulesEnd = routes.indexOf('];', routes.indexOf('const MODULES'));
if (modulesEnd < 0) fail('no encuentro MODULES en app.routes.ts');
routes = `${routes.slice(0, modulesEnd)}  ${constant}_ROUTES,\n${routes.slice(modulesEnd)}`;
save(ROUTES_FILE, routes);

// ── Textos ────────────────────────────────────────────────────────────
for (const [lang, title, lead, description] of [
  ['ro', titleRo, 'Textul de prezentare al paginii.', `${titleRo} · Biserica Elim Arganda.`],
  ['es', titleEs, 'Texto de presentación de la página.', `${titleEs} · Iglesia Elim Arganda.`],
]) {
  const file = `src/assets/i18n/${lang}.json`;
  const dict = JSON.parse(readFileSync(file, 'utf8'));
  dict.seo[i18nKey] = { title, description };
  dict[i18nKey] = { title, lead };
  save(file, `${JSON.stringify(dict, null, 2)}\n`);
}

console.log(`✓ Módulo «${id}» creado en /${segment}:
    ${DIR}/${id}.pages.ts · ${id}.routes.ts · ${id}.component.ts
    APP_PATHS.${camel} · app.routes.ts (${constant}_ROUTES) · seo.${i18nKey}.* y ${i18nKey}.* en ro/es
  Falta (decisión tuya): textos de verdad y, si va en el menú, su entrada en
  core/navigation/navigation.config.ts. Después: npm run check.`);
