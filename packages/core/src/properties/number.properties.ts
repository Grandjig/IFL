/**
 * IFL Number Property Helpers
 * Built-in property functions for use in intent declarations.
 */

/**
 * Checks if a number is positive (greater than zero).
 */
export function isPositive(n: number): boolean {
  return n > 0;
}

/**
 * Checks if a number is negative (less than zero).
 */
export function isNegative(n: number): boolean {
  return n < 0;
}

/**
 * Checks if a number is non-negative (zero or positive).
 */
export function isNonNegative(n: number): boolean {
  return n >= 0;
}

/**
 * Checks if a number is within a range (inclusive).
 */
export function isInRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max;
}

/**
 * Checks if a number is an integer.
 */
export function isInteger(n: number): boolean {
  return Number.isInteger(n);
}

/**
 * Checks if a number is finite (not Infinity or NaN).
 */
export function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

/**
 * Checks if a number is a valid percentage (0-100 inclusive).
 */
export function isPercentage(n: number): boolean {
  return n >= 0 && n <= 100;
}

/**
 * Checks if a number is a valid proportion (0-1 inclusive).
 */
export function isProportion(n: number): boolean {
  return n >= 0 && n <= 1;
}

/**
 * Checks if a number is greater than a threshold.
 */
export function isGreaterThan(n: number, threshold: number): boolean {
  return n > threshold;
}

/**
 * Checks if a number is less than a threshold.
 */
export function isLessThan(n: number, threshold: number): boolean {
  return n < threshold;
}
