/**
 * Carga en Node un módulo TypeScript de la app (p. ej. `core/church.config.ts`)
 * para que un script lea los datos de verdad, no con expresiones regulares.
 *
 *   import { loadTsModule } from './lib/load-ts-module.mjs';
 *   const { DEFAULT_CHURCH_CONFIG } = loadTsModule('src/app/core/church.config.ts');
 *
 * ¿Por qué no `import('…/church.config.ts')` con el type stripping de Node 24?
 * Porque Node sólo borra anotaciones: no resuelve imports sin extensión
 * (`'./social-link.model'`), no sabe que `import { SocialLink }` es un tipo (lo
 * deja, y el enlace falla con «does not provide an export named») y cargaría
 * Angular entero por un `InjectionToken`. Y con el Node 20 del PATH ni eso.
 *
 * Aquí cada fichero pasa por `ts.transpileModule` —el `typescript` del proyecto,
 * el mismo que compila la app—, que quita tipos e imports de sólo tipos igual
 * que el build, y se evalúa como CommonJS con un `require` propio:
 *   · imports relativos como los resuelve el bundler: `./x` → `./x.ts`,
 *     `./x/index.ts`, `./x.js` → `./x.ts`, y `.json`;
 *   · los paquetes de `stubs` se sustituyen (por defecto `@angular/core`, del que
 *     un fichero de datos sólo usa `InjectionToken`);
 *   · el resto, con el `require` de Node desde el propio fichero.
 * Sin flags ni APIs experimentales: vale igual en Node 20, 22, 24 o 26.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

/** `@angular/core` mínimo: un fichero de configuración sólo declara su token. */
export const ANGULAR_CORE_STUB = Object.freeze({
  InjectionToken: class InjectionToken {
    constructor(description) {
      this.description = description;
    }
    toString() {
      return `InjectionToken ${this.description}`;
    }
  },
});

const DEFAULT_STUBS = Object.freeze({ '@angular/core': ANGULAR_CORE_STUB });

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  // `import datos from './x.json'` → el objeto entero, como en el build.
  esModuleInterop: true,
};

const isFile = (path) => existsSync(path) && statSync(path).isFile();

/** Fichero de un import relativo, como lo resolvería el bundler. */
function resolveSource(base) {
  const candidates = [base, `${base}.ts`, join(base, 'index.ts'), base.replace(/\.(m?)js$/, '.$1ts')];
  const found = candidates.find(isFile);
  if (!found) throw new Error(`No se encuentra el módulo ${base} (probado: .ts, /index.ts)`);
  return found;
}

/** Transpila a CommonJS; un error de sintaxis se cuenta con su línea del .ts. */
function transpile(path) {
  const { outputText, diagnostics = [] } = ts.transpileModule(readFileSync(path, 'utf8'), {
    fileName: path,
    compilerOptions: COMPILER_OPTIONS,
    reportDiagnostics: true,
  });
  const syntax = diagnostics.find((d) => d.file && d.category === ts.DiagnosticCategory.Error);
  if (syntax) {
    const { line, character } = syntax.file.getLineAndCharacterOfPosition(syntax.start ?? 0);
    const message = ts.flattenDiagnosticMessageText(syntax.messageText, '\n');
    throw new Error(`${path}:${line + 1}:${character + 1} ${message}`);
  }
  return outputText;
}

/**
 * Evalúa `file` (y lo que importe) y devuelve sus exports. Cada llamada empieza
 * de cero: si el fichero ha cambiado en disco, se lee el nuevo.
 *
 * @param {string} file Ruta del `.ts` (relativa al directorio actual o absoluta).
 * @param {{ stubs?: Record<string, unknown> }} [options] Paquetes a sustituir.
 */
export function loadTsModule(file, { stubs = DEFAULT_STUBS } = {}) {
  const modules = new Map();

  const load = (path) => {
    const cached = modules.get(path);
    if (cached) return cached.exports; // ciclo o repetido: como en CommonJS
    const module = { exports: {} };
    modules.set(path, module);
    if (path.endsWith('.json')) {
      module.exports = JSON.parse(readFileSync(path, 'utf8'));
      return module.exports;
    }
    const nodeRequire = createRequire(path);
    const requireFrom = (specifier) => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.startsWith('.')) return load(resolveSource(resolve(dirname(path), specifier)));
      return nodeRequire(specifier);
    };
    const run = compileFunction(transpile(path), ['exports', 'require', 'module', '__filename', '__dirname'], {
      filename: path,
    });
    run(module.exports, requireFrom, module, path, dirname(path));
    return module.exports;
  };

  return load(resolve(file));
}
