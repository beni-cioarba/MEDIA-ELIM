import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { DocTocComponent, TocEntry } from '../../shared/doc-toc/doc-toc.component';
import { DockActionsService } from '../../shared/floating-actions/dock-actions.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { CREDO_ANCHOR as ANCLA, CREDO_ARTICLE_COUNT, CREDO_PARTS, CredoArticle } from './credo.data';

/** Un artículo ya resuelto para pintar: textos traducidos y estado de apertura. */
interface ArticleView {
  readonly id: string;
  /** `id` del elemento en el documento, y destino del índice. */
  readonly anchor: string;
  readonly n: number;
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly refs: string;
}

/** Una parte con sus artículos ya filtrados. */
interface PartView {
  readonly id: string;
  readonly numeral: string;
  readonly name: string;
  readonly description: string;
  readonly articles: readonly ArticleView[];
}

/** Prefijo del `id` de un artículo. Evita chocar con el `id` de la parte. */


/**
 * Confesión de fe completa (30 artículos en cuatro partes).
 *
 * ── Cómo está montada la página ───────────────────────────────────────
 * Es un **documento de consulta**, no una página de lectura corrida, así que
 * se monta como tal: índice lateral con seguimiento del apartado activo
 * (`shared/doc-toc`, medido sobre el «On this page» de `angular.dev`), barra
 * de herramientas con buscador y despliegue masivo, y un artículo por
 * `<details>` nativo —accesible, indexable y sin JavaScript—.
 *
 * ── Lo que se quitó, y por qué ────────────────────────────────────────
 * Había un «Cuprins» arriba, en tarjetas, con las cuatro partes. Sobra desde
 * que hay índice lateral: repetía lo mismo, ocupaba una pantalla entera antes
 * del primer artículo y, al ser un salto de ida sin vuelta, obligaba a subir
 * hasta arriba cada vez que querías cambiar de parte.
 *
 * También se dejaron de usar las secciones alternas con tinte: pintaban cada
 * parte como una banda a todo el ancho, lo que no se puede compaginar con un
 * documento a dos columnas.
 *
 * ── El buscador ───────────────────────────────────────────────────────
 * No es un adorno: son 30 artículos de texto denso y la consulta típica es
 * «¿qué dice esto sobre el bautismo?». Filtra por rótulo, afirmación, cuerpo
 * y referencias, y **abre los artículos que coinciden**, porque un resultado
 * plegado no es un resultado.
 *
 * Todo el texto vive en `credo.*`; la estructura, en `credo.data.ts`.
 */
@Component({
  selector: 'app-credo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, DocTocComponent, IconComponent],
  templateUrl: './credo.component.html',
  styleUrl: './credo.component.scss',
})
export class CredoComponent {
  private readonly translate = inject(TranslateService);

  protected readonly total = CREDO_ARTICLE_COUNT;
  protected readonly partCount = CREDO_PARTS.length;

  protected readonly links = {
    about: `/${APP_PATHS.about}`,
    leadership: `/${APP_PATHS.leadership}`,
  } as const;

  // ── Buscador ─────────────────────────────────────────────────────────

  protected readonly query = signal('');
  private readonly buscador = viewChild<ElementRef<HTMLInputElement>>('buscador');

  /**
   * Texto normalizado para comparar: sin mayúsculas y **sin diacríticos**.
   *
   * Es obligatorio en los dos idiomas de esta página: en rumano nadie escribe
   * «sfințirea» con la coma debajo de la t en un buscador, y en castellano
   * «salvacion» tiene que encontrar «salvación». Sin esto el buscador parece
   * roto justo en las palabras que más se buscan.
   */
  private normalizar(texto: string): string {
    return texto
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  /** Todos los artículos con sus textos ya traducidos. */
  private readonly todos = computed<readonly (ArticleView & { readonly partId: string })[]>(() => {
    // `currentLang` entra en la dependencia para que al cambiar de idioma se
    // recalculen los textos (el pipe `translate` no alcanza a un `computed`).
    this.translate.currentLang();
    return CREDO_PARTS.flatMap((part) =>
      part.articles.map((article) => ({
        ...this.resolver(article),
        partId: part.id,
      })),
    );
  });

  private resolver(article: CredoArticle): ArticleView {
    const base = `credo.articles.${article.id}.`;
    return {
      id: article.id,
      anchor: ANCLA + article.id,
      n: article.n,
      short: this.translate.instant(base + 'short'),
      title: this.translate.instant(base + 'title'),
      body: this.translate.instant(base + 'body'),
      refs: this.translate.instant(base + 'refs'),
    };
  }

  /** Las partes con sus artículos, ya filtradas por la búsqueda. */
  protected readonly parts = computed<readonly PartView[]>(() => {
    this.translate.currentLang();
    const busqueda = this.normalizar(this.query().trim());
    const todos = this.todos();

    return CREDO_PARTS.map((part) => {
      const articles = todos
        .filter((a) => a.partId === part.id)
        .filter(
          (a) =>
            !busqueda ||
            this.normalizar(`${a.short} ${a.title} ${a.body} ${a.refs}`).includes(busqueda),
        );

      return {
        id: part.id,
        numeral: part.numeral,
        name: this.translate.instant(`credo.parts.${part.id}.name`),
        description: this.translate.instant(`credo.parts.${part.id}.description`),
        articles,
      };
    }).filter((part) => part.articles.length > 0);
  });

  /** Cuántos artículos quedan tras el filtro. */
  protected readonly matchCount = computed(() =>
    this.parts().reduce((total, part) => total + part.articles.length, 0),
  );

  protected readonly filtrando = computed(() => this.query().trim().length > 0);

  protected alBuscar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.query.set(valor);
    // Un resultado plegado no es un resultado: se abren las coincidencias
    // para que se vea **por qué** ha coincidido cada artículo.
    this.abiertos.set(valor.trim() ? new Set(this.todosLosAnclajesVisibles()) : new Set());
  }

  protected limpiar(): void {
    this.query.set('');
    this.abiertos.set(new Set());
    this.buscador()?.nativeElement.focus();
  }

  /**
   * `/` lleva el foco al buscador, como en cualquier documentación.
   *
   * Se ignora si ya se está escribiendo en un campo: si no, no se podría
   * teclear una barra dentro del propio buscador.
   */
  @HostListener('document:keydown', ['$event'])
  protected atajo(evento: KeyboardEvent): void {
    if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const activo = document.activeElement;
    if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) return;
    evento.preventDefault();
    this.buscador()?.nativeElement.focus();
  }

  // ── Apertura de los artículos ────────────────────────────────────────

  /**
   * Anclajes de los artículos abiertos.
   *
   * El estado vive aquí y no en el DOM porque hay tres cosas que abren y
   * cierran artículos —el propio `<summary>`, los botones de desplegar todo y
   * el índice al saltar a uno— y las tres tienen que ver el mismo estado. El
   * `<details>` sigue siendo nativo: `[open]` se ata a este conjunto y
   * `(toggle)` lo devuelve.
   */
  protected readonly abiertos = signal<ReadonlySet<string>>(new Set());

  private todosLosAnclajesVisibles(): string[] {
    return this.parts().flatMap((part) => part.articles.map((a) => a.anchor));
  }

  protected estaAbierto(anchor: string): boolean {
    return this.abiertos().has(anchor);
  }

  /** Sincroniza el conjunto con lo que el usuario acaba de hacer en el `<details>`. */
  protected alAlternar(anchor: string, evento: Event): void {
    const abierto = (evento.target as HTMLDetailsElement).open;
    this.abiertos.update((previos) => {
      if (previos.has(anchor) === abierto) return previos;
      const siguiente = new Set(previos);
      if (abierto) siguiente.add(anchor);
      else siguiente.delete(anchor);
      return siguiente;
    });
  }

  protected desplegarTodo(): void {
    this.abiertos.set(new Set(this.todosLosAnclajesVisibles()));
  }

  protected plegarTodo(): void {
    this.abiertos.set(new Set());
  }

  /** ¿Están todos los artículos visibles abiertos? Decide qué botón mostrar. */
  protected readonly todoAbierto = computed(() => {
    const visibles = this.parts().flatMap((p) => p.articles.map((a) => a.anchor));
    const abiertos = this.abiertos();
    return visibles.length > 0 && visibles.every((a) => abiertos.has(a));
  });

  // ── Índice ───────────────────────────────────────────────────────────

  /**
   * Entradas del índice: las partes en primer nivel y sus artículos en el
   * segundo. Sigue al filtro, así que buscar reduce también el índice — que
   * es lo que lo hace útil como lista de resultados.
   */
  protected readonly tocEntries = computed<readonly TocEntry[]>(() =>
    this.parts().flatMap((part) => [
      { id: part.id, label: part.name, level: 1 as const, badge: part.numeral },
      ...part.articles.map((article) => ({
        id: article.anchor,
        label: article.short,
        level: 2 as const,
        badge: String(article.n),
      })),
    ]),
  );

  /**
   * El índice avisa antes de desplazar: si el destino es un artículo, se abre.
   * Sin esto el salto te deja delante de un título plegado y hay que pulsarlo
   * otra vez para ver el texto que venías a leer.
   */
  protected alElegirDelIndice(id: string): void {
    // Ya has llegado a donde ibas: el panel sobra y taparía el destino.
    this.panelAbierto.set(false);
    document.body.classList.remove('has-doc-panel');
    if (!id.startsWith(ANCLA)) return;
    this.abiertos.update((previos) => new Set(previos).add(id));
  }

  // ── Panel de controles del teléfono ──────────────────────────────────

  /** ¿Está abierto el panel inferior (buscador + desplegar + índice)? */
  protected readonly panelAbierto = signal(false);

  /**
   * Abre o cierra el panel inferior.
   *
   * Al abrir **lleva el foco dentro**: el botón que lo abre vive en el dock,
   * al final del documento, así que quien navega con teclado abriría el panel
   * y seguiría fuera de él. Al cerrar con `Escape` el foco vuelve al botón,
   * que es de donde salió.
   */
  protected alternarPanel(): void {
    const abierto = !this.panelAbierto();
    this.panelAbierto.set(abierto);
    // El dock vive fuera de esta página: se avisa por el `body`, que es el
    // único antecesor común (ver `styles/_base.scss`).
    document.body.classList.toggle('has-doc-panel', abierto);
    if (abierto) {
      /*
       * Hay que esperar a que Angular quite la clase que oculta el panel: un
       * elemento en `display: none` no acepta el foco.
       *
       * **Con `setTimeout(0)`, no con `requestAnimationFrame`.** Escribir una
       * señal programa la detección de cambios como microtarea, así que una
       * macrotarea llega siempre después; y `rAF` no corre cuando el
       * navegador tiene la pestaña en segundo plano —el mismo tropiezo que ya
       * dejó el índice sin desplazar (decisión 38 de 47-design-language.md)—.
       */
      setTimeout(() => this.toc()?.enfocarCompacto());
    }
  }

  /** `Escape` lo cierra, como cualquier capa que se abre encima. */
  @HostListener('document:keydown.escape')
  protected cerrarPanel(): void {
    if (!this.panelAbierto()) return;
    this.panelAbierto.set(false);
    document.body.classList.remove('has-doc-panel');
    // El foco vuelve al botón que lo abrió, no se queda en el vacío.
    document.querySelector<HTMLElement>('.dock__btn--page')?.focus();
  }

  // ── Enlace permanente ────────────────────────────────────────────────

  /** Anclaje cuyo enlace se acaba de copiar (para la confirmación). */
  protected readonly copiado = signal<string | null>(null);
  private tiempoCopiado: ReturnType<typeof setTimeout> | null = null;

  /**
   * Copia la dirección completa del artículo.
   *
   * El `#N` era un enlace normal: pulsarlo cambiaba el ancla y ya. Pero lo que
   * se quiere hacer con un enlace permanente es **pasarlo**, y para eso había
   * que ir a la barra de direcciones a copiarlo a mano. Ahora se copia al
   * pulsar y se confirma en el sitio.
   *
   * Sigue siendo un `<a href="#…">`: el menú contextual del navegador y la
   * navegación sin JavaScript no se pierden. Si el portapapeles falla o no
   * está disponible (contexto no seguro), se deja pasar el clic y el enlace
   * se comporta como siempre.
   */
  /**
   * `href` del enlace permanente, **con la ruta delante**.
   *
   * Con `<base href="/">` en el documento, un `href="#art-x"` se resuelve
   * contra la base y no contra la dirección actual: pulsarlo llevaba a
   * `/#art-x`, que con la ruta comodín de la app (`** → ''`) acababa
   * enseñando la portada. Un enlace permanente que te saca del documento es
   * exactamente lo contrario de un enlace permanente.
   */
  protected enlaceA(anchor: string): string {
    return `${location.pathname}${location.search}#${anchor}`;
  }

  protected async copiarEnlace(evento: Event, anchor: string): Promise<void> {
    const enlace = new URL(`#${anchor}`, location.href).href;
    try {
      await navigator.clipboard.writeText(enlace);
    } catch {
      return; // Sin portapapeles: el `<a>` hace su trabajo de siempre.
    }

    evento.preventDefault();
    // El ancla se actualiza igualmente, para que la barra de direcciones
    // coincida con lo que se acaba de copiar. Con la ruta entera: una URL
    // relativa se resolvería contra el `<base href="/">` y borraría la ruta.
    history.replaceState(null, '', `${location.pathname}${location.search}#${anchor}`);

    this.copiado.set(anchor);
    if (this.tiempoCopiado !== null) clearTimeout(this.tiempoCopiado);
    this.tiempoCopiado = setTimeout(() => this.copiado.set(null), 1800);
  }

  // ── Enlaces directos a un artículo ───────────────────────────────────

  private readonly toc = viewChild(DocTocComponent);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    /*
     * Aviso al layout de que esta página lleva barra fija abajo, para que el
     * dock flotante (compartir / volver arriba) se aparte y no se siente
     * encima de sus controles. La regla vive en `styles/_base.scss`: el dock
     * no desciende de esta página, así que la variable tiene que declararse
     * en un antecesor común, y ése es el `body`.
     */
    /*
     * Sin columna lateral (por debajo de 1280) los controles del documento
     * —buscador, desplegar todo e índice— **no ocupan pantalla**: viven en un
     * panel que se abre desde el dock flotante, con un solo botón.
     *
     * La alternativa era dejarlos en una barra fija abajo, y se descartó por
     * lo que cuesta: 55 px de franja permanente en una pantalla de 844, para
     * unos controles que se usan a ratos. Así el coste en reposo es cero y
     * siguen a un toque, al alcance del pulgar.
     *
     * El icono es una lista con la última línea corta: se distingue de la
     * hamburguesa de la cabecera, que son tres líneas iguales.
     */
    const dock = inject(DockActionsService);
    dock.set([
      {
        id: 'credo-panel',
        labelKey: 'credo.tools.panel',
        svgPath: 'M4 7h16M4 12h16M4 17h9',
        pressed: this.panelAbierto,
        compactOnly: true,
        run: () => this.alternarPanel(),
      },
    ]);

    const destroyRef = inject(DestroyRef);
    // Si no se limpia, el botón se queda en el dock del resto del sitio.
    destroyRef.onDestroy(() => dock.clear());

    document.body.classList.add('has-doc-bar');
    destroyRef.onDestroy(() => {
      document.body.classList.remove('has-doc-bar');
      document.body.classList.remove('has-doc-panel');
    });

    /*
     * Un enlace pegado desde fuera (`…/marturisirea-de-credinta#art-botez`)
     * tiene que abrir ese artículo.
     *
     * Sin esto el enlace permanente de cada artículo no servía para nada: el
     * destinatario aterrizaba arriba del documento, con el artículo **cerrado**
     * y el índice marcando el primer capítulo. El navegador sí intenta saltar
     * al ancla, pero salta a un título plegado, que no enseña lo que se quería
     * compartir.
     */
    afterNextRender(() => this.abrirDesdeElEnlace());

    // El enlace permanente de un artículo sólo cambia el ancla, así que el
    // salto lo tiene que atender esto (no hay recarga).
    const alCambiarElAncla = () => this.abrirDesdeElEnlace();
    addEventListener('hashchange', alCambiarElAncla);
    destroyRef.onDestroy(() => {
      removeEventListener('hashchange', alCambiarElAncla);
      if (this.tiempoCopiado !== null) clearTimeout(this.tiempoCopiado);
    });
  }

  private abrirDesdeElEnlace(): void {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) return;

    // Se acepta tanto un capítulo como un artículo: los dos son destinos
    // legítimos del índice y de un enlace compartido.
    const esDestino =
      id.startsWith(ANCLA) || CREDO_PARTS.some((part) => part.id === id) || id === 'outro';
    if (!esDestino || !document.getElementById(id)) return;

    // `irA` es lo mismo que hace una pulsación en el índice: abre el
    // artículo, desplaza con el hueco de la cabecera y lo hace destellar.
    this.toc()?.irA(id);
  }
}
