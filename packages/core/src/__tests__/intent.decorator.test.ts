/**
 * IFL Intent Decorator Test Suite
 * Tests for the @intent decorator and function wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intent, IntentViolationError, intentRegistry } from '../index.js';
import type { IntentDeclaration } from '../types/index.js';

// Clear registry before each test
beforeEach(() => {
  intentRegistry.clear();
});

describe('intent decorator', () => {
  describe('basic wrapping', () => {
    it('returns correct result for valid input', () => {
      const add = intent({
        ensures: (input, output) => output === (input[0] as number) + (input[1] as number),
      })((a: number, b: number) => a + b);

      expect(add(2, 3)).toBe(5);
    });

    it('preserves function behavior when intent is satisfied', () => {
      const double = intent({
        description: 'doubles a number',
        ensures: (input, output) => output === (input[0] as number) * 2,
      })((n: number) => n * 2);

      expect(double(5)).toBe(10);
      expect(double(0)).toBe(0);
      expect(double(-3)).toBe(-6);
    });

    it('preserves function name', () => {
      function myFunction(n: number) {
        return n;
      }
      const wrapped = intent({ ensures: () => true })(myFunction);
      expect(wrapped.name).toBe('myFunction');
    });

    it('preserves function length (arity)', () => {
      const fn = (a: number, b: number, c: number) => a + b + c;
      const wrapped = intent({ ensures: () => true })(fn);
      expect(wrapped.length).toBe(3);
    });

    it('works without any intent clauses', () => {
      const fn = intent({})((n: number) => n * 2);
      expect(fn(5)).toBe(10);
    });

    it('works with only description', () => {
      const fn = intent({
        description: 'Just a description',
      })((n: number) => n);
      expect(fn(5)).toBe(5);
    });
  });

  describe('violation handling', () => {
    it('warns on violation with onViolation: warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const broken = intent({
        ensures: (_input, output) => (output as number) > 0,
        onViolation: 'warn',
      })((n: number) => -n);

      broken(5);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logs on violation with onViolation: log', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const broken = intent({
        ensures: () => false,
        onViolation: 'log',
      })((n: number) => n);

      broken(5);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('throws IntentViolationError with onViolation: throw', () => {
      const broken = intent({
        ensures: (_input, output) => (output as number) > 0,
        onViolation: 'throw',
      })((n: number) => -n);

      expect(() => broken(5)).toThrowError('INTENT VIOLATION');
    });

    it('IntentViolationError contains violation report', () => {
      const broken = intent({
        ensures: () => false,
        onViolation: 'throw',
      })((n: number) => n);

      try {
        broken(5);
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as any).name).toBe('IntentViolationError');
        expect((err as any).violation).toBeDefined();
        const violation = (err as any).violation;
        expect(violation.violationType).toBe('postcondition');
        expect(violation.input).toEqual([5]);
        expect(violation.actualOutput).toBe(5);
      }
    });

    it('calls custom handler with onViolation function', () => {
      const handler = vi.fn();

      const broken = intent({
        ensures: () => false,
        onViolation: handler,
      })((n: number) => n);

      broken(1);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0]).toHaveProperty('violationType', 'postcondition');
    });

    it('custom handler receives full violation report', () => {
      const handler = vi.fn();

      const broken = intent({
        description: 'Test function',
        ensures: () => false,
        onViolation: handler,
      })((n: number) => n * 2);

      broken(5);

      const violation = handler.mock.calls[0][0];
      expect(violation.input).toEqual([5]);
      expect(violation.actualOutput).toBe(10);
      expect(violation.declaredIntent).toContain('Test function');
      expect(violation.causalChain).toBeDefined();
      expect(Array.isArray(violation.causalChain)).toBe(true);
    });
  });

  describe('preconditions', () => {
    it('reports violation when requires fails', () => {
      const handler = vi.fn();

      const fn = intent({
        requires: (n) => n > 0,
        ensures: (_input, output) => (output as number) > 0,
        onViolation: handler,
      })((n: number) => n * 2);

      fn(-1);
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].violationType).toBe('precondition');
    });

    it('does not report when requires passes', () => {
      const handler = vi.fn();

      const fn = intent({
        requires: (n) => n > 0,
        ensures: (_input, output) => (output as number) > 0,
        onViolation: handler,
      })((n: number) => n * 2);

      fn(5);
      expect(handler).not.toHaveBeenCalled();
    });

    it('requires receives spread arguments', () => {
      const handler = vi.fn();

      const fn = intent({
        requires: (a, b) => a > 0 && b > 0,
        onViolation: handler,
      })((a: number, b: number) => a + b);

      fn(-1, 5);
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].violationType).toBe('precondition');
    });
  });

  describe('edge cases (handles)', () => {
    it('validates edge case returns value', () => {
      const handler = vi.fn();

      const fn = intent({
        handles: [{ when: (arr) => (arr as unknown[]).length === 0, returns: [] }],
        onViolation: handler,
      })((arr: number[]) => (arr.length === 0 ? [] : arr));

      fn([]);
      expect(handler).not.toHaveBeenCalled();
    });

    it('reports violation when edge case returns wrong value', () => {
      const handler = vi.fn();

      const fn = intent({
        handles: [{ when: (arr) => (arr as unknown[]).length === 0, returns: [] }],
        onViolation: handler,
      })((arr: number[]) => (arr.length === 0 ? [0] : arr)); // Bug: returns [0] instead of []

      fn([]);
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].violationType).toBe('edge_case');
    });

    it('handles returns can be a function', () => {
      const handler = vi.fn();

      const fn = intent({
        handles: [
          { when: (n) => n === 0, returns: (n) => n }, // returns 0 when input is 0
        ],
        onViolation: handler,
      })((n: number) => n);

      fn(0);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('async functions', () => {
    it('works with async functions', async () => {
      const asyncFn = intent({
        ensures: (_input, output) => typeof output === 'string',
      })(async (id: number) => Promise.resolve(`user_${id}`));

      const result = await asyncFn(1);
      expect(result).toBe('user_1');
    });

    it('catches async violations', async () => {
      const handler = vi.fn();

      const asyncFn = intent({
        ensures: (_input, output) => (output as string).startsWith('user_'),
        onViolation: handler,
      })(async (id: number) => Promise.resolve(`wrong_${id}`));

      await asyncFn(1);
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].violationType).toBe('postcondition');
    });

    it('throws for async with onViolation: throw', async () => {
      const asyncFn = intent({
        ensures: () => false,
        onViolation: 'throw',
      })(async (n: number) => Promise.resolve(n));

      await expect(asyncFn(1)).rejects.toThrowError('INTENT VIOLATION');
    });

    it('handles async rejection gracefully', async () => {
      const asyncFn = intent({
        ensures: () => true,
      })(async () => {
        throw new Error('Async error');
      });

      await expect(asyncFn()).rejects.toThrow('Async error');
    });
  });

  describe('sampling', () => {
    it('never checks when samplingRate is 0', () => {
      const handler = vi.fn();

      const fn = intent({
        ensures: () => false,
        samplingRate: 0,
        onViolation: handler,
      })((n: number) => n);

      for (let i = 0; i < 100; i++) {
        fn(i);
      }
      expect(handler).not.toHaveBeenCalled();
    });

    it('always checks when samplingRate is 1', () => {
      const handler = vi.fn();

      const fn = intent({
        ensures: () => false,
        samplingRate: 1,
        onViolation: handler,
      })((n: number) => n);

      fn(1);
      fn(2);
      fn(3);
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('samplingRate affects check frequency', () => {
      const handler = vi.fn();

      const fn = intent({
        ensures: () => false,
        samplingRate: 0.5,
        onViolation: handler,
      })((n: number) => n);

      // With 1000 calls and 50% sampling, we should get roughly 500 violations
      // Allow a wide margin for randomness
      for (let i = 0; i < 1000; i++) {
        fn(i);
      }
      expect(handler.mock.calls.length).toBeGreaterThan(300);
      expect(handler.mock.calls.length).toBeLessThan(700);
    });
  });

  describe('registry integration', () => {
    it('registers function in intent registry', () => {
      const fn = intent({
        description: 'Test function',
        ensures: () => true,
      })(function testFn(n: number) {
        return n;
      });

      fn(1); // Call it to ensure registration happens
      const registered = intentRegistry.get('testFn');
      expect(registered).toBeDefined();
    });

    it('tracks violation count', () => {
      const fn = intent({
        ensures: () => false,
        onViolation: 'log',
      })(function countedFn(n: number) {
        return n;
      });

      // Suppress console output for this test
      vi.spyOn(console, 'log').mockImplementation(() => {});

      fn(1);
      fn(2);
      fn(3);

      const registered = intentRegistry.get('countedFn');
      expect(registered?.violationCount).toBe(3);
    });
  });

  describe('error handling', () => {
    it('handles exception in ensures gracefully', () => {
      const handler = vi.fn();

      const fn = intent({
        ensures: () => {
          throw new Error('Ensures threw');
        },
        onViolation: handler,
      })((n: number) => n);

      fn(1);
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].violationType).toBe('exception');
    });

    it('handles exception in requires gracefully', () => {
      const handler = vi.fn();

      const fn = intent({
        requires: () => {
          throw new Error('Requires threw');
        },
        onViolation: handler,
      })((n: number) => n);

      fn(1);
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].violationType).toBe('exception');
    });

    it('still throws function errors', () => {
      const fn = intent({
        ensures: () => true,
      })(() => {
        throw new Error('Function error');
      });

      expect(() => fn()).toThrow('Function error');
    });
  });
});
