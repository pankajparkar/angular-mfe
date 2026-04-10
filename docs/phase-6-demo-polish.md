# Phase 6: Demo Polish and Conference-Ready Hardening

## Overview

Final phase — making the demo resilient and conference-ready. This adds error boundaries, loading fallbacks, and documents the exact demo flow including DevTools moments.

---

## 1. Error Boundaries for Remote Routes

### Problem
If a remote is not running (or network fails), `loadRemoteModule` throws. Without handling, the app shows a blank page or a console error — terrible for a live demo.

### Solution: Catch at the route level

`apps/shell/src/app/app.routes.ts`:

```typescript
import { Route } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { RemoteErrorComponent } from './remote-loading-fallback.component';

function loadRemoteRoutes(remoteName: string, exposedModule: string) {
  return () =>
    loadRemoteModule(remoteName, exposedModule)
      .then((m) => m.appRoutes)
      .catch(() => [
        { path: '**', component: RemoteErrorComponent, data: { remoteName } },
      ]);
}

export const appRoutes: Route[] = [
  {
    path: 'catalog',
    loadChildren: loadRemoteRoutes('catalog', './routes'),
  },
  {
    path: 'cart',
    loadChildren: loadRemoteRoutes('cart', './routes'),
  },
  {
    path: 'checkout',
    loadChildren: loadRemoteRoutes('checkout', './routes'),
  },
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full',
  },
];
```

### The fallback component

`apps/shell/src/app/remote-loading-fallback.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-remote-error',
  standalone: true,
  template: `
    <div class="error">
      <span class="icon">⚠️</span>
      <h3>{{ remoteName }} is unavailable</h3>
      <p>The remote application failed to load. This is expected if the remote is not running.</p>
      <button (click)="onRetry()">Try Again</button>
    </div>
  `,
})
export class RemoteErrorComponent {
  remoteName = inject(ActivatedRoute).snapshot.data['remoteName'] ?? 'Remote';

  onRetry() {
    window.location.reload();
  }
}
```

**Key pattern:** The `.catch()` returns a fallback route array instead of throwing. The router renders `RemoteErrorComponent` as if it were the remote's content. The user sees a helpful message, not a blank page.

---

## 2. CartBadge Widget Error Boundary

### Problem
The CartBadge loads via `loadRemoteModule` in `ngAfterViewInit`. If the cart remote is down, it throws — and the badge silently disappears.

### Solution: try/catch with fallback

`apps/shell/src/app/cart-badge-wrapper.component.ts`:

```typescript
import { Component, ViewContainerRef, AfterViewInit, inject, signal } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';

@Component({
  selector: 'app-cart-badge-wrapper',
  standalone: true,
  template: `
    @if (error()) {
      <span class="badge-fallback" title="Cart unavailable">🛒</span>
    }
  `,
  styles: [`
    .badge-fallback {
      font-size: 1.4rem;
      opacity: 0.5;
      cursor: default;
    }
  `],
})
export class CartBadgeWrapperComponent implements AfterViewInit {
  private vcr = inject(ViewContainerRef);
  error = signal(false);

  async ngAfterViewInit() {
    try {
      const { CartBadgeComponent } = await loadRemoteModule('cart', './CartBadge');
      this.vcr.createComponent(CartBadgeComponent);
    } catch {
      this.error.set(true);
    }
  }
}
```

**Behavior:**
- Happy path: badge loads normally, `error` stays `false`, template is empty (VCR renders the real component)
- Cart remote down: catch fires, shows a grayed-out cart icon as a graceful fallback

---

## 3. Feature Flag Simulation (Isolation Demo)

To demonstrate that the shell survives a remote being down:

1. **Start all 4 apps**
2. **Stop the cart remote** (`Ctrl+C` in its terminal)
3. **Navigate to `/cart`** in the shell — see the error fallback
4. **Check the badge** — grayed out with "Cart unavailable" tooltip
5. **Navigate to `/catalog`** — still works, catalog is independent
6. **Restart cart remote** — click "Try Again" or refresh

> **Demo line:** "I just killed the Cart remote. The shell is still running. Catalog still works. The badge gracefully degraded. This is isolation — one team's deployment failure doesn't take down the whole app."

No feature flag code needed — just stop the process.

---

## 4. Serve Command — Running All 4 Apps

### Single command to start everything:

```bash
pnpm nx run-many -t serve -p shell catalog cart checkout
```

### Ports:

| App | Port | URL |
|-----|------|-----|
| Shell (host) | 4200 | http://localhost:4200 |
| Catalog | 4201 | http://localhost:4201 |
| Cart | 4202 | http://localhost:4202 |
| Checkout | 4203 | http://localhost:4203 |

### For the demo, only show:
- **http://localhost:4200** — the integrated shell (primary demo)
- **http://localhost:4201** — catalog running standalone (to prove independence)

---

## 5. nx graph — What to Show the Audience

### Run it:

```bash
pnpm nx graph
```

### What the audience sees:

```
shell ──────────> catalog (remote)
  │ ──────────> cart (remote)
  │ ──────────> checkout (remote)
  │
  └──> @mfe-shop/cart-state (shared lib)

catalog ────────> @mfe-shop/cart-state
cart ───────────> @mfe-shop/cart-state
checkout ───────> @mfe-shop/cart-state
```

### Talking points:

> "This is `nx graph`. It scans imports — no config needed. You can see:"
>
> 1. **"Shell depends on all three remotes"** — it loads their routes at runtime
> 2. **"Catalog, Cart, and Checkout all depend on `cart-state`"** — that's the shared signal service
> 3. **"If I change `cart-state`, Nx knows to rebuild all three remotes — but not unrelated apps"** — that's affected builds
> 4. **"Each remote has zero dependencies on other remotes"** — they're isolated. Cart doesn't know Catalog exists.

### Affected command to demo:

```bash
pnpm nx affected -t build --base=main
```

> "I changed `cart-state.ts`. Nx computed which projects are affected. Only catalog, cart, and checkout need rebuilding. In a 50-app monorepo, this saves minutes of CI time."

---

## 6. Network Tab Demo Script

### Setup (before showing the audience):
1. Open http://localhost:4200 in Chrome
2. Open DevTools > Network tab
3. Clear the network log
4. Filter by **"Fetch/XHR"** or type `remoteEntry` in the filter box

### Demo steps:

> *[Clear network tab, filter by "remoteEntry"]*

> "Watch the Network tab. Right now, nothing has loaded from the remotes."

> *[Navigate to /catalog]*

> "See that? `remoteEntry.json` just loaded from `localhost:4201`. That's the catalog remote's manifest — it tells the shell what modules are available and where to find them."

> *[Navigate to /cart]*

> "Another `remoteEntry.json`, this time from `localhost:4202`. The cart remote loaded on demand. Federation is lazy — remotes only load when you navigate to them."

> *[Point to the CartBadge request]*

> "Actually, the cart remote's `remoteEntry.json` loaded earlier — when the shell booted, it needed the CartBadge widget. So the cart manifest was already cached. But the cart page chunk loaded just now."

### What to filter:
- **`remoteEntry`** — shows the federation manifests
- **`localhost:4201`**, **`localhost:4202`**, **`localhost:4203`** — shows which remote served which files
- **JS files** — shows the actual component chunks loading lazily

---

## 7. Build Verification

### Build all apps:

```bash
pnpm nx run-many -t build -p shell catalog cart checkout
```

### Expected output:
All 4 should build successfully. Check `dist/` for:
- `dist/apps/shell/browser/` — shell with import maps
- `dist/apps/catalog/browser/` — catalog with `remoteEntry.json`
- `dist/apps/cart/browser/` — cart with `remoteEntry.json`
- `dist/apps/checkout/browser/` — checkout with `remoteEntry.json`

---

## Final Pre-Presentation Checklist

| # | Check | How | Expected |
|---|-------|-----|----------|
| 1 | All apps build | `pnpm nx run-many -t build -p shell catalog cart checkout` | 4 successful builds |
| 2 | All apps serve | `pnpm nx run-many -t serve -p shell catalog cart checkout` | No errors, 4 ports active |
| 3 | Shell loads | Open http://localhost:4200 | Header with nav + CartBadge visible |
| 4 | Catalog renders | Click "Catalog" in nav | Product grid with 6 items |
| 5 | Add to cart works | Click "Add to Cart" on any product | CartBadge count increases |
| 6 | Cart page works | Click "Cart" in nav | Shows added items, remove/clear works |
| 7 | Checkout works | Click "Checkout" in nav | Order summary + payment form |
| 8 | Place order | Click "Place Order" | Success message, badge resets |
| 9 | Standalone remotes | Open http://localhost:4201 | Catalog works independently |
| 10 | Error boundary | Stop cart remote, navigate to /cart | Fallback error UI shows |
| 11 | Badge fallback | Stop cart remote, reload shell | Grayed-out cart icon |
| 12 | Recovery | Restart cart remote, click "Try Again" | Cart loads normally |
| 13 | nx graph | `pnpm nx graph` | Dependency visualization renders |
| 14 | Network tab | Filter by "remoteEntry" | Lazy loading visible |
| 15 | Lint passes | `pnpm nx run-many -t lint -p shell catalog cart checkout` | No errors |

---

## Demo Run Order (Recommended)

1. **Start all apps** — `pnpm nx run-many -t serve -p shell catalog cart checkout`
2. **Show nx graph** — "Here's the architecture"
3. **Open shell** — "This is the host app"
4. **Add products to cart** — "Signals + federation = cross-MFE reactivity"
5. **Show Network tab** — "remoteEntry.json loads lazily per remote"
6. **Navigate through cart and checkout** — "Full e-commerce flow across 3 independent apps"
7. **Kill cart remote** — "Watch what happens when a remote goes down"
8. **Show fallback** — "Isolation. The shell survives."
9. **Open standalone remote** — "Each remote runs independently too"
10. **Show `cart-state.ts`** — "47 lines. That's the entire shared state layer."
