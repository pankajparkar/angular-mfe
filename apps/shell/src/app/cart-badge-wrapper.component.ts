import { Component, ViewContainerRef, AfterViewInit, inject } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';

@Component({
  selector: 'app-cart-badge-wrapper',
  standalone: true,
  template: ``,
})
export class CartBadgeWrapperComponent implements AfterViewInit {
  private vcr = inject(ViewContainerRef);

  async ngAfterViewInit() {
    const { CartBadgeComponent } = await loadRemoteModule('cart', './CartBadge');
    this.vcr.createComponent(CartBadgeComponent);
  }
}
