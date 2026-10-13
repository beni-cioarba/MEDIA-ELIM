import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { BreadcrumbTailService } from '../../../core/navigation/breadcrumb-tail.service';
import { SeoService } from '../../../core/seo/seo.service';
import { BaptismsService, CandidateView } from '../../../core/services/baptisms.service';
import { LanguageService } from '../../../core/services/language.service';
import { CopyButtonComponent } from '../../../shared/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ViewerDocument } from '../../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../../shared/viewer/viewable.directive';

/**
 * Perfil de un candidato: `/botezuri/<fecha>/<candidato>`.
 *
 * Adaptación del perfil de `conducere` a lo que es un botez: retrato 4:5 en
 * la cabecera (se amplía en el visor), quién es y **cuándo se bautizó**
 * (fecha, ordinal del botez, edad de entonces, de dónde es). Debajo, su
 * testimonio y versículo si los entregó (`story`, opcional) y **con quién se
 * bautizó**: el resto de candidatos del mismo día. Al pie, anterior y
 * siguiente en todo el registro, en orden cronológico.
 *
 * La guarda `candidateExists` garantiza que el candidato existe.
 */
@Component({
  selector: 'app-candidate-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, CopyButtonComponent, ViewableDirective],
  templateUrl: './candidate-profile.component.html',
  styleUrl: './candidate-profile.component.scss',
})
export class CandidateProfileComponent {
  private readonly baptisms = inject(BaptismsService);
  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly seo = inject(SeoService);
  private readonly breadcrumb = inject(BreadcrumbTailService);

  private readonly params = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => ({ date: p.get('date'), id: p.get('candidate') }))),
    { requireSync: true },
  );

  protected readonly candidate = computed(
    () => this.baptisms.candidate(this.params().date, this.params().id) as CandidateView,
  );
  protected readonly baptism = computed(() => this.candidate().baptism);
  protected readonly story = computed(() => this.candidate().story ?? null);

  /** Los que se bautizaron el mismo día (el propio, marcado), en el orden de la presentación. */
  protected readonly peers = computed(() =>
    this.baptisms.candidates().filter((c) => c.baptism.date === this.baptism().date),
  );

  protected readonly siblings = computed(() => this.baptisms.neighbours(this.candidate()));

  protected readonly photoDoc = computed<ViewerDocument | null>(() => {
    const c = this.candidate();
    return c.photo
      ? { src: c.photo.large, srcset: c.photo.srcset, thumb: c.photo.small, name: c.name, alt: c.name, date: c.baptism.date }
      : null;
  });

  protected readonly registerLink = computed(() => this.baptism().link);

  protected readonly url = computed(
    () => `${this.config.publicUrl.replace(/\/$/, '')}${this.candidate().link}`,
  );

  protected readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  protected share(): void {
    navigator.share({ title: this.candidate().name, url: this.url() }).catch(() => undefined);
  }

  protected date(iso: string): string {
    // Lee el idioma para que la plantilla se reevalúe al cambiarlo.
    this.language.current();
    return this.baptisms.formatDate(iso);
  }

  protected weekday(iso: string): string {
    return this.baptisms.dateParts(iso).weekday;
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  constructor() {
    effect(() => {
      this.language.current();
      const c = this.candidate();
      const label = this.translate.instant('baptisms.profile.kicker') as string;
      this.seo.setOverride({
        title: `${c.name} · ${label} ${this.baptisms.formatDate(c.baptism.date)}`,
        description: c.story?.summary,
      });
      this.breadcrumb.set(c.name);
    });

    inject(DestroyRef).onDestroy(() => {
      this.seo.setOverride(null);
      this.breadcrumb.set(null);
    });
  }
}
