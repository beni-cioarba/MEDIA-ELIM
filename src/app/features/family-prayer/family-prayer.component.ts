import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import {
  FamilyPrayerService,
  PrayerFamilyView,
  PrayerWeekView,
} from '../../core/services/family-prayer.service';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { ShareButtonComponent } from '../../shared/share-button/share-button.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { FamilyCardComponent } from './family-card/family-card.component';
import { FamilySummaryComponent } from './family-summary/family-summary.component';

/**
 * «Rugăciune pentru familii» — las familias por las que ora la iglesia esta
 * semana, con su foto y su motivo de oración.
 *
 * Dos modos con el mismo componente (y el mismo chunk):
 *  - `/rugaciune-pentru-familii`          → la semana que se anuncia.
 *  - `/rugaciune-pentru-familii/<domingo>` → una semana concreta (enlace para
 *    compartir; si ya pasó, lo dice y ofrece la actual).
 *
 * Arriba el resumen (quiénes), debajo una ficha por familia (anclas `#id`
 * para enlazar a una en concreto) y al pie el archivo de semanas anteriores.
 * Es la misma ficha que se proyecta el domingo.
 */
@Component({
  selector: 'app-family-prayer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    PageSectionComponent,
    ShareButtonComponent,
    IconComponent,
    FamilyCardComponent,
    FamilySummaryComponent,
  ],
  templateUrl: './family-prayer.component.html',
  styleUrl: './family-prayer.component.scss',
})
export class FamilyPrayerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly config = inject(CHURCH_CONFIG);
  protected readonly prayer = inject(FamilyPrayerService);

  private readonly params = toSignal(this.route.paramMap);

  /** Domingo pedido en la URL, o `null` para la semana en curso. */
  protected readonly requested = computed<string | null>(() => this.params()?.get('week') ?? null);

  /** Semana a pintar: la pedida (si existe y ya se publicó) o la en curso. */
  protected readonly week = computed<PrayerWeekView | null>(() => {
    const date = this.requested();
    return date === null ? this.prayer.current() : this.prayer.byDate(date);
  });

  /** La URL pide una semana que no existe (o que aún no se ha publicado). */
  protected readonly notFound = computed<boolean>(
    () => this.requested() !== null && this.week() === null,
  );

  /** Archivo: las semanas pasadas, salvo la que ya se está mostrando. */
  protected readonly archive = computed<readonly PrayerWeekView[]>(() => {
    const shown = this.week()?.presentedOn;
    return this.prayer.past().filter((w) => w.presentedOn !== shown);
  });

  protected readonly currentLink = `/${APP_PATHS.familyPrayer}`;

  protected weekLink(week: PrayerWeekView): string {
    return `/${APP_PATHS.familyPrayer}/${week.presentedOn}`;
  }

  /** Enlace público de la semana (siempre con fecha: no cambia de contenido). */
  protected weekUrl(week: PrayerWeekView): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}${this.weekLink(week)}`;
  }

  /** Enlace a la ficha de una familia dentro de su semana. */
  protected familyUrl(week: PrayerWeekView, family: PrayerFamilyView): string {
    return `${this.weekUrl(week)}#${family.id}`;
  }

  /** «Bahmătă · Barbă · Băleanu · Bena»: apellidos de la semana, sin repetir. */
  protected surnames(week: PrayerWeekView): string {
    return [...new Set(week.families.map((f) => f.surname))].join(' · ');
  }
}
