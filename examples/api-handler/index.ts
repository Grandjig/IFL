/**
 * IFL Example: API Handler
 * 
 * Demonstrates intent verification for a payment processing API handler.
 * Shows how IFL catches the "80/20 problem" — code that works for the
 * common case but fails edge cases.
 */

import { intent } from '@ifl/core';

// ============================================================================
// TYPES
// ============================================================================

interface Order {
  id: string;
  amount: number;
  status: string;
}

interface PaymentMethod {
  isValid: boolean;
  isExpired: boolean;
}

interface PaymentResult {
  status: 'completed' | 'declined' | 'failed';
  transactionId?: string;
  reason?: string;
}

// ============================================================================
// PAYMENT PROCESSOR WITH INTENT DECLARATION
// ============================================================================
// This function has a deliberate bug: it doesn't handle expired cards.
// The happy path (valid, non-expired card) works fine.
// But the edge case (expired card) is broken.
// IFL's postcondition will catch this.

const processPayment = intent({
  description: 'Processes a payment and returns result',
  
  // Precondition: order must have positive amount and valid payment method
  requires: (order, method) => order.amount > 0 && method.isValid,
  
  // Postcondition: result must match expected state based on inputs
  ensures: (input, output) => {
    const [, method] = input as [Order, PaymentMethod];
    const result = output as PaymentResult;
    
    // If card is expired, must be declined with correct reason
    if (method.isExpired) {
      return result.status === 'declined' && result.reason === 'card_expired';
    }
    
    // If card is valid and not expired, must complete with transaction ID
    return result.status === 'completed' && typeof result.transactionId === 'string';
  },
  
  // Edge case: zero/negative amount should fail
  handles: [
    {
      when: (order) => order.amount <= 0,
      returns: { status: 'failed' as const, reason: 'invalid_amount' },
    },
  ],
  
  onViolation: 'warn',
  tags: ['payment', 'api'],
})((order: Order, method: PaymentMethod): PaymentResult => {
  // Handle invalid card
  if (!method.isValid) {
    return { status: 'failed', reason: 'invalid_card' };
  }
  
  // BUG: We forgot to handle expired cards!
  // This should return { status: 'declined', reason: 'card_expired' }
  // But instead we just process the payment anyway.
  
  // Happy path: process the payment
  return {
    status: 'completed',
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
});

// ============================================================================
// CORRECT IMPLEMENTATION (for comparison)
// ============================================================================

const processPaymentCorrect = intent({
  description: 'Processes a payment correctly',
  
  requires: (order, method) => order.amount > 0 && method.isValid,
  
  ensures: (input, output) => {
    const [, method] = input as [Order, PaymentMethod];
    const result = output as PaymentResult;
    
    if (method.isExpired) {
      return result.status === 'declined' && result.reason === 'card_expired';
    }
    
    return result.status === 'completed' && typeof result.transactionId === 'string';
  },
  
  handles: [
    {
      when: (order) => order.amount <= 0,
      returns: { status: 'failed' as const, reason: 'invalid_amount' },
    },
  ],
  
  onViolation: 'warn',
  tags: ['payment', 'api', 'correct'],
})((order: Order, method: PaymentMethod): PaymentResult => {
  if (!method.isValid) {
    return { status: 'failed', reason: 'invalid_card' };
  }
  
  // CORRECT: Handle expired cards
  if (method.isExpired) {
    return { status: 'declined', reason: 'card_expired' };
  }
  
  return {
    status: 'completed',
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
});

// ============================================================================
// RUN EXAMPLES
// ============================================================================

console.log('='.repeat(60));
console.log('IFL EXAMPLE: PAYMENT API HANDLER');
console.log('='.repeat(60));

console.log('\n--- Testing BROKEN implementation ---');

console.log('\n1. Valid payment (should work):');
const result1 = processPayment(
  { id: '1', amount: 100, status: 'pending' },
  { isValid: true, isExpired: false }
);
console.log('   Result:', result1);

console.log('\n2. Expired card (should show VIOLATION):');
const result2 = processPayment(
  { id: '2', amount: 50, status: 'pending' },
  { isValid: true, isExpired: true }
);
console.log('   Result:', result2);
console.log('   ^ BUG: Should have been declined with reason "card_expired"');

console.log('\n--- Testing CORRECT implementation ---');

console.log('\n3. Valid payment:');
const result3 = processPaymentCorrect(
  { id: '3', amount: 100, status: 'pending' },
  { isValid: true, isExpired: false }
);
console.log('   Result:', result3);

console.log('\n4. Expired card (handled correctly):');
const result4 = processPaymentCorrect(
  { id: '4', amount: 50, status: 'pending' },
  { isValid: true, isExpired: true }
);
console.log('   Result:', result4);

console.log('\n' + '='.repeat(60));
console.log('EXAMPLE COMPLETE');
console.log('='.repeat(60));
