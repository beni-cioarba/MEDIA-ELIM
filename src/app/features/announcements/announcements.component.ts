import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Announcement, CHURCH_CONFIG } from '../../core/church.config';
import { AnnouncementsService } from '../../core/services/announcements.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { ShareButtonComponent } from '../../shared/share-button/share-button.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { AnnouncementCardComponent } from './announcement-card/announcement-card.component';

/**
 * «Anunțuri» — los avisos vigentes de la congregación.
 *
 * Dos modos con el mismo componente (y el mismo chunk):
 *  - `/anunturi`      → todos los anuncios vigentes, el más próximo primero.
 *  - `/anunturi/:id`  → uno solo: es el enlace que se comparte por WhatsApp.
 *    Si ya caducó pero sigue en el archivo, se ve con el aviso «ya no está
 *    en vigor» y sin botón de compartir (no se reenvía lo que ya pasó).
 *
 * Debajo de la lista, un desplegable cerrado con los anuncios de los últimos
 * meses («Anunțuri trecute»): discreto, para consultar, sin competir con los
 * vigentes.
 *
 * No hay backend ni CMS: los anuncios se declaran en `church.config.ts` con
 * una fecha de caducidad y `AnnouncementsService` filtra los vencidos. Lo que
 * se ve aquí es exactamente lo que se proyecta en el templo (misma tarjeta),
 * así que quien escanea el QR encuentra el mismo aviso, entero y en su móvil.
 */
@Component({
    selector: 'app-announcements',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        TranslatePipe,
        PageSectionComponent,
        ShareButtonComponent,
        IconComponent,
        AnnouncementCardComponent,
    ],
    templateUrl: './announcements.component.html',
    styleUrl: './announcements.component.scss'
})
export class AnnouncementsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly config = inject(CHURCH_CONFIG);
  protected readonly announcements = inject(AnnouncementsService);
  private readonly schedule = inject(ScheduleService);

  private readonly params = toSignal(this.route.paramMap);

  /** Id pedido en la URL, o `null` para la lista completa. */
  protected readonly requestedId = computed<string | null>(() => this.params()?.get('id') ?? null);

  /** Anuncios a pintar: uno (si la URL lo pide y sigue vigente) o todos. */
  protected readonly shown = computed<readonly Announcement[]>(() => {
    const id = this.requestedId();
    if (id === null) return this.announcements.active();
    const one = this.announcements.byId(id);
    return one ? [one] : [];
  });

  /** Anuncio pedido por la URL que ya caducó pero sigue en el archivo. */
  protected readonly archived = computed<Announcement | null>(() => {
    const id = this.requestedId();
    return id !== null && this.shown().length === 0 ? this.announcements.pastById(id) : null;
  });

  /** `true` cuando la URL pide un anuncio que no existe o ya salió del archivo. */
  protected readonly notFound = computed<boolean>(
    () => this.requestedId() !== null && this.shown().length === 0 && this.archived() === null,
  );

  protected readonly links = {
    all: `/${APP_PATHS.announcements}`,
    upcoming: blockPath('upcoming'),
    weekly: blockPath('weekly'),
  } as const;

  /** Enlace propio de un anuncio, siempre sobre la URL pública (no `localhost`). */
  protected shareUrl(announcement: Announcement): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}/${APP_PATHS.announcements}/${announcement.id}`;
  }

  /** «26 sept.»: fecha del hecho anunciado o, si no tiene, su último día. */
  protected pastDate(announcement: Announcement): string {
    return this.schedule.formatEventDateShort(announcement.date ?? announcement.expiresOn);
  }

  protected detailLink(announcement: Announcement): string {
    return `/${APP_PATHS.announcements}/${announcement.id}`;
  }
}
