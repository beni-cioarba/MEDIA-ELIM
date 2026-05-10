import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HomeComponent } from './features/home/home.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-home />',
  styles: [':host { display: block; min-height: 100vh; }'],
})
export class AppComponent {}
