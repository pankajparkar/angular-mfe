# Phase 4: Angular Signals for Shared Cart State

## Overview

This is the **key demo moment** of the talk. A user adds a product in the Catalog remote, and the cart count badge in the Shell header updates reactively — across microfrontend boundaries — using Angular Signals inside a proper `@Injectable` service.

No RxJS. No NgRx. Just an Angular service with signals.

---

## Why a Service Works Across MFEs

You might worry that `@Injectable({ providedIn: 'root' })` creates separate instances per MFE (since each has its own injector root). In a normal multi-app setup, that would be true. But with Native Federation:

```javascript
// federation.config.js (same in all 4 apps)
shared: {
  ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
},
```

`singleton: true` ensures:
1. `@angular/core` is loaded **once** — one root injector for all MFEs
2. `@mfe-shop/cart-state` is loaded **once** — one `CartStateService` instance
3. Every `inject(CartStateService)` across shell + remotes returns the **same** instance

This is the standard Angular DI pattern, made safe for MFEs by federation's singleton sharing.

---

## The Complete Flow

```
Catalog Remote                    Shared Library                    Shell (via Cart Remote)
┌──────────────┐                 ┌──────────────────────┐          ┌──────────────────┐
│ "Add to Cart"│                 │  CartStateService    │          │ CartBadgeComponent│
│   button     │── addToCart() ──>│  (providedIn: root)  │          │                  │
│              │                 │  _cartItems.update() │          │ cartCount()      │
│              │                 │       │              │          │    │             │
│              │                 │       ▼              │          │    ▼             │
│              │                 │ signal changes ──────────────────> badge updates  │
│              │                 │                      │          │   reactively     │
└──────────────┘                 └──────────────────────┘          └──────────────────┘

All three boxes share the SAME service instance because
shareAll({ singleton: true }) deduplicates @angular/core and cart-state.
```

---

## File-by-File Walkthrough

### 1. CartStateService — `libs/shared/cart-state/src/lib/cart-state/cart-state.ts`

```typescript
import { Injectable, computed, signal } from '@angular/core';

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

@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly _cartItems = signal<CartItem[]>([]);

  readonly cartItems = this._cartItems.asReadonly();

  readonly cartCount = computed(() =>
    this._cartItems().reduce((total, item) => total + item.quantity, 0)
  );

  readonly cartTotal = computed(() =>
    this._cartItems().reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    )
  );

  addToCart(product: Product): void {
    this._cartItems.update(items => {
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

  removeFromCart(productId: number): void {
    this._cartItems.update(items =>
      items.filter(item => item.product.id !== productId)
    );
  }

  clearCart(): void {
    this._cartItems.set([]);
  }
}
```

**Key design decisions:**
- `@Injectable({ providedIn: 'root' })` — the standard Angular way, safe because federation shares one root injector
- `_cartItems` is `private readonly` — encapsulated, only mutated via class methods
- `cartItems` exposed via `asReadonly()` — prevents accidental `.set()` from consumers
- `cartCount` and `cartTotal` are `computed()` — derived state, auto-updating

### 2. Catalog Remote — `apps/catalog/src/app/catalog.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Product, CartStateService } from '@mfe-shop/cart-state';

@Component({
  // ... template with product grid and "Add to Cart" buttons
})
export class CatalogComponent {
  private cartState = inject(CartStateService);
  products = PRODUCTS;

  onAddToCart(product: Product) {
    this.cartState.addToCart(product);
  }
}
```

### 3. Cart Remote — `apps/cart/src/app/cart.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { CartStateService } from '@mfe-shop/cart-state';

@Component({
  // ... template with cart items list
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
```

### 4. CartBadge Widget — `apps/cart/src/app/cart-badge.component.ts`

```typescript
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
})
export class CartBadgeComponent {
  cartCount = inject(CartStateService).cartCount;
}
```

### 5. Shell Header — `apps/shell/src/app/cart-badge-wrapper.component.ts`

```typescript
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

### 6. Checkout Remote — `apps/checkout/src/app/checkout.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { CartStateService } from '@mfe-shop/cart-state';

@Component({
  // ... template with order summary + payment form
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
```

---

## Why It Works: The Singleton Chain

```
shareAll({ singleton: true })
        │
        ├── @angular/core loaded ONCE ──> ONE root injector
        │
        └── @mfe-shop/cart-state loaded ONCE
                │
                └── CartStateService { providedIn: 'root' }
                        │
                        └── ONE instance shared by:
                              ├── Shell (CartBadgeWrapper)
                              ├── Catalog (CatalogComponent)
                              ├── Cart (CartComponent, CartBadgeComponent)
                              └── Checkout (CheckoutComponent)
```

### What would happen WITHOUT `singleton: true`:

Each remote would load its own `@angular/core`, creating separate injectors. Each injector would create its own `CartStateService`. The catalog's `addToCart()` would update one service, while the shell's `CartBadge` reads from another. State would **not** sync. The demo would fail.

---

## Verification Checklist

| # | Check | Expected |
|---|-------|----------|
| 1 | Click "Add to Cart" on a product in Catalog | CartBadge in shell header shows "1" |
| 2 | Add same product again | Badge shows "2" (quantity increments) |
| 3 | Add different product | Badge shows "3" |
| 4 | Navigate to Cart page | Shows both products with correct quantities |
| 5 | Remove an item | Badge count decreases |
| 6 | Navigate to Checkout | Order summary shows same items |
| 7 | Place Order | Cart clears, badge resets |
| 8 | `npx nx graph` | `cart-state` lib has edges to catalog, cart, checkout |

---

## Demo Script for This Moment

> "Let me show you the reactive state in action."
>
> *[Click "Add to Cart" on Wireless Headphones]*
>
> "See the badge? It went from empty to 1. The Catalog remote called `cartState.addToCart()`. The CartBadge in the shell header reads `cartState.cartCount()`. These are Angular Signals inside a standard `@Injectable` service."
>
> *[Add another product]*
>
> "Now it's 3. Here's the key: this service lives in a shared library. Because federation shares both `@angular/core` and our library as singletons, there's one injector, one service instance, one signal. Every MFE reads the same state."
>
> *[Open `cart-state.ts` in editor]*
>
> "This is the entire state management layer. An `@Injectable` service with signals. No RxJS subscriptions, no store actions, no event bus. Just `inject(CartStateService)` in any component, in any microfrontend."

---

## Next: Phase 5

Final polish, `nx graph` walkthrough, and full demo rehearsal script.
