import { Component } from '@angular/core';

@Component({
  selector: 'app-catalog',
  standalone: true,
  template: `
    <div class="page">
      <h2>Catalog</h2>
      <p>Product listing will go here (Phase 2)</p>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 2rem;
      }
      h2 {
        color: #3f51b5;
      }
    `,
  ],
})
export class CatalogComponent {}
