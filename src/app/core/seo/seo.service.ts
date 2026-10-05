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
  /**
   * Página accesible por enlace pero fuera de los buscadores (`noindex`):
   * contenido personal, como las fotos de las familias por las que se ora.
   */
  readonly noindex?: boolean;
}

/** Título y descripción de una página que dependen de sus datos (ya traducidos). */
export interface PageSeoOverride {
  readonly title: string;
  readonly description?: string;
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

  /**
   * Título y descripción **ya resueltos** que una página pone encima de los
   * de su ruta cuando dependen de los datos (el nombre de una persona en
   * `/conducere/<id>`). Cada navegación lo borra: la página lo vuelve a poner
   * si sigue siendo suyo.
   */
  private readonly override = signal<PageSeoOverride | null>(null);

  /** Ruta de la página activa (`/rugaciune-pentru-familii/2026-09-27`), sin ancla ni query. */
  private readonly path = signal('/');

  /** Se dispara al cambiar de idioma para volver a traducir los metadatos. */
  private readonly langChange = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  constructor() {
    effect(() => {
      this.langChange();
      this.apply(this.current(), this.override());
    });
  }

  /** Pone (o quita, con `null`) el título y la descripción propios de la página. */
  setOverride(override: PageSeoOverride | null): void {
    this.override.set(override);
  }

  /** Llamado por `AppTitleStrategy` en cada navegación, con la URL nueva. */
  update(seo: RouteSeo | null, url = '/'): void {
    this.path.set(url.split(/[?#]/)[0] || '/');
    this.override.set(null);
    this.current.set(seo);
  }

  /** URL pública absoluta de la página activa (sin ancla: el ancla es del enlace). */
  private pageUrl(): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}${this.path()}`;
  }

  private apply(seo: RouteSeo | null, override: PageSeoOverride | null): void {
    const brand = this.translate.instant('brand.name') as string;
    const pageTitle = override?.title ?? (seo ? (this.translate.instant(seo.titleKey) as string) : '');
    const title = pageTitle && pageTitle !== brand ? `${pageTitle} · ${brand}` : brand;

    const description =
      override?.description ??
      (this.translate.instant(seo?.descriptionKey ?? 'app.description') as string);

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    // La URL de ESTA página, no la portada. Con la portada, Facebook /
    // Messenger / WhatsApp tomaban `og:url` como la dirección «canónica» y
    // reescribían el enlace compartido a `…/MEDIA-ELIM/#<familia>`: se
    // perdía la ruta, se abría la portada y el ancla no encontraba nada.
    this.meta.updateTag({ property: 'og:url', content: this.pageUrl() });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    // Se pone y se quita en cada navegación: en una SPA la etiqueta se
    // quedaría puesta al salir de la página que la pidió.
    if (seo?.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, noimageindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }
  }
}
