import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BibleLinkService, BibleOpen } from '../../core/bible/bible-link.service';
import { PassageRef, parseRef, refLabel } from '../../core/bible/bible-refs';
import { passageVerses, readingMinutes } from '../../core/bible/bible-verses';
import { LanguageService } from '../../core/services/language.service';
import { pluralKey } from '../../core/util/plural';
import { IconComponent } from '../icon/icon.component';

export { pluralKey };

/** Código USFM de un pasaje como el que vuelve en `?text=` (`JAS.2`, `PRO.26.22-28`). */
const REF_CODE =/^[1-3A-Z]{3}\.\d{1,3}(\.\d{1,3}(-\d{1,3})?)?$/;

/**
 * **Filas de lectura** — un pasaje por fila: abrirlo para leer (con
 * versículos y minutos aproximados) y escucharlo. La misma pieza en Proiectul
 * Împreună, Citirea Bibliei y la portada.
 *
 *  · Abre **en la app Biblia si está** (`BibleLinkService`: en Android con
 *    `intent:`; si no está, Chrome vuelve a `returnPath` con `?biblia=lipsa` y
 *    esta pieza avisa arriba: Google Play o leer en el navegador; la dirección
 *    se limpia).
 *  · Con `heading`, rótulo y total encima y cada fila con su nombre; sin él,
 *    una sola fila dice «Citește Iacov 2».
 *  · La versión y la tienda van aparte (`app-bible-options`), en el pie de
 *    quien la use.
 *
 * Docs: 32-impreuna.md → «Citirea zilei».
 */
@Component({
  selector: 'app-bible-passages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './bible-passages.component.html',
  styleUrl: './bible-passages.component.scss',
  host: { '[class.is-wisdom]': "kind() === 'wisdom'" },
})
export class BiblePassagesComponent implements OnInit {
  readonly refs = input.required<readonly PassageRef[]>();
  /** Página a la que vuelve Chrome en Android si no está la app (sin barra inicial: `impreuna/ziua/316`). */
  readonly returnPath = input.required<string>();
  /** Color: navy, u oro los días de Psalmi y Proverbe. */
  readonly kind = input<'nt' | 'wisdom' | 'ot'>('nt');
  /** Rótulo encima de las filas, con el total; sin él, una sola fila dice «Citește …». */
  readonly heading = input<string | null>(null);

  protected readonly links = inject(BibleLinkService);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Volvió de Android sin la app: el pasaje que quería abrir (aviso arriba). */
  protected readonly missing = signal<PassageRef | null>(null);

  protected readonly passages = computed(() => {
    const lang = this.language.current();
    return this.refs().map((ref) => ({
      ref,
      label: refLabel(ref, lang),
      verses: passageVerses(ref),
      minutes: readingMinutes([ref]),
      open: this.links.open(ref, this.fallback(ref)),
      audio: this.links.audio(ref),
    }));
  });

  /** Total de la cabecera: la suma de las filas (así cuadra con lo que se ve debajo). */
  protected readonly total = computed(() =>
    this.passages().reduce((sum, p) => ({ verses: sum.verses + p.verses, minutes: sum.minutes + p.minutes }), {
      verses: 0,
      minutes: 0,
    }),
  );

  /** Cada fila con su nombre («Isaia 43») o, si es una sola y sin rótulo, «Citește Iacov 2». */
  protected readonly named = computed(() => this.heading() !== null || this.refs().length > 1);

  private readonly plural = computed(() => new Intl.PluralRules(this.language.current()));

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('biblia') !== 'lipsa') return;
    this.links.markMissing();
    const code = params.get('text') ?? '';
    this.missing.set(REF_CODE.test(code) ? parseRef(code) : (this.refs()[0] ?? null));
    // Fuera de la dirección: al recargar o compartir no vuelve a salir. Al
    // acabar, el router sube arriba (`scrollPositionRestoration`): después se
    // baja hasta el aviso (en Citirea Bibliei queda bajo la semana).
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { biblia: null, text: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .then(() =>
        this.document.defaultView?.setTimeout(
          () => this.host.nativeElement.scrollIntoView?.({ block: 'center', behavior: 'instant' }),
          60,
        ),
      );
  }

  /** «26 de versete» / «5 versete» / «1 verset» (y en español). */
  protected versesKey(count: number): string {
    return `bible_app.verses_${pluralKey(this.plural(), count)}`;
  }

  protected opened(open: BibleOpen): void {
    if (open.viaIntent) this.links.watchLaunch();
  }

  /** Adónde vuelve Chrome si el `intent:` no encuentra la app: la página que lo pintó, avisada. */
  private fallback(ref: PassageRef): string {
    const query = `biblia=lipsa&text=${encodeURIComponent(ref.code)}`;
    return new URL(`${this.returnPath()}?${query}`, this.document.baseURI).href;
  }
}
