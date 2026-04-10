# Phase 2: Federation Wiring Deep-Dive

## Overview

This phase explains how the Native Federation wiring works between the shell (host) and remotes, how shared dependencies are managed, and how to verify everything in the browser.

---

## Inline vs Manifest: Which Approach?

Native Federation supports two ways to tell the shell where remotes live:

### Option A: Inline (current setup — recommended for demo)

```typescript
// apps/shell/src/main.ts
initFederation({
  'catalog': 'http://localhost:4201/remoteEntry.json',
  'cart': 'http://localhost:4202/remoteEntry.json',
  'checkout': 'http://localhost:4203/remoteEntry.json',
})
```

### Option B: External Manifest File

```typescript
// apps/shell/src/main.ts
initFederation('/assets/federation.manifest.json')
```

```json
// apps/shell/public/assets/federation.manifest.json
{
  "catalog": "http://localhost:4201/remoteEntry.json",
  "cart": "http://localhost:4202/remoteEntry.json",
  "checkout": "http://localhost:4203/remoteEntry.json"
}
```

### Recommendation: Use Inline for this demo

| | Inline | Manifest |
|---|--------|----------|
| Setup | Zero extra files | Needs a JSON file in `public/` |
| Visibility | URLs right in `main.ts` — easy to show in a talk | Audience needs to see two files |
| Production use | Rebuild to change URLs | Swap JSON at deploy time |
| Best for | Demos, single-env setups | Multi-environment CI/CD |

For production, you'd use the manifest so ops can swap URLs per environment without rebuilding. But for a conference demo, inline keeps everything in one place and is immediately understandable.

---

## Complete File Reference

### `apps/shell/federation.config.js`

```javascript
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'shell',

  // Host does NOT expose anything — it only consumes remotes
  // No `exposes` block needed

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

### `apps/shell/src/main.ts`

```typescript
import { initFederation } from '@angular-architects/native-federation';

initFederation({
  'cart': 'http://localhost:4202/remoteEntry.json',
  'catalog': 'http://localhost:4201/remoteEntry.json',
  'checkout': 'http://localhost:4203/remoteEntry.json'
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
```

### `apps/shell/src/bootstrap.ts`

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
```

### `apps/shell/src/app/app.config.ts`

```typescript
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(appRoutes)],
};
```

> **Note:** Federation initialization happens in `main.ts` via `initFederation()`, NOT in `app.config.ts`. The `app.config.ts` just provides the router with routes that reference `loadRemoteModule()`.

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

### `apps/catalog/federation.config.js`

```javascript
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'catalog',

  exposes: {
    './routes': './apps/catalog/src/app/app.routes.ts',
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

### `apps/cart/federation.config.js`

```javascript
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'cart',

  exposes: {
    './routes': './apps/cart/src/app/app.routes.ts',
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

### `apps/checkout/federation.config.js`

```javascript
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'checkout',

  exposes: {
    './routes': './apps/checkout/src/app/app.routes.ts',
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

---

## How Shared Dependencies Work

### `shareAll()` does the heavy lifting

```javascript
shared: {
  ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
},
```

| Option | What it does |
|--------|-------------|
| `singleton: true` | Only ONE instance of each package is loaded across host + all remotes |
| `strictVersion: true` | Throws an error if host and remote have incompatible versions |
| `requiredVersion: 'auto'` | Reads the version from `package.json` automatically |

### What gets shared:

`shareAll()` scans `package.json` and shares **all** dependencies. This includes:
- `@angular/core`, `@angular/common`, `@angular/router` (critical — must be singletons)
- `rxjs`
- `zone.js`
- Any other dependency in `package.json`

### The `skip` array:

```javascript
skip: [
  'rxjs/ajax',
  'rxjs/fetch',
  'rxjs/testing',
  'rxjs/webSocket',
],
```

These rxjs sub-packages are rarely used at runtime. Skipping them avoids unnecessary module resolution.

### Verifying shared deps work:

After building, check the generated `remoteEntry.json`:

```bash
cat dist/apps/catalog/browser/remoteEntry.json | python3 -m json.tool | grep -A2 "@angular/core"
```

You should see `@angular/core` listed with `singleton: true` — confirming it will be shared, not duplicated.

---

## How the Bootstrap Flow Works

```
main.ts                          bootstrap.ts                    app.config.ts
┌─────────────────┐    ┌────────────────────────┐    ┌──────────────────────┐
│ initFederation() │───>│ bootstrapApplication() │───>│ provideRouter(routes)│
│ - fetch manifests│    │ - starts Angular       │    │ - routes use         │
│ - register       │    │ - applies config       │    │   loadRemoteModule() │
│   remotes        │    │                        │    │                      │
└─────────────────┘    └────────────────────────┘    └──────────────────────┘
```

1. `main.ts` calls `initFederation()` with the remote URLs
2. Native Federation fetches each remote's `remoteEntry.json` and registers them
3. After registration completes, `bootstrap.ts` is dynamically imported
4. Angular bootstraps normally with `app.config.ts` providing routes
5. When users navigate, `loadRemoteModule()` lazily loads the actual remote code

---

## Verifying in the Browser Network Tab

### Steps:

1. Start all apps: `npx nx run-many -t serve -p shell catalog cart checkout --parallel=4`
2. Open `http://localhost:4200` in Chrome
3. Open DevTools > **Network** tab
4. Filter by **Fetch/XHR** or **JS**

### What you should see:

**On initial load (`/catalog` via redirect):**
- `remoteEntry.json` from `localhost:4201` (catalog's manifest)
- `remoteEntry.json` from `localhost:4202` (cart's manifest — prefetched by `initFederation`)
- `remoteEntry.json` from `localhost:4203` (checkout's manifest — prefetched)
- JS chunks from `localhost:4201` (catalog's actual code)

**When you click "Cart":**
- JS chunks from `localhost:4202` (cart's code — loaded on demand)
- No new `remoteEntry.json` fetch — those were already loaded

**When you click "Checkout":**
- JS chunks from `localhost:4203` (checkout's code — loaded on demand)

### Demo talking point:

> "Notice the `remoteEntry.json` files loaded from different ports. Each remote is independently built and served. The shell discovers what's available at runtime — there's no build-time coupling. This is the key difference from a monolith."

---

## Verification Checklist

| # | Check | Expected Result |
|---|-------|----------------|
| 1 | `npx nx run-many -t build -p shell catalog cart checkout` | All 4 build successfully |
| 2 | Network tab shows `remoteEntry.json` from ports 4201-4203 | Federation manifests loaded |
| 3 | Navigate between routes | JS chunks lazy-loaded from correct remote port |
| 4 | `cat dist/apps/catalog/browser/remoteEntry.json` | Shows shared deps with `singleton: true` |
| 5 | Each remote runs standalone on its own port | Shell-agnostic remotes work independently |

---

## Next: Phase 3

Shared cart state using Angular Signals + CartBadge widget pattern.
