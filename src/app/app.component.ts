import { Component } from '@angular/core';
import { RoofMapComponent } from './components/roof-map/roof-map.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RoofMapComponent],
  template: `
    <div class="app-container">
      <app-roof-map></app-roof-map>
    </div>
  `,
  styles: [`
    .app-container {
      width: 100%;
      height: 100vh;
      margin: 0;
      padding: 0;
    }
  `]
})
export class AppComponent {
  title = 'iRoof';
}