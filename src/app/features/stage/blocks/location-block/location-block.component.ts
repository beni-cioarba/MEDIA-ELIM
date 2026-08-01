import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../../core/church.config';

/**
 * Bloque «Cómo llegar»: mapa incrustado con la ubicación de la iglesia.
 * Sólo se muestra en la web pública (no aporta nada proyectado).
 */
@Component({
  selector: 'app-location-block',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-block.component.html',
  styles: [':host { display: contents; }'],
})
export class LocationBlockComponent {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * URL del mapa incrustado. Se marca como recurso de confianza porque se
   * construye a partir de la consulta estática definida en `church.config.ts`
   * (no hay entrada de usuario, por lo que no es un vector de inyección).
   */
  protected readonly mapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `https://www.google.com/maps?q=${encodeURIComponent(
      this.config.location.mapsQuery,
    )}&hl=es&z=16&output=embed`,
  );
}
