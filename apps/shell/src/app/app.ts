import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartBadgeWrapperComponent } from './cart-badge-wrapper.component';

@Component({
  imports: [RouterModule, CartBadgeWrapperComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'MFE Shop';
}
