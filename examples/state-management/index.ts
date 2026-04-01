/**
 * IFL Example: State Management
 * 
 * Demonstrates intent verification for state management operations.
 * Shows how IFL catches subtle bugs in state calculations.
 */

import { intent } from '@ifl/core';

// ============================================================================
// TYPES
// ============================================================================

interface CartItem {
  id: string;
  price: number;
  quantity: number;
}

interface Cart {
  items: CartItem[];
  total: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates the total price of all items in the cart.
 */
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Creates an empty cart.
 */
function createEmptyCart(): Cart {
  return { items: [], total: 0 };
}

// ============================================================================
// CORRECT: addItem
// ============================================================================

const addItem = intent({
  description: 'Adds an item to the cart and recalculates total',
  
  ensures: (input, output) => {
    const [, item] = input as [Cart, CartItem];
    const result = output as Cart;
    
    // Item must be in the cart
    const itemExists = result.items.some(i => i.id === item.id);
    
    // Total must be correct (within floating point tolerance)
    const expectedTotal = calculateTotal(result.items);
    const totalCorrect = Math.abs(result.total - expectedTotal) < 0.001;
    
    return itemExists && totalCorrect;
  },
  
  onViolation: 'warn',
  tags: ['cart', 'correct'],
})((cart: Cart, item: CartItem): Cart => {
  const items = [...cart.items, item];
  return {
    items,
    total: calculateTotal(items),
  };
});

// ============================================================================
// CORRECT: removeItem
// ============================================================================

const removeItem = intent({
  description: 'Removes an item from the cart',
  
  ensures: (input, output) => {
    const [cart, itemId] = input as [Cart, string];
    const result = output as Cart;
    
    // Check if item was in original cart
    const wasInCart = cart.items.some(i => i.id === itemId);
    
    // If it was in cart, it should not be in result
    if (wasInCart) {
      const stillInCart = result.items.some(i => i.id === itemId);
      if (stillInCart) return false;
    }
    
    // Total must be correct
    const expectedTotal = calculateTotal(result.items);
    return Math.abs(result.total - expectedTotal) < 0.001;
  },
  
  handles: [
    {
      // If item not in cart, return cart unchanged
      when: (cart, itemId) => !cart.items.some(i => i.id === itemId),
      returns: (cart) => cart,
    },
  ],
  
  onViolation: 'warn',
  tags: ['cart', 'correct'],
})((cart: Cart, itemId: string): Cart => {
  const items = cart.items.filter(i => i.id !== itemId);
  return {
    items,
    total: calculateTotal(items),
  };
});

// ============================================================================
// BROKEN: updateQuantity
// ============================================================================
// This function has a bug: it updates the quantity but forgets to
// recalculate the total. IFL will catch this.

const updateQuantityBroken = intent({
  description: 'Updates item quantity (BROKEN - does not recalculate total)',
  
  ensures: (_input, output) => {
    const result = output as Cart;
    
    // Total must equal calculated total
    const expectedTotal = calculateTotal(result.items);
    return Math.abs(result.total - expectedTotal) < 0.001;
  },
  
  onViolation: 'warn',
  tags: ['cart', 'broken'],
})((cart: Cart, itemId: string, quantity: number): Cart => {
  const items = cart.items.map(i =>
    i.id === itemId ? { ...i, quantity } : i
  );
  
  // BUG: Total is not recalculated!
  // This will cause a postcondition violation when quantity changes
  return {
    items,
    total: cart.total, // Should be: calculateTotal(items)
  };
});

// ============================================================================
// CORRECT: updateQuantity
// ============================================================================

const updateQuantityCorrect = intent({
  description: 'Updates item quantity correctly',
  
  ensures: (_input, output) => {
    const result = output as Cart;
    const expectedTotal = calculateTotal(result.items);
    return Math.abs(result.total - expectedTotal) < 0.001;
  },
  
  onViolation: 'warn',
  tags: ['cart', 'correct'],
})((cart: Cart, itemId: string, quantity: number): Cart => {
  const items = cart.items.map(i =>
    i.id === itemId ? { ...i, quantity } : i
  );
  
  return {
    items,
    total: calculateTotal(items), // CORRECT: Recalculate total
  };
});

// ============================================================================
// RUN EXAMPLES
// ============================================================================

console.log('='.repeat(60));
console.log('IFL EXAMPLE: SHOPPING CART STATE MANAGEMENT');
console.log('='.repeat(60));

// Create a cart and add items
let cart = createEmptyCart();

console.log('\n--- Adding items (correct implementation) ---');

cart = addItem(cart, { id: 'apple', price: 1.50, quantity: 3 });
console.log('Added 3 apples @ $1.50:', cart);

cart = addItem(cart, { id: 'banana', price: 0.75, quantity: 5 });
console.log('Added 5 bananas @ $0.75:', cart);

cart = addItem(cart, { id: 'orange', price: 2.00, quantity: 2 });
console.log('Added 2 oranges @ $2.00:', cart);

console.log(`\nCart total: $${cart.total.toFixed(2)}`);
console.log(`Expected: $${(1.50*3 + 0.75*5 + 2.00*2).toFixed(2)}`);

console.log('\n--- Testing BROKEN updateQuantity (should show violation) ---');

// This will trigger a violation because total won't be recalculated
const brokenCart = updateQuantityBroken(cart, 'apple', 10);
console.log('\nUpdated apples to quantity 10 (BROKEN):');
console.log('  Items:', brokenCart.items);
console.log('  Total:', brokenCart.total, '(WRONG - not recalculated)');
console.log('  Expected:', calculateTotal(brokenCart.items));

console.log('\n--- Testing CORRECT updateQuantity ---');

const correctCart = updateQuantityCorrect(cart, 'apple', 10);
console.log('\nUpdated apples to quantity 10 (CORRECT):');
console.log('  Items:', correctCart.items);
console.log('  Total:', correctCart.total);
console.log('  Expected:', calculateTotal(correctCart.items));

console.log('\n--- Testing removeItem ---');

const afterRemove = removeItem(cart, 'banana');
console.log('\nRemoved bananas:');
console.log('  Items:', afterRemove.items.map(i => i.id));
console.log('  Total:', afterRemove.total);

const noChange = removeItem(cart, 'nonexistent');
console.log('\nTried to remove nonexistent item:');
console.log('  Cart unchanged:', noChange === cart);

console.log('\n' + '='.repeat(60));
console.log('EXAMPLE COMPLETE');
console.log('='.repeat(60));
