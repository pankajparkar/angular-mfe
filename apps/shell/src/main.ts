import { initFederation } from '@angular-architects/native-federation';

initFederation({
  cart: 'http://localhost:4202/remoteEntry.json',
  catalog: 'http://localhost:4201/remoteEntry.json',
  checkout: 'http://localhost:4203/remoteEntry.json',
})
  .catch((err) => console.error(err))
  .then((_) => import('./bootstrap'))
  .catch((err) => console.error(err));
