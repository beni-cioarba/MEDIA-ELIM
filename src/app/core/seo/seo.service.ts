import { Injectable, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../church.config';

/** Metadatos SEO declarados en `data` de cada ruta. */
export interface RouteSeo {
  /** Clave i18n del título de la página (sin el nombre de la iglesia). */
  readonly titleKey: string;
  /** Clave i18n de la meta descripción. */
  readonly descriptionKey?: string;
}

/**
 * Aplica título y metadatos de la ruta activa, **reaccionando al idioma**.
 *
 * Antes de existir el router la app tenía un único `<title>` estático. Ahora
 * cada módulo declara sus claves en `data.seo` y este servicio se encarga de
 * traducirlas, actualizar `<title>`, `description` y las etiquetas Open Graph
 * (para que compartir un enlace por WhatsApp muestre la tarjeta correcta).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly translate = inject(TranslateService);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly config = inject(CHURCH_CONFIG);

  private readonly current = signal<RouteSeo | null>(null);

  /** Se dispara al cambiar de idioma para volver a traducir los metadatos. */
  private readonly langChange = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  constructor() {
    effect(() => {
      this.langChange();
      this.apply(this.current());
    });
  }

  /** Llamado por `AppTitleStrategy` en cada navegación. */
  update(seo: RouteSeo | null): void {
    this.current.set(seo);
  }

  private apply(seo: RouteSeo | null): void {
    const brand = this.translate.instant('brand.name') as string;
    const pageTitle = seo ? (this.translate.instant(seo.titleKey) as string) : '';
    const title = pageTitle && pageTitle !== brand ? `${pageTitle} · ${brand}` : brand;

    const description = this.translate.instant(
      seo?.descriptionKey ?? 'app.description',
    ) as string;

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: this.config.publicUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }
}
