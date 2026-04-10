# NgIndia Microfrontend (MFE) Demo

This project demonstrates **Microfrontend Architecture** using **Angular 17** and **Webpack Module Federation** via [`@angular-architects/module-federation`](https://github.com/angular-architects/module-federation-plugin).

## Architecture

```
┌────────────────────────────────────────────────────┐
│                  Shell (Host) :4200                │
│   ┌────────────────────────────────────────────┐   │
│   │              Navigation Bar                │   │
│   ├────────────────────────────────────────────┤   │
│   │                                            │   │
│   │   /home  ──────► mfe-home :4201           │   │
│   │   /profile ────► mfe-profile :4202        │   │
│   │                                            │   │
│   └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

## Applications

| App         | Port | Description                        |
|-------------|------|------------------------------------|
| shell       | 4200 | Host application with navigation   |
| mfe-home    | 4201 | Home Microfrontend (remote)        |
| mfe-profile | 4202 | Profile Microfrontend (remote)     |

## Getting Started

### Install dependencies

```bash
npm install
```

### Run all applications

Open three separate terminals and run:

```bash
# Terminal 1 — mfe-home remote
npm run start:mfe-home

# Terminal 2 — mfe-profile remote
npm run start:mfe-profile

# Terminal 3 — shell host
npm run start:shell
```

Then open [http://localhost:4200](http://localhost:4200) in your browser.

### Build all applications

```bash
npm run build:all
```

## Module Federation

Each remote MFE exposes its Angular **Routes** via the `exposes` configuration in `webpack.config.js`. The shell host uses `loadRemoteModule` from `@angular-architects/module-federation` to dynamically load these routes at runtime.

### Shell webpack config (`projects/shell/webpack.config.js`)

```js
remotes: {
  "mfeHome": "http://localhost:4201/remoteEntry.js",
  "mfeProfile": "http://localhost:4202/remoteEntry.js",
}
```

### Remote webpack configs

```js
// mfe-home
exposes: {
  './Routes': './projects/mfe-home/src/app/app.routes.ts',
}

// mfe-profile
exposes: {
  './Routes': './projects/mfe-profile/src/app/app.routes.ts',
}
```

## Tech Stack

- Angular 17 (Standalone Components)
- Webpack Module Federation
- @angular-architects/module-federation v17
- TypeScript 5.4
- SCSS
