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
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full',
  },
];
