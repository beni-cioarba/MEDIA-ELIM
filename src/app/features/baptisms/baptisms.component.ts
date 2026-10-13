import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { BaptismView, BaptismsService, CandidateView } from '../../core/services/baptisms.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { ViewerDocument } from '../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../shared/viewer/viewable.directive';

/**
 * Botezuri — `/botezuri` (y `/botezuri/<fecha>`, que lleva a ese botez).
 *
 * Tres piezas, de lo que se busca primero a lo que se consulta:
 *
 *  1. **Cabecera**: qué es el botez, las cifras del registro y la tarjeta
 *     del próximo botez (o, si no hay ninguno anunciado, del último).
 *  2. **Candidații**: carrusel de retratos, del más reciente al más antiguo,
 *     con filtro por año. Cada tarjeta abre el perfil.
 *  3. **Registrul**: todos los botezuri en orden cronológico, en una línea de
 *     tiempo; cada uno con su rejilla compacta de candidatos.
 *
 * Línea visual propia (no la guía de `/stil`): ver `docs/ai/34-baptisms.md`.
 */
@Component({
  selector: 'app-baptisms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, RouterLink, IconComponent, ViewableDirective],
  templateUrl: './baptisms.component.html',
  styleUrl: './baptisms.component.scss',
})
export class BaptismsComponent {
  protected readonly baptisms = inject(BaptismsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly contactPath = `/${APP_PATHS.contact}`;
  protected readonly all = this.baptisms.all;
  protected readonly stats = this.baptisms.stats;

  /** Botez pedido por la URL (`/botezuri/<fecha>`): se resalta y se lleva a la vista. */
  protected readonly focusDate = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('date'))),
    { initialValue: null },
  );

  /** Tarjeta de la cabecera: el próximo si lo hay; si no, el último. */
  protected readonly feature = computed(() => {
    const next = this.baptisms.next();
    return next
      ? { kind: 'next' as const, baptism: next }
      : this.baptisms.latest()
        ? { kind: 'latest' as const, baptism: this.baptisms.latest() as BaptismView }
        : null;
  });

  /** Retratos de un botez sin foto de grupo: mosaico de la tarjeta de la cabecera. */
  protected readonly featureMosaic = computed(() =>
    this.feature() ? this.candidatesOf(this.feature()!.baptism).slice(0, 6) : [],
  );

  // ── Carrusel ─────────────────────────────────────────────────────────
  protected readonly years = this.baptisms.candidateYears;
  /** Año elegido en el filtro (`null` = todos). */
  protected readonly year = signal<number | null>(null);
  protected readonly shown = computed(() => {
    const year = this.year();
    const all = this.baptisms.candidates();
    return year === null ? all : all.filter((c) => c.baptism.year === year);
  });
  protected countIn(year: number): number {
    return this.baptisms.candidates().filter((c) => c.baptism.year === year).length;
  }

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  constructor() {
    afterNextRender(() => {
      this.onTrackScroll();
      const date = this.focusDate();
      if (date) {
        this.host.nativeElement
          .querySelector(`#botez-${date}`)
          ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  protected pickYear(year: number | null): void {
    this.year.set(year);
    const el = this.track()?.nativeElement;
    if (el) el.scrollTo({ left: 0, behavior: 'auto' });
    queueMicrotask(() => this.onTrackScroll());
  }

  protected scrollTrack(direction: 1 | -1): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  protected onTrackScroll(): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    this.atStart.set(el.scrollLeft <= 4);
    this.atEnd.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  // ── Registro ─────────────────────────────────────────────────────────
  /** Candidatos de cada botez, en el orden en que se presentaron (el del fichero). */
  protected readonly byBaptism = computed(() => {
    const groups = new Map<string, CandidateView[]>();
    for (const c of this.baptisms.candidates()) {
      groups.set(c.baptism.date, [...(groups.get(c.baptism.date) ?? []), c]);
    }
    return groups;
  });

  protected candidatesOf(b: BaptismView): readonly CandidateView[] {
    return this.byBaptism().get(b.date) ?? [];
  }

  /** ¿Hay un botez anunciado? Si no, el registro acaba con «el próximo se anunciará». */
  protected readonly hasNext = computed(() => this.baptisms.next() !== null);

  protected parts(iso: string) {
    return this.baptisms.dateParts(iso);
  }

  protected date(iso: string, style: 'long' | 'short' = 'long'): string {
    return this.baptisms.formatDate(iso, style);
  }

  /** Rótulo de la cuenta atrás: «Astăzi», «Mâine», «În 12 zile». */
  protected countdownKey(b: BaptismView): string {
    return b.daysLeft <= 0 ? 'baptisms.today' : b.daysLeft === 1 ? 'baptisms.tomorrow' : 'baptisms.in_days';
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected coverDoc(b: BaptismView): ViewerDocument | null {
    return b.cover
      ? { src: b.cover.image, srcset: `${b.cover.medium} 960w, ${b.cover.image} 1600w`, thumb: b.cover.thumb, date: b.date }
      : null;
  }
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
