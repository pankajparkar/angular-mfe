import { Injectable, computed, signal } from '@angular/core';

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly _cartItems = signal<CartItem[]>([]);

  readonly cartItems = this._cartItems.asReadonly();

  readonly cartCount = computed(() =>
    this._cartItems().reduce((total, item) => total + item.quantity, 0)
  );

  readonly cartTotal = computed(() =>
    this._cartItems().reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    )
  );

  addToCart(product: Product): void {
    this._cartItems.update(items => {
      const existing = items.find(item => item.product.id === product.id);
      if (existing) {
        return items.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  removeFromCart(productId: number): void {
    this._cartItems.update(items =>
      items.filter(item => item.product.id !== productId)
    );
  }

  clearCart(): void {
    this._cartItems.set([]);
  }
}
