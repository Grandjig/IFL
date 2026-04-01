/**
 * IFL Array Property Helpers
 * Built-in property functions for use in intent declarations.
 */

/**
 * Checks if an array is sorted according to a comparator.
 * Default comparator assumes numeric ascending order.
 */
export function isSorted(
  arr: unknown[],
  comparator?: (a: unknown, b: unknown) => number
): boolean {
  if (arr.length <= 1) {
    return true;
  }

  const compare = comparator ?? ((a: unknown, b: unknown): number => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    return 0;
  });

  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1];
    const curr = arr[i];
    if (compare(prev, curr) > 0) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if two arrays contain the same elements (ignoring order).
 * Uses JSON.stringify for deep comparison of elements.
 */
export function sameElements(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  // Create a map of serialized elements and their counts
  const countMap = new Map<string, number>();

  for (const item of a) {
    const key = serialize(item);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  for (const item of b) {
    const key = serialize(item);
    const count = countMap.get(key);
    if (count === undefined || count === 0) {
      return false;
    }
    countMap.set(key, count - 1);
  }

  return true;
}

/**
 * Helper to serialize values for comparison.
 */
function serialize(value: unknown): string {
  if (value === undefined) return '__undefined__';
  if (value === null) return '__null__';
  if (typeof value === 'function') return `__fn:${value.name}__`;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return `__bigint:${value.toString()}__`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Checks if all elements in an array are unique (no duplicates).
 */
export function isUnique(arr: unknown[]): boolean {
  const seen = new Set<string>();

  for (const item of arr) {
    const key = serialize(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }

  return true;
}

/**
 * Checks if an array has exactly the specified length.
 */
export function hasLength(arr: unknown[], length: number): boolean {
  return arr.length === length;
}

/**
 * Checks if an array is non-empty.
 */
export function isNonEmpty(arr: unknown[]): boolean {
  return arr.length > 0;
}

/**
 * Checks if an array contains all required elements.
 */
export function containsAll(arr: unknown[], required: unknown[]): boolean {
  for (const item of required) {
    const key = serialize(item);
    const found = arr.some(el => serialize(el) === key);
    if (!found) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if all elements in arr exist in superset.
 */
export function isSubsetOf(arr: unknown[], superset: unknown[]): boolean {
  const superKeys = new Set(superset.map(serialize));
  
  for (const item of arr) {
    if (!superKeys.has(serialize(item))) {
      return false;
    }
  }
  
  return true;
}

/**
 * Checks if all elements match a predicate.
 */
export function allMatch(
  arr: unknown[],
  predicate: (item: unknown) => boolean
): boolean {
  return arr.every(predicate);
}

/**
 * Checks if no elements match a predicate.
 */
export function noneMatch(
  arr: unknown[],
  predicate: (item: unknown) => boolean
): boolean {
  return !arr.some(predicate);
}

/**
 * Checks if an array of objects is sorted by a specific key.
 */
export function isSortedBy<T>(arr: T[], key: keyof T): boolean {
  if (arr.length <= 1) {
    return true;
  }

  for (let i = 1; i < arr.length; i++) {
    const prevItem = arr[i - 1];
    const currItem = arr[i];
    
    // Add null checks for prevItem and currItem
    if (!prevItem || !currItem) {
      return false;
    }
    
    const prev = prevItem[key];
    const curr = currItem[key];

    if (typeof prev === 'number' && typeof curr === 'number') {
      if (prev > curr) return false;
    } else if (typeof prev === 'string' && typeof curr === 'string') {
      if (prev > curr) return false;
    }
  }

  return true;
}
