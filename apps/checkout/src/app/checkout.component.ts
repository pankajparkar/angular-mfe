import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartStateService } from '@mfe-shop/cart-state';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="checkout">
      <h2>Checkout</h2>

      @if (cartCount() === 0) {
        <p class="empty">Nothing to checkout. Add items from the catalog first.</p>
      } @else {
        <div class="checkout-layout">
          <div class="order-summary">
            <h3>Order Summary</h3>
            @for (item of cartItems(); track item.product.id) {
              <div class="summary-item">
                <span>{{ item.product.image }} {{ item.product.name }} x{{ item.quantity }}</span>
                <span>{{ item.product.price * item.quantity | currency }}</span>
              </div>
            }
            <div class="summary-total">
              <strong>Total</strong>
              <strong>{{ cartTotal() | currency }}</strong>
            </div>
          </div>

          <div class="payment-form">
            <h3>Payment Details</h3>
            <div class="form-group">
              <label>Card Number</label>
              <input type="text" placeholder="4242 4242 4242 4242" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Expiry</label>
                <input type="text" placeholder="MM/YY" />
              </div>
              <div class="form-group">
                <label>CVC</label>
                <input type="text" placeholder="123" />
              </div>
            </div>
            <button class="pay-btn" (click)="onPlaceOrder()">
              Place Order ({{ cartTotal() | currency }})
            </button>
          </div>
        </div>
      }

      @if (orderPlaced) {
        <div class="success">
          <h3>Order Placed!</h3>
          <p>Thank you for your purchase.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .checkout { padding: 2rem; }
    h2 { color: #4caf50; margin-bottom: 1.5rem; }
    .empty { color: #757575; font-size: 1.1rem; }
    .checkout-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .order-summary {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .order-summary h3 { margin: 0 0 1rem; }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      padding-top: 1rem;
      margin-top: 0.5rem;
      border-top: 2px solid #e0e0e0;
      font-size: 1.1rem;
    }
    .payment-form {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .payment-form h3 { margin: 0 0 1rem; }
    .form-group {
      margin-bottom: 1rem;
      label { display: block; font-size: 0.85rem; color: #757575; margin-bottom: 0.25rem; }
      input {
        width: 100%;
        padding: 0.6rem;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
        &:focus { outline: none; border-color: #4caf50; }
      }
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .pay-btn {
      width: 100%;
      background: #4caf50;
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 0.5rem;
      &:hover { background: #388e3c; }
    }
    .success {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #e8f5e9;
      border-radius: 8px;
      text-align: center;
      h3 { color: #2e7d32; margin: 0 0 0.5rem; }
      p { margin: 0; }
    }
  `],
})
export class CheckoutComponent {
  private cartState = inject(CartStateService);

  cartItems = this.cartState.cartItems;
  cartCount = this.cartState.cartCount;
  cartTotal = this.cartState.cartTotal;
  orderPlaced = false;

  onPlaceOrder() {
    this.orderPlaced = true;
    this.cartState.clearCart();
  }
}
