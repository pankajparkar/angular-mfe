import { Component, inject, signal, ElementRef, HostListener } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartStateService } from '@mfe-shop/cart-state';

@Component({
  selector: 'app-cart-badge',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="cart-badge-container">
      <button class="cart-btn" (click)="toggle()">
        🛒
        @if (cartState.cartCount() > 0) {
          <span class="badge">{{ cartState.cartCount() }}</span>
        }
      </button>

      @if (open()) {
        <div class="popover">
          @if (cartState.cartCount() === 0) {
            <p class="empty">Cart is empty</p>
          } @else {
            <ul class="items">
              @for (item of cartState.cartItems(); track item.product.id) {
                <li>
                  <span class="item-icon">{{ item.product.image }}</span>
                  <span class="item-name">{{ item.product.name }}</span>
                  <span class="item-qty">x{{ item.quantity }}</span>
                </li>
              }
            </ul>
            <div class="popover-footer">
              <strong>Total: {{ cartState.cartTotal() | currency }}</strong>
              <a class="view-cart" href="/cart">View Cart →</a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .cart-badge-container {
      position: relative;
      display: inline-block;
    }

    .cart-btn {
      background: none;
      border: none;
      font-size: 1.4rem;
      cursor: pointer;
      position: relative;
      padding: 0.25rem;
      line-height: 1;
    }

    .badge {
      position: absolute;
      top: -6px;
      right: -8px;
      background: #e91e63;
      color: white;
      font-size: 0.65rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    .popover {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      min-width: 260px;
      z-index: 1000;
      color: #333;
    }

    .empty {
      padding: 1rem;
      margin: 0;
      text-align: center;
      color: #757575;
      font-size: 0.9rem;
    }

    .items {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .items li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }

    .item-icon { font-size: 1.2rem; }
    .item-name { flex: 1; }
    .item-qty { color: #757575; font-size: 0.8rem; }

    .popover-footer {
      border-top: 1px solid #e0e0e0;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }

    .view-cart {
      color: #3f51b5;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.85rem;
      &:hover { text-decoration: underline; }
    }
  `],
})
export class CartBadgeComponent {
  cartState = inject(CartStateService);
  open = signal(false);

  private el = inject(ElementRef);

  toggle() {
    this.open.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
