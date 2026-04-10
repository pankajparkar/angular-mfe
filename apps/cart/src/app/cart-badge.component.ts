import { Component, inject } from '@angular/core';
import { CartStateService } from '@mfe-shop/cart-state';

@Component({
  selector: 'app-cart-badge',
  standalone: true,
  template: `
    <span class="cart-badge">
      🛒
      @if (cartCount() > 0) {
        <span class="badge">{{ cartCount() }}</span>
      }
    </span>
  `,
  styles: [`
    .cart-badge {
      position: relative;
      font-size: 1.4rem;
      cursor: pointer;
    }
    .badge {
      position: absolute;
      top: -8px;
      right: -10px;
      background: #e91e63;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
  `],
})
export class CartBadgeComponent {
  cartCount = inject(CartStateService).cartCount;
}
