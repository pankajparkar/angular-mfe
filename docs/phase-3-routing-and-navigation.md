# Phase 3: Shell Routing & Standalone Remotes

## Overview

This phase covers how the shell lazy-loads each remote via `loadRemoteModule` and how each remote also works independently as a standalone app (demo moment #5).

---

## Shell Routing

### `apps/shell/src/app/app.routes.ts`

```typescript
import { Route } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const appRoutes: Route[] = [
  {
    path: 'catalog',
    loadChildren: () =>
      loadRemoteModule('catalog', './routes').then((m) => m.appRoutes),
  },
  {
    path: 'cart',
    loadChildren: () =>
      loadRemoteModule('cart', './routes').then((m) => m.appRoutes),
  },
  {
    path: 'checkout',
    loadChildren: () =>
      loadRemoteModule('checkout', './routes').then((m) => m.appRoutes),
  },
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
];
```

Each route uses `loadChildren` + `loadRemoteModule()`:
1. Angular router hits the path
2. `loadRemoteModule('catalog', './routes')` fetches `remoteEntry.json` from `localhost:4201`
3. Resolves the `./routes` exposed entry, which exports `appRoutes`
4. Angular mounts those child routes under the path

### `apps/shell/src/app/app.html`

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

### `apps/shell/src/app/app.ts`

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

## Remote Routes (exposed to shell)

Each remote exposes its `appRoutes` via `federation.config.js`:

```javascript
// e.g. apps/catalog/federation.config.js
exposes: {
  './routes': './apps/catalog/src/app/app.routes.ts',
},
```

### `apps/catalog/src/app/app.routes.ts`

```typescript
import { Route } from '@angular/router';
import { CatalogComponent } from './catalog.component';

export const appRoutes: Route[] = [
  { path: '', component: CatalogComponent },
];
```

### `apps/cart/src/app/app.routes.ts`

```typescript
import { Route } from '@angular/router';
import { CartComponent } from './cart.component';

export const appRoutes: Route[] = [
  { path: '', component: CartComponent },
];
```

### `apps/checkout/src/app/app.routes.ts`

```typescript
import { Route } from '@angular/router';
import { CheckoutComponent } from './checkout.component';

export const appRoutes: Route[] = [
  { path: '', component: CheckoutComponent },
];
```

---

## Standalone Remotes (Shell-Agnostic)

Each remote runs independently on its own port. When running standalone, the remote's own `App` component wraps the content with a minimal header:

### Pattern (same for all 3 remotes)

```typescript
// apps/catalog/src/app/app.ts
@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
```

```html
<!-- apps/catalog/src/app/app.html -->
<header class="remote-header">
  <h1>Catalog (standalone)</h1>
</header>
<router-outlet></router-outlet>
```

### How standalone mode works:

```
┌─────────────────────────────────────┐
│ Remote running standalone           │
│                                     │
│  main.ts                            │
│    └─ initFederation() (no args)    │
│        └─ bootstrap.ts              │
│            └─ App component         │
│                ├─ remote-header     │
│                └─ <router-outlet>   │
│                    └─ CatalogComponent (or Cart/Checkout)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Remote loaded inside shell          │
│                                     │
│  Shell's <router-outlet>            │
│    └─ loadRemoteModule('./routes')  │
│        └─ CatalogComponent directly │
│           (no App wrapper, no       │
│            remote-header)           │
└─────────────────────────────────────┘
```

The key insight: when loaded via shell, only the **exposed routes** are mounted — the remote's `App` component and its header are never rendered. When running standalone, the full app bootstraps with its own `App` wrapper.

---

## Verify in Browser Network Tab

1. Start all apps:
   ```bash
   npx nx run-many -t serve -p shell catalog cart checkout --parallel=4
   ```

2. Open `http://localhost:4200` — shell loads, redirects to `/catalog`

3. Open DevTools **Network** tab, filter "Fetch/XHR"

4. **On initial load:** `remoteEntry.json` fetched from all 3 remote ports (prefetched by `initFederation`)

5. **Click "Cart":** JS chunks loaded from `localhost:4202` (lazy — first time only)

6. **Click "Checkout":** JS chunks loaded from `localhost:4203`

7. **Click back to "Catalog":** No network request — already cached

### Standalone verification:

| URL | What you see |
|-----|-------------|
| `http://localhost:4200` | Shell with nav, loads catalog by default |
| `http://localhost:4201` | "Catalog (standalone)" header + product grid |
| `http://localhost:4202` | "Cart (standalone)" header + cart items |
| `http://localhost:4203` | "Checkout (standalone)" header + payment form |

---

## Demo Talking Point

> "Each remote is a full Angular app. Right now the catalog is running on port 4201 — go there directly and it works on its own. The team developing it doesn't need the shell. They build, test, and deploy independently. When the shell loads it, only the exposed routes are mounted — the remote's own App wrapper is bypassed entirely."

---

## Next: Phase 4

Polish, `nx graph` walkthrough, and final demo script.
