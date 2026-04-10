import { Component } from '@angular/core';

@Component({
  selector: 'app-checkout',
  standalone: true,
  template: `
    <div class="page">
      <h2>Checkout</h2>
      <p>Payment form will go here (Phase 3)</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; }
    h2 { color: #4caf50; }
  `],
})
export class CheckoutComponent {}
