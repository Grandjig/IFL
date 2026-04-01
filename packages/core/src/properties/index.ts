/**
 * IFL Property Helpers Index
 * Re-exports all property helpers from their respective modules.
 */

// Array properties
export {
  isSorted,
  sameElements,
  isUnique,
  hasLength,
  isNonEmpty as arrayIsNonEmpty,
  containsAll,
  isSubsetOf,
  allMatch,
  noneMatch,
  isSortedBy,
} from './array.properties.js';

// Also export isNonEmpty directly for convenience when context is clear
export { isNonEmpty as isArrayNonEmpty } from './array.properties.js';

// Object properties
export {
  hasRequiredFields,
  hasNoExtraFields,
  isDeepEqual,
  isNonNull,
  isValidShape,
  satisfiesAll,
} from './object.properties.js';

// String properties
export {
  isNonEmpty as stringIsNonEmpty,
  hasMinLength,
  hasMaxLength,
  isEmail,
  isUrl,
  isJson,
  matches,
  isOneOf,
  containsSubstring,
  isAlphanumeric,
} from './string.properties.js';

// Also export isNonEmpty directly for string with different name
export { isNonEmpty as isStringNonEmpty } from './string.properties.js';

// Number properties
export {
  isPositive,
  isNegative,
  isNonNegative,
  isInRange,
  isInteger,
  isFiniteNumber,
  isPercentage,
  isProportion,
  isGreaterThan,
  isLessThan,
} from './number.properties.js';

// Re-export modules for namespaced access
import * as arrayProperties from './array.properties.js';
import * as objectProperties from './object.properties.js';
import * as stringProperties from './string.properties.js';
import * as numberProperties from './number.properties.js';

export const arrays = arrayProperties;
export const objects = objectProperties;
export const strings = stringProperties;
export const numbers = numberProperties;
