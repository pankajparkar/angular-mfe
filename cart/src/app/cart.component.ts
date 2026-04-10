import { Component } from '@angular/core';

@Component({
  selector: 'app-cart',
  standalone: true,
  template: `
    <div class="page">
      <h2>Cart</h2>
      <p>Cart items will go here (Phase 2)</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    h2 { color: #e91e63; }
  `],
})
export class CartComponent {}
