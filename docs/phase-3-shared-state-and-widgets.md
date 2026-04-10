# Phase 3: Shared Cart State (Signals) + CartBadge Widget Pattern

## Overview

This phase adds the core demo functionality:
- Shared cart state using **Angular Signals** (no RxJS, no NgRx)
- Product catalog with "Add to Cart" buttons
- Cart page showing items with remove/clear
- Checkout page with order summary and payment form
- **CartBadge widget** exposed from the cart remote, rendered inside the shell header

**Demo moments:** Signals-based cross-MFE state (#2), widget pattern via `loadRemoteModule` (#3).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Shell (host)                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Header: [Catalog] [Cart] [Checkout] [CartBadge] │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────┐ ┌──────────┐ ┌────────────┐           │
│  │  Catalog    │ │  Cart    │ │  Checkout  │  <routes>  │
│  │  (remote)   │ │ (remote) │ │  (remote)  │           │
│  └──────┬──────┘ └────┬─────┘ └─────┬──────┘           │
│         │             │             │                   │
│         └─────────────┼─────────────┘                   │
│                       │                                 │
│              ┌────────┴────────┐                        │
│              │  @mfe-shop/     │  <shared lib>          │
│              │  cart-state     │                         │
│              │  (Signals)      │                         │
│              └─────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Shared Cart State Library

```bash
npx nx g @nx/angular:library \
  --name=cart-state \
  --directory=libs/shared/cart-state \
  --standalone=true \
  --prefix=shared \
  --style=none \
  --skipTests=true
```

Update the path alias in `tsconfig.base.json`:

```json
{
  "paths": {
    "@mfe-shop/cart-state": ["libs/shared/cart-state/src/index.ts"]
  }
}
```

### `libs/shared/cart-state/src/lib/cart-state/cart-state.ts`

```typescript
import { computed, signal } from '@angular/core';

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// Global signal-based state — shared across all MFEs via the shared library
const _cartItems = signal<CartItem[]>([]);

export const cartItems = _cartItems.asReadonly();

export const cartCount = computed(() =>
  _cartItems().reduce((total, item) => total + item.quantity, 0)
);

export const cartTotal = computed(() =>
  _cartItems().reduce((total, item) => total + item.product.price * item.quantity, 0)
);

export function addToCart(product: Product): void {
  _cartItems.update(items => {
    const existing = items.find(item => item.product.id === product.id);
    if (existing) {
      return items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    }
    return [...items, { product, quantity: 1 }];
  });
}

export function removeFromCart(productId: number): void {
  _cartItems.update(items => items.filter(item => item.product.id !== productId));
}

export function clearCart(): void {
  _cartItems.set([]);
}
```

### Why Signals (not a service)?

- **No DI needed** — signals are plain functions, importable by any MFE
- **No singleton service headaches** — the signal IS the singleton (module-level)
- **Works because of `shareAll({ singleton: true })`** — all MFEs share the same instance of `@mfe-shop/cart-state`, so they share the same signal
- **Perfect for a demo** — audience can see reactive state without RxJS boilerplate

### `libs/shared/cart-state/src/index.ts`

```typescript
export * from './lib/cart-state/cart-state';
```

---

## Step 2: Catalog Remote — Product Listing

### `apps/catalog/src/app/catalog.component.ts`

```typescript
import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Product, addToCart } from '@mfe-shop/cart-state';

const PRODUCTS: Product[] = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧' },
  { id: 2, name: 'Mechanical Keyboard', price: 129.99, image: '⌨️' },
  { id: 3, name: 'USB-C Hub', price: 49.99, image: '🔌' },
  { id: 4, name: '4K Monitor', price: 399.99, image: '🖥️' },
  { id: 5, name: 'Webcam HD', price: 69.99, image: '📷' },
  { id: 6, name: 'Desk Lamp', price: 34.99, image: '💡' },
];

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="catalog">
      <h2>Product Catalog</h2>
      <div class="product-grid">
        @for (product of products; track product.id) {
          <div class="product-card">
            <span class="product-image">{{ product.image }}</span>
            <h3>{{ product.name }}</h3>
            <p class="price">{{ product.price | currency }}</p>
            <button (click)="onAddToCart(product)">Add to Cart</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class CatalogComponent {
  products = PRODUCTS;

  onAddToCart(product: Product) {
    addToCart(product);
  }
}
```

---

## Step 3: Cart Remote — Items List

### `apps/cart/src/app/cart.component.ts`

```typescript
import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { cartItems, cartTotal, cartCount, removeFromCart, clearCart } from '@mfe-shop/cart-state';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="cart">
      <h2>Shopping Cart</h2>
      @if (cartCount() === 0) {
        <p class="empty">Your cart is empty.</p>
      } @else {
        @for (item of cartItems(); track item.product.id) {
          <div class="cart-item">
            <span>{{ item.product.image }}</span>
            <div class="item-details">
              <h3>{{ item.product.name }}</h3>
              <p>{{ item.product.price | currency }} x {{ item.quantity }}</p>
            </div>
            <button (click)="onRemove(item.product.id)">Remove</button>
          </div>
        }
        <div class="cart-footer">
          <p class="total">Total: {{ cartTotal() | currency }}</p>
          <button (click)="onClear()">Clear Cart</button>
        </div>
      }
    </div>
  `,
})
export class CartComponent {
  cartItems = cartItems;
  cartTotal = cartTotal;
  cartCount = cartCount;

  onRemove(productId: number) { removeFromCart(productId); }
  onClear() { clearCart(); }
}
```

---

## Step 4: CartBadge Widget (Key Demo Moment)

### `apps/cart/src/app/cart-badge.component.ts`

```typescript
import { Component } from '@angular/core';
import { cartCount } from '@mfe-shop/cart-state';

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
})
export class CartBadgeComponent {
  cartCount = cartCount;
}
```

### Expose from cart federation config

```javascript
// apps/cart/federation.config.js
exposes: {
  './routes': './apps/cart/src/app/app.routes.ts',
  './CartBadge': './apps/cart/src/app/cart-badge.component.ts',  // Widget!
},
```

### Load in shell header (widget pattern)

```typescript
// apps/shell/src/app/cart-badge-wrapper.component.ts
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
```

```html
<!-- apps/shell/src/app/app.html -->
<header class="shell-header">
  <h1>{{ title }}</h1>
  <nav>
    <a routerLink="/catalog" routerLinkActive="active">Catalog</a>
    <a routerLink="/cart" routerLinkActive="active">Cart</a>
    <a routerLink="/checkout" routerLinkActive="active">Checkout</a>
    <app-cart-badge-wrapper />
  </nav>
</header>
```

### Why this pattern matters:

> "The CartBadge component lives in the Cart remote's codebase. The shell doesn't import it at build time — it loads it dynamically at runtime via `loadRemoteModule`. The Cart team owns both the cart page AND the badge widget. The Shell team just places a wrapper where they want it to appear."

---

## Step 5: Checkout Remote — Payment Form

### `apps/checkout/src/app/checkout.component.ts`

```typescript
import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { cartItems, cartTotal, cartCount, clearCart } from '@mfe-shop/cart-state';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="checkout">
      <h2>Checkout</h2>
      @if (cartCount() === 0) {
        <p>Nothing to checkout.</p>
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
              <strong>Total: {{ cartTotal() | currency }}</strong>
            </div>
          </div>
          <div class="payment-form">
            <h3>Payment Details</h3>
            <!-- Demo form — not functional -->
            <input placeholder="4242 4242 4242 4242" />
            <button (click)="onPlaceOrder()">
              Place Order ({{ cartTotal() | currency }})
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CheckoutComponent {
  cartItems = cartItems;
  cartTotal = cartTotal;
  cartCount = cartCount;
  orderPlaced = false;

  onPlaceOrder() {
    this.orderPlaced = true;
    clearCart();
  }
}
```

---

## Verification Checklist

| # | Check | Expected |
|---|-------|----------|
| 1 | `npx nx run-many -t build -p shell catalog cart checkout` | All 4 build |
| 2 | Open shell, click "Add to Cart" on catalog page | CartBadge in header updates immediately |
| 3 | Navigate to Cart page | Shows added items with correct quantities |
| 4 | Remove item from cart | CartBadge count decreases |
| 5 | Navigate to Checkout | Order summary shows cart contents |
| 6 | Click "Place Order" | Cart clears, badge resets to 0 |
| 7 | `npx nx graph` | Shows `cart-state` lib connected to catalog, cart, checkout |
| 8 | Open `http://localhost:4201` standalone | Catalog works independently |

---

## Demo Talking Points

### Signal-based shared state:
> "There's no NgRx, no RxJS subjects, no service with DI. Just a plain signal exported from a shared library. Because Native Federation shares this library as a singleton, all three remotes and the shell are reading the same signal instance. Add to cart in the catalog remote — the badge updates in the shell. That's Signals + Module Federation working together."

### Widget pattern:
> "The CartBadge component is owned by the Cart team. The Shell team doesn't import it — they use `loadRemoteModule('cart', './CartBadge')` to pull it in at runtime. If the Cart team updates the badge, the Shell gets the new version without rebuilding."

### nx graph:
> "Run `npx nx graph` — you'll now see edges from catalog, cart, and checkout all pointing to the shared `cart-state` library. This is your dependency map. Nx uses it for affected builds — change the cart state, and Nx knows exactly which apps to rebuild."

---

## Next: Phase 4

Polish, standalone remote verification, and final demo walkthrough.
