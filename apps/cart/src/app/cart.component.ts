import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartStateService } from '@mfe-shop/cart-state';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `
    <div class="cart">
      <h2>Shopping Cart</h2>

      @if (cartCount() === 0) {
        <p class="empty">Your cart is empty. Go add some products!</p>
      } @else {
        <div class="cart-items">
          @for (item of cartItems(); track item.product.id) {
            <div class="cart-item">
              <span class="item-image">{{ item.product.image }}</span>
              <div class="item-details">
                <h3>{{ item.product.name }}</h3>
                <p>{{ item.product.price | currency }} x {{ item.quantity }}</p>
              </div>
              <button class="remove-btn" (click)="onRemove(item.product.id)">Remove</button>
            </div>
          }
        </div>

        <div class="cart-footer">
          <p class="total">Total: {{ cartTotal() | currency }}</p>
          <div class="actions">
            <button class="clear-btn" (click)="onClear()">Clear Cart</button>
            <a class="checkout-btn" routerLink="/checkout">Proceed to Checkout</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cart { padding: 2rem; }
    h2 { color: #e91e63; margin-bottom: 1.5rem; }
    .empty { color: #757575; font-size: 1.1rem; }
    .cart-items { display: flex; flex-direction: column; gap: 1rem; }
    .cart-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .item-image { font-size: 2rem; }
    .item-details { flex: 1; }
    .item-details h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .item-details p { margin: 0; color: #757575; }
    .remove-btn {
      background: none;
      border: 1px solid #e91e63;
      color: #e91e63;
      padding: 0.4rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      &:hover { background: #fce4ec; }
    }
    .cart-footer {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total { font-size: 1.3rem; font-weight: 700; margin: 0; }
    .actions { display: flex; gap: 1rem; }
    .clear-btn {
      background: none;
      border: 1px solid #757575;
      color: #757575;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      &:hover { background: #f5f5f5; }
    }
    .checkout-btn {
      background: #4caf50;
      color: white;
      padding: 0.5rem 1.25rem;
      border-radius: 4px;
      text-decoration: none;
      &:hover { background: #388e3c; }
    }
  `],
})
export class CartComponent {
  private cartState = inject(CartStateService);

  cartItems = this.cartState.cartItems;
  cartCount = this.cartState.cartCount;
  cartTotal = this.cartState.cartTotal;

  onRemove(productId: number) {
    this.cartState.removeFromCart(productId);
  }

  onClear() {
    this.cartState.clearCart();
  }
}
