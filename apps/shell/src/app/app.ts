import { Component, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { RouterModule } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

@Component({
  imports: [RouterModule, NgComponentOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'MFE Shop';
  cartBadge: Type<unknown> | null = null;

  constructor() {
    loadRemoteModule('cart', './CartBadge')
      .then(m => this.cartBadge = m.CartBadgeComponent)
      .catch(() => console.warn('Cart badge unavailable'));
  }
}
