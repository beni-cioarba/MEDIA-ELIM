import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { ScheduleService } from '../../core/services/schedule.service';
import { HeroCarouselComponent } from '../../shared/hero-carousel/hero-carousel.component';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../core/ui/icon-name';

/** Tarjeta de acceso rápido a un módulo de la app. */
interface QuickLink {
  readonly id: string;
  readonly icon: IconName;
  readonly path: string;
}

/**
 * Portada pública de la iglesia.
 *
 * Es la primera impresión para quien llega desde el QR o desde una búsqueda:
 * presenta la iglesia, dice cuándo nos reunimos y ofrece accesos claros al
 * resto de módulos. **No** contiene lógica de negocio: consume
 * `ScheduleService` y `CHURCH_CONFIG` y delega la presentación en componentes
 * reutilizables (`app-hero-carousel`, `app-page-section`).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslateModule,
    HeroCarouselComponent,
    PageSectionComponent,
    IconComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly schedule = inject(ScheduleService);

  /** Rutas usadas en la plantilla — nunca literales sueltos. */
  protected readonly links = {
    about: `/${APP_PATHS.about}`,
    leadership: `/${APP_PATHS.leadership}`,
    media: `/${APP_PATHS.media}`,
    weekly: blockPath('weekly'),
    upcoming: blockPath('upcoming'),
    gallery: blockPath('gallery'),
    streams: blockPath('streams'),
    socials: blockPath('socials'),
    location: blockPath('location'),
  } as const;

  /** Accesos rápidos de la portada (orden = prioridad para el visitante). */
  protected readonly quickLinks: readonly QuickLink[] = [
    { id: 'weekly', icon: 'calendar', path: this.links.weekly },
    { id: 'upcoming', icon: 'sparkles', path: this.links.upcoming },
    { id: 'streams', icon: 'play', path: this.links.streams },
    { id: 'gallery', icon: 'image', path: this.links.gallery },
    { id: 'socials', icon: 'share', path: this.links.socials },
    { id: 'location', icon: 'map-pin', path: this.links.location },
  ];

  /** Primeros ministerios a modo de aperitivo de la página de liderazgo. */
  protected readonly featuredMinistries = computed(() =>
    this.config.ministries.slice(0, 6),
  );

  /** Próximo evento (o `null` si no queda ninguno). */
  protected readonly nextEvent = computed(() => this.schedule.upcomingEvents()[0] ?? null);

  /** Años de historia de la congregación, calculados en tiempo real. */
  protected readonly years = computed(
    () => new Date().getFullYear() - this.config.foundedYear,
  );

  /** Enlace de indicaciones a Google Maps. */
  protected readonly directionsUrl = computed(
    () =>
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        this.config.location.mapsQuery,
      )}`,
  );
}
