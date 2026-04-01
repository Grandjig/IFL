/**
 * IFL String Property Helpers
 * Built-in property functions for use in intent declarations.
 */

/**
 * Checks if a string is non-empty.
 */
export function isNonEmpty(str: string): boolean {
  return str.length > 0;
}

/**
 * Checks if a string has at least min characters.
 */
export function hasMinLength(str: string, min: number): boolean {
  return str.length >= min;
}

/**
 * Checks if a string has at most max characters.
 */
export function hasMaxLength(str: string, max: number): boolean {
  return str.length <= max;
}

/**
 * Checks if a string is a valid email address.
 * Uses RFC 5322 compliant regex (simplified version).
 */
export function isEmail(str: string): boolean {
  // RFC 5322 compliant email regex (simplified but comprehensive)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(str);
}

/**
 * Checks if a string is a valid URL.
 */
export function isUrl(str: string): boolean {
  try {
    const u = new (globalThis as any).URL(str);
    return !!u.protocol;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid JSON.
 */
export function isJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string matches a regular expression pattern.
 */
export function matches(str: string, pattern: RegExp): boolean {
  return pattern.test(str);
}

/**
 * Checks if a string is one of the allowed options.
 */
export function isOneOf(str: string, options: string[]): boolean {
  return options.includes(str);
}

/**
 * Checks if a string contains a substring.
 */
export function containsSubstring(str: string, sub: string): boolean {
  return str.includes(sub);
}

/**
 * Checks if a string contains only alphanumeric characters.
 */
export function isAlphanumeric(str: string): boolean {
  if (str.length === 0) {
    return false;
  }
  return /^[a-zA-Z0-9]+$/.test(str);
}
