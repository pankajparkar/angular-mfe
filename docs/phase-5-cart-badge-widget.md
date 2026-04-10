# Phase 5: CartBadge Widget — Component-Level Federation

## Overview

Up to now, federation has been used for **route-level loading** — the shell lazy-loads entire page routes from remotes. This phase demonstrates that federation works at a **component level** too: the Cart remote exposes a `CartBadgeComponent` widget that the Shell renders directly in its header.

This is a critical demo moment — it shows that micro-frontends aren't just about pages. Teams can share individual UI widgets across apps.

---

## Route-Level vs Component-Level Federation

| | Route-Level (Phases 2-3) | Component-Level (Phase 5) |
|---|---|---|
| **What's loaded** | An entire route config (`appRoutes`) | A single standalone component |
| **Where it renders** | Inside `<router-outlet>` | Anywhere — header, sidebar, footer |
| **Trigger** | Navigation (URL change) | App bootstrap / `ngAfterViewInit` |
| **Granularity** | Page-sized chunks | Widget-sized chunks |
| **Use case** | "Cart team owns the `/cart` page" | "Cart team owns the badge that appears in every page's header" |
| **Shell awareness** | Shell knows the route path, not the component | Shell knows the selector/wrapper, loads the component dynamically |

### Route-level (what we already had):

```typescript
// Shell's app.routes.ts — loads a full route tree from the cart remote
{
  path: 'cart',
  loadChildren: () =>
    loadRemoteModule('cart', './routes').then(m => m.appRoutes),
}
```

The shell says: *"When the user navigates to `/cart`, load the cart remote's routes and render them in the outlet."*

### Component-level (this phase):

```typescript
// Shell's cart-badge-wrapper.component.ts — loads a single component
const { CartBadgeComponent } = await loadRemoteModule('cart', './CartBadge');
this.vcr.createComponent(CartBadgeComponent);
```

The shell says: *"Load the CartBadge component from the cart remote and render it right here in the header."*

**Same mechanism** (`loadRemoteModule`), **different granularity**.

---

## Implementation

### Step 1: CartBadgeComponent (Cart Remote)

`apps/cart/src/app/cart-badge.component.ts`:

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
```

Key points:
- **Standalone** — no NgModule needed, can be dynamically created with `ViewContainerRef.createComponent()`
- **Injects `CartStateService`** — reads `cartCount` signal, which auto-updates when cart changes
- **Self-contained styles** — the badge brings its own CSS, the shell doesn't need to style it

### Step 2: Expose from Cart Federation Config

`apps/cart/federation.config.js`:

```javascript
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'cart',

  exposes: {
    './routes': './apps/cart/src/app/app.routes.ts',
    './CartBadge': './apps/cart/src/app/cart-badge.component.ts',  // Component-level!
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],

  features: {
    ignoreUnusedDeps: true,
  },
});
```

Note the two `exposes` entries:
- `'./routes'` — route-level federation (entire cart page)
- `'./CartBadge'` — component-level federation (just the badge widget)

Both are loaded via `loadRemoteModule`, but at different granularities.

### Step 3: CartBadgeWrapperComponent (Shell)

`apps/shell/src/app/cart-badge-wrapper.component.ts`:

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

**Why a wrapper component?**

The shell can't directly reference `CartBadgeComponent` — it doesn't exist at build time. The wrapper:
1. Provides a stable selector (`<app-cart-badge-wrapper />`) for the shell's template
2. Uses `ViewContainerRef.createComponent()` to dynamically instantiate the remote component at runtime
3. The empty template acts as an anchor — the remote component renders in its place

### Step 4: Shell Header Integration

`apps/shell/src/app/app.html`:

```html
<header class="shell-header">
  <h1>{{ title }}</h1>
  <nav>
    <a routerLink="/catalog" routerLinkActive="active">Catalog</a>
    <a routerLink="/cart" routerLinkActive="active">Cart</a>
    <a routerLink="/checkout" routerLinkActive="active">Checkout</a>
    <app-cart-badge-wrapper />
  </nav>
</header>

<main>
  <router-outlet></router-outlet>
</main>
```

`apps/shell/src/app/app.ts`:

```typescript
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
```

---

## How Shared State Flows Through the Widget

```
 User clicks "Add to Cart" in Catalog remote
                    │
                    ▼
  CartStateService.addToCart() — updates _cartItems signal
                    │
                    ▼
  cartCount computed signal recalculates (2 → 3)
                    │
                    ▼
  CartBadgeComponent (loaded from Cart remote, rendered in Shell header)
  reads cartCount() → template updates → badge shows "3"
```

This works because:
1. `CartStateService` is `providedIn: 'root'` in the shared lib
2. `singleton: true` in federation ensures one Angular root injector
3. The `CartBadgeComponent` is created inside the shell's component tree, so it participates in the same injector hierarchy
4. The signal is reactive — no manual subscription or change detection needed

---

## Conference Demo Script

> "So far I've shown you route-level federation — the shell loads entire pages from remotes. But federation isn't just for pages."
>
> *[Point to the cart badge in the header]*
>
> "See this badge? It's a component that lives in the Cart remote's codebase. The Cart team owns it. But it renders in the Shell's header — on every page."
>
> *[Open federation.config.js]*
>
> "The cart remote exposes two things: `./routes` for the cart page, and `./CartBadge` for this widget. Same `exposes` config, different granularity."
>
> *[Open cart-badge-wrapper.component.ts]*
>
> "The shell loads it with `loadRemoteModule('cart', './CartBadge')` and creates it dynamically with `ViewContainerRef`. The shell doesn't import `CartBadgeComponent` at build time — it doesn't even know what it looks like."
>
> *[Click "Add to Cart" in catalog]*
>
> "And because the service is shared as a singleton, the badge updates instantly when you add items from a completely different remote. One service instance, two remotes, real-time reactivity."
>
> "This is the widget pattern. Route federation gives you independent pages. Component federation gives you shared widgets — headers, sidebars, notifications, chat bubbles. Same mechanism, different granularity."

---

## Verification Checklist

| # | Check | Expected |
|---|-------|----------|
| 1 | Shell loads without errors | CartBadge appears in header (🛒 icon, no count) |
| 2 | Add item from Catalog | Badge shows count "1" immediately |
| 3 | Add more items | Count increments in real time |
| 4 | Navigate to Cart, remove item | Badge count decreases |
| 5 | Place order in Checkout | Badge resets to no count |
| 6 | Check Network tab | `cart` remote bundle loads for CartBadge (separate from route chunk) |
| 7 | Build all apps | `npx nx run-many -t build -p shell catalog cart checkout` succeeds |

---

## What This Proves to the Audience

1. **Federation is not just for routes** — individual components can be shared across apps
2. **Team ownership is preserved** — Cart team owns the badge, Shell team just places the wrapper
3. **Shared state works across granularities** — same `CartStateService` signal powers both the cart page and the header widget
4. **No build-time coupling** — Shell doesn't import `CartBadgeComponent`, only loads it at runtime
5. **Standard Angular patterns** — `inject()`, `ViewContainerRef.createComponent()`, signals — nothing exotic
