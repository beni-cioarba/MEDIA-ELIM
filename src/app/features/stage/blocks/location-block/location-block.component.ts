import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MapEmbedComponent } from '../../../../shared/map-embed/map-embed.component';

/**
 * Bloque «Cómo llegar»: el mapa de la iglesia (a petición: `app-map-embed`).
 * Sólo se muestra en la web pública (no aporta nada proyectado).
 */
@Component({
    selector: 'app-location-block',
    imports: [TranslatePipe, MapEmbedComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './location-block.component.html',
    styles: [':host { display: contents; }']
})
export class LocationBlockComponent {}
