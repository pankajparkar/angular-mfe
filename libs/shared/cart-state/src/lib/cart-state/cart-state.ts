import { computed, signal } from '@angular/core';

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

// Global signal-based state — shared across all MFEs via the shared library
const _cartItems = signal<CartItem[]>([]);

export const cartItems = _cartItems.asReadonly();

export const cartCount = computed(() =>
  _cartItems().reduce((total, item) => total + item.quantity, 0)
);

export const cartTotal = computed(() =>
  _cartItems().reduce((total, item) => total + item.product.price * item.quantity, 0)
);

export function addToCart(product: Product): void {
  _cartItems.update(items => {
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

export function removeFromCart(productId: number): void {
  _cartItems.update(items => items.filter(item => item.product.id !== productId));
}

export function clearCart(): void {
  _cartItems.set([]);
}
