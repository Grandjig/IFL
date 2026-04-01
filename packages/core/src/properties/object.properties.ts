/**
 * IFL Object Property Helpers
 * Built-in property functions for use in intent declarations.
 */

/**
 * Checks if an object has all required fields.
 */
export function hasRequiredFields(obj: unknown, fields: string[]): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const o = obj as Record<string, unknown>;
  
  for (const field of fields) {
    if (!(field in o)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if an object has no fields other than the allowed ones.
 */
export function hasNoExtraFields(obj: unknown, allowedFields: string[]): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const allowedSet = new Set(allowedFields);
  const keys = Object.keys(obj as object);

  for (const key of keys) {
    if (!allowedSet.has(key)) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality comparison between two values.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  // Same reference or both primitives with same value
  if (a === b) {
    return true;
  }

  // Handle null
  if (a === null || b === null) {
    return a === b;
  }

  // Different types
  if (typeof a !== typeof b) {
    return false;
  }

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle RegExp
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // One is array, other is not
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bObj, key)) {
        return false;
      }
      if (!isDeepEqual(aObj[key], bObj[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Checks if a value is not null and not undefined.
 */
export function isNonNull(value: unknown): boolean {
  return value !== null && value !== undefined;
}

/**
 * Validates that an object matches a type schema.
 * Schema maps field names to type strings: 'string', 'number', 'boolean', 'array', 'object'
 */
export function isValidShape<T>(
  obj: unknown,
  schema: Partial<Record<keyof T, string>>
): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const o = obj as Record<string, unknown>;

  for (const [field, expectedType] of Object.entries(schema)) {
    const value = o[field];

    // Field doesn't exist
    if (value === undefined) {
      return false;
    }

    // Check type
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') return false;
        break;
      case 'number':
        if (typeof value !== 'number') return false;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
      case 'array':
        if (!Array.isArray(value)) return false;
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        break;
      default:
        // Unknown type string, skip validation
        break;
    }
  }

  return true;
}

/**
 * Checks if an object satisfies all provided predicates.
 */
export function satisfiesAll(
  obj: unknown,
  predicates: Array<(o: unknown) => boolean>
): boolean {
  for (const predicate of predicates) {
    if (!predicate(obj)) {
      return false;
    }
  }
  return true;
}
