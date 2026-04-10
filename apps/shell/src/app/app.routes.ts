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
