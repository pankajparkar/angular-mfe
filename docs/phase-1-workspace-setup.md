# Phase 1: Workspace Setup & Native Federation Scaffold

## Overview

This phase creates the Nx monorepo with 4 Angular apps and wires them together using `@angular-architects/native-federation`.

**Result:** Shell (host) on port 4200, three remotes (catalog 4201, cart 4202, checkout 4203) — each loadable via lazy routes and runnable standalone.

---

## Tech Versions

| Package | Version |
|---------|---------|
| Angular | 21.2.5 |
| Nx | 22.6.5 |
| @angular-architects/native-federation | 21.2.3 |
| TypeScript | ~5.9.2 |
| Node | 22.x |

---

## Step 1: Create Nx Workspace

```bash
npx create-nx-workspace@latest angular-mfe \
  --preset=angular-monorepo \
  --appName=shell \
  --style=scss \
  --ssr=false \
  --e2eTestRunner=none \
  --nxCloud=skip \
  --packageManager=npm
```

This creates the monorepo with `shell` as the first app under `apps/`.

---

## Step 2: Generate Remote Apps

All apps go directly under the `apps/` directory using the `--directory` flag:

```bash
cd angular-mfe

npx nx g @nx/angular:application catalog \
  --directory=apps/catalog \
  --style=scss --ssr=false --e2eTestRunner=none --routing=true --port=4201

npx nx g @nx/angular:application cart \
  --directory=apps/cart \
  --style=scss --ssr=false --e2eTestRunner=none --routing=true --port=4202

npx nx g @nx/angular:application checkout \
  --directory=apps/checkout \
  --style=scss --ssr=false --e2eTestRunner=none --routing=true --port=4203
```

---

## Step 3: Install Native Federation

```bash
npm i @angular-architects/native-federation
```

---

## Step 4: Initialize Federation for Each App

```bash
# Shell = host
npx nx g @angular-architects/native-federation:init \
  --project=shell --port=4200 --type=host

# Remotes
npx nx g @angular-architects/native-federation:init \
  --project=catalog --port=4201 --type=remote

npx nx g @angular-architects/native-federation:init \
  --project=cart --port=4202 --type=remote

npx nx g @angular-architects/native-federation:init \
  --project=checkout --port=4203 --type=remote
```

### What the generator does:

- Creates `federation.config.js` in each app root
- Creates `src/bootstrap.ts` (moves app bootstrap out of `main.ts`)
- Updates `main.ts` to call `initFederation()` before importing bootstrap
- Updates `project.json` with federation build/serve executors
- For the **host**: adds remote URLs inline in `main.ts`
- For **remotes**: adds `exposes` config in `federation.config.js`

> **Note:** After running the generators, verify the `exposes` paths in each remote's `federation.config.js` use `./apps/<name>/src/...` (matching the directory structure).

---

## Step 5: Key Files Explained

### Shell `main.ts` (Host)

```typescript
// apps/shell/src/main.ts
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

The shell knows where each remote lives. `initFederation()` fetches each remote's `remoteEntry.json` manifest, then dynamically imports `./bootstrap` to boot the Angular app.

### Remote `main.ts` (e.g., Catalog)

```typescript
// apps/catalog/src/main.ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
```

Remotes call `initFederation()` with no args — they don't consume other remotes.

### Shell `federation.config.js` (Host)

```javascript
// apps/shell/federation.config.js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'shell',

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

Host has **no `exposes`** — it only consumes remotes.

### Remote `federation.config.js` (e.g., Catalog)

```javascript
// apps/catalog/federation.config.js
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

Remotes **expose** entry points (here, routes). The shell loads them via `loadRemoteModule()`.

---

## Step 6: Shell Routing with `loadRemoteModule`

```typescript
// apps/shell/src/app/app.routes.ts
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

### How it works:

1. User navigates to `/catalog`
2. Angular router triggers `loadChildren`
3. `loadRemoteModule('catalog', './routes')` fetches `remoteEntry.json` from `localhost:4201`
4. The remote's `app.routes.ts` is loaded dynamically
5. The routes from the remote are mounted in the shell

**This is demo moment #1** — visible in the browser Network tab!

---

## Step 7: Shell UI (Header + Navigation)

```typescript
// apps/shell/src/app/app.ts
@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'MFE Shop';
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
  </nav>
</header>
<main>
  <router-outlet></router-outlet>
</main>
```

---

## Folder Structure

```
angular-mfe/
├── apps/
│   ├── shell/                          # Host app (port 4200)
│   │   ├── federation.config.js        # No exposes, consumes remotes
│   │   ├── project.json
│   │   └── src/
│   │       ├── main.ts                 # initFederation({ remotes... })
│   │       ├── bootstrap.ts            # bootstrapApplication()
│   │       └── app/
│   │           ├── app.ts
│   │           ├── app.html            # Header + router-outlet
│   │           ├── app.scss
│   │           ├── app.config.ts
│   │           └── app.routes.ts       # loadRemoteModule() calls
│   │
│   ├── catalog/                        # Remote (port 4201)
│   │   ├── federation.config.js        # exposes: './routes'
│   │   ├── project.json
│   │   └── src/
│   │       ├── main.ts                 # initFederation() — no args
│   │       ├── bootstrap.ts
│   │       └── app/
│   │           ├── app.routes.ts       # Exposed to shell
│   │           └── catalog.component.ts
│   │
│   ├── cart/                           # Remote (port 4202)
│   │   ├── federation.config.js        # exposes: './routes'
│   │   └── src/...                     # Same pattern as catalog
│   │
│   └── checkout/                       # Remote (port 4203)
│       ├── federation.config.js        # exposes: './routes'
│       └── src/...                     # Same pattern as catalog
│
├── libs/                               # Shared libraries (Phase 2+)
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## How to Run

### All apps at once:

```bash
npx nx run-many -t serve -p shell catalog cart checkout --parallel=4
```

### Individual apps (separate terminals):

```bash
npx nx serve shell      # http://localhost:4200
npx nx serve catalog    # http://localhost:4201
npx nx serve cart       # http://localhost:4202
npx nx serve checkout   # http://localhost:4203
```

### Dependency graph:

```bash
npx nx graph
```

---

## Verification Checklist

| # | Check | Expected Result |
|---|-------|----------------|
| 1 | `http://localhost:4200` | Shell loads, redirects to `/catalog` |
| 2 | `http://localhost:4201` | Catalog runs standalone |
| 3 | `http://localhost:4202` | Cart runs standalone |
| 4 | `http://localhost:4203` | Checkout runs standalone |
| 5 | Navigate `/catalog` -> `/cart` -> `/checkout` in shell | Each remote loads lazily |
| 6 | Open Network tab, navigate routes | `remoteEntry.json` fetched for each remote on first navigation |
| 7 | `npx nx graph` | Shows 4 independent app nodes |

---

## Demo Talking Point

> "Watch the Network tab — when I click 'Cart', the shell fetches `remoteEntry.json` from port 4202. That remote was built and deployed independently. This is Native Federation in action — no Webpack, pure ES modules, loaded on demand."

---

## Next: Phase 2

Federation wiring deep-dive — manifest vs inline, shared dependencies, and Network tab verification.
