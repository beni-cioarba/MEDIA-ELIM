# 60 · Convenciones de código

## Componentes

```ts
@Component({
  selector: 'app-x',
  imports: [TranslatePipe, /* … */],            // standalone es lo implícito en Angular ≥ 19
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './x.component.html',   // inline sólo si < ~40 líneas
})
export class XComponent {
  private readonly service = inject(SomeService);   // siempre inject(), no constructor
  readonly title = input.required<string>();        // entradas como signals (input()), no @Input
  protected readonly items = computed(() => …);     // protected si sólo lo usa la plantilla
}
```

- Standalone (implícito) y `OnPush` **siempre**. Nada de `NgModule` ni
  `standalone: true` (Angular 22 lo da por hecho; la migración lo quitó).
- Traducciones en plantilla: `TranslatePipe` (ngx-translate 18 ya no tiene
  `TranslateModule`); en código, `TranslateService.instant/stream`,
  `getCurrentLang()`/`getFallbackLang()` (no `currentLang`/`defaultLang`).
- Inicializadores: `provideAppInitializer(() => inject(X).init())`, no
  `APP_INITIALIZER`.
- Entradas nuevas con `input()` / `input.required()`; las `@Input` que quedan
  son heredadas y se migran al tocar el componente.
- Inyección con `inject()`, campos `readonly`.
- Visibilidad: `private` para uso interno, `protected` para la plantilla,
  `public` sólo para API consumida por otro componente.
- Limpieza con `inject(DestroyRef).onDestroy(...)`, nunca `ngOnDestroy` manual
  para temporizadores.

## Estado

- `signal()` para estado propio, `computed()` para derivados, `effect()` para
  efectos colaterales (con `{ allowSignalWrites: true }` sólo si es imprescindible).
- Nada de `BehaviorSubject` ni `async` pipe para estado local.
- Exponer señales de sólo lectura: `readonly x = this._x.asReadonly()`.
- **Los cálculos derivados van en servicios**, no en componentes: si dos
  bloques necesitan el mismo dato, crea un `computed` en `core/services/`.

## Temporizadores

Usa `ClockService.pageVisible` como guarda; no leas `document.hidden` a mano.
Para cadencias propias, declara una constante nombrada en el módulo:

```ts
const HIGHLIGHT_ROTATION_MS = 4_000;
```

Nada de números mágicos sueltos.

## Plantillas

- Control de flujo nuevo: `@if`, `@for` (con `track` obligatorio), `@switch`.
- `@defer` para contenido pesado no crítico (ej. el QR).
- Textos: siempre `| translate`.
- Accesibilidad: `aria-label` traducido, `role` correcto, `aria-hidden` en
  decoración, `aria-current` en el elemento del día actual.

## TypeScript

`strict`, `strictTemplates`, `noPropertyAccessFromIndexSignature`,
`noImplicitReturns`. No uses `any` ni `!`; si es inevitable, justifícalo en un
comentario en la línea anterior.

## Persistencia

`localStorage` siempre entre `try/catch` y con guarda
`typeof localStorage === 'undefined'` (modo privado / SSR futuro). Claves con
prefijo `iglesia-redes.`:

| Clave                                  | Contenido                          |
| -------------------------------------- | ---------------------------------- |
| `iglesia-redes.lang`                   | Idioma elegido                     |
| `iglesia-redes.presentation.blocks`    | Overrides manuales de bloques      |

## Idioma del código

- Identificadores y tipos en **inglés**.
- Comentarios y documentación en **español**.
- Los textos de la iglesia (títulos de servicios) están en rumano dentro de
  `church.config.ts`: es intencionado, no los traduzcas.

## Recetas rápidas

| Quiero…                          | Ver                                    |
| -------------------------------- | -------------------------------------- |
| Añadir una ruta/sección          | `docs/ai/10-architecture.md`           |
| Añadir un bloque proyectable     | `docs/ai/30-presentation.md`           |
| Añadir contenido o traducciones  | `docs/ai/20-content-i18n.md`           |
| Tocar estilos                    | `docs/ai/40-styling.md`                |

## Antes de dar por terminado un cambio

1. `npm run build` sin errores y sin superar presupuestos (el `prebuild` ya
   ejecuta `npm run check`: paridad i18n + presupuesto de proyección).
2. Claves i18n presentes en `es.json` **y** `ro.json`.
3. Verificado en modo presentación (tecla `F`), no sólo en la web pública.
4. **Responsive al 100 %**: `scripts/responsive-audit.snippet.js` en 320 · 375 ·
   768 · 1024 · 1280 sobre cada ruta tocada devuelve `ok` (procedimiento en
   `docs/ai/40-styling.md` → «Responsive»).
5. Shard de `docs/ai/` actualizado si cambió arquitectura, contenido o presentación.
