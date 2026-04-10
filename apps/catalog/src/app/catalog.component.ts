import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Product, CartStateService } from '@mfe-shop/cart-state';

const PRODUCTS: Product[] = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧' },
  { id: 2, name: 'Mechanical Keyboard', price: 129.99, image: '⌨️' },
  { id: 3, name: 'USB-C Hub', price: 49.99, image: '🔌' },
  { id: 4, name: '4K Monitor', price: 399.99, image: '🖥️' },
  { id: 5, name: 'Webcam HD', price: 69.99, image: '📷' },
  { id: 6, name: 'Desk Lamp', price: 34.99, image: '💡' },
];

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="catalog">
      <h2>Product Catalog</h2>
      <div class="product-grid">
        @for (product of products; track product.id) {
          <div class="product-card">
            <span class="product-image">{{ product.image }}</span>
            <h3>{{ product.name }}</h3>
            <p class="price">{{ product.price | currency }}</p>
            <button (click)="onAddToCart(product)">Add to Cart</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .catalog { padding: 2rem; }
    h2 { color: #3f51b5; margin-bottom: 1.5rem; }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
    }
    .product-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
    .product-image { font-size: 3rem; }
    h3 { margin: 0.75rem 0 0.5rem; font-size: 1rem; }
    .price { color: #e91e63; font-weight: 600; font-size: 1.1rem; }
    button {
      background: #3f51b5;
      color: white;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      &:hover { background: #303f9f; }
    }
  `],
})
export class CatalogComponent {
  private cartState = inject(CartStateService);
  products = PRODUCTS;

  onAddToCart(product: Product) {
    this.cartState.addToCart(product);
  }
}
