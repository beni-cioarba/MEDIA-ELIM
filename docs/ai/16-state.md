# 16 · Estado

> Lee este shard antes de crear cualquier servicio con estado o de meter un
> `signal` compartido en un sitio raro.

## Regla de decisión

| Alcance del estado                        | Herramienta                                   |
| ----------------------------------------- | --------------------------------------------- |
| Sólo dentro de un componente              | `signal()` / `computed()` en el componente     |
| Compartido y **simple** (1-3 valores)     | Servicio `providedIn: 'root'` con signals      |
| Compartido y **con reglas** (≥4 valores, transiciones, invariantes) | **SignalStore** de `@ngrx/signals` |
| Derivado de otro estado                   | `computed()`. Nunca dupliques la fuente.       |
| Efectos externos (DOM, storage, timers)   | `effect()` — con `{ allowSignalWrites: true }` sólo si escribe signals |

No hay Redux clásico en el proyecto **a propósito**: no tenemos estado de
servidor, ni undo/redo, ni time-travel. `@ngrx/signals` da la misma
disciplina (estado inmutable, métodos como únicas transiciones,
derivaciones explícitas) por ~4 kB en vez de ~35 kB.

## Stores existentes

### `core/state/ui.store.ts` — `UiStore`

Estado de chrome de la aplicación, no de dominio.

```ts
{ drawerOpen: boolean, openGroup: string | null, scrolled: boolean }
```

- `anyMenuOpen` (computed)
- `openDrawer()` / `closeDrawer()` / `toggleDrawer()`
- `toggleGroup(id)` / `closeAll()`
- `setScrollY(y)` — umbral en `SCROLL_THRESHOLD`

Se cierra solo en cada `NavigationEnd` (lo hace `TopNavComponent`).

### Servicios con signals (no necesitan store)

`PresentationService`, `CarouselService`, `PresentationBlocksService`,
`ScheduleService`, `ClockService`, `LanguageService`, `YouTubeService`.
Están bien como están: no los migres a SignalStore «por consistencia».

## Cómo crear un store nuevo

```ts
export const FooStore = signalStore(
  { providedIn: 'root' },
  withState<FooState>(initialState),
  withComputed(({ a, b }) => ({ total: computed(() => a() + b()) })),
  withMethods((store) => ({
    setA(a: number): void { patchState(store, { a }); },
  })),
);
```

Reglas:

- El estado es **plano y serializable**. Nada de instancias de clase.
- Sólo se muta con `patchState` dentro de `withMethods`. Los componentes
  llaman métodos, nunca escriben estado.
- Nada de `subscribe` dentro del store: si necesitas RxJS, usa
  `rxMethod` o convierte con `toSignal` en el borde.
- Un store por área. Si un store supera ~8 campos, pártelo.

## Registro y logs

Nada de `console.*` suelto. Usa `LoggerService`:

```ts
private readonly log = inject(LoggerService).prefix('youtube');
this.log.warn('respuesta inesperada', err);
```

En producción sólo se emiten `warn` y `error`.
