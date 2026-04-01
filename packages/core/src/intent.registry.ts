/**
 * IFL Intent Registry
 * Singleton registry that stores all @intent declarations.
 */

import type {
  IntentDeclaration,
  RegisteredIntent,
  ViolationReport,
} from './types/index.js';

/**
 * Singleton registry for all intent declarations.
 * Stores metadata about decorated functions and tracks violations.
 */
class IntentRegistry {
  private static instance: IntentRegistry | null = null;
  private store: Map<string, RegisteredIntent>;

  private constructor() {
    this.store = new Map();
  }

  /**
   * Gets the singleton instance of the registry.
   */
  static getInstance(): IntentRegistry {
    if (!IntentRegistry.instance) {
      IntentRegistry.instance = new IntentRegistry();
    }
    return IntentRegistry.instance;
  }

  /**
   * Registers a new intent declaration for a function.
   * If already registered, updates the registration.
   */
  register(
    functionName: string,
    file: string,
    declaration: IntentDeclaration<unknown[], unknown>
  ): void {
    const existing = this.store.get(functionName);
    
    const registration: RegisteredIntent = {
      declaration,
      functionName,
      file,
      registeredAt: new Date(),
      violationCount: existing?.violationCount ?? 0,
      lastViolation: existing?.lastViolation,
    };

    this.store.set(functionName, registration);
  }

  /**
   * Gets the registered intent for a function by name.
   */
  get(functionName: string): RegisteredIntent | undefined {
    return this.store.get(functionName);
  }

  /**
   * Gets all registered intents.
   */
  getAll(): Map<string, RegisteredIntent> {
    return new Map(this.store);
  }

  /**
   * Clears all registrations. Useful for testing.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the number of registered intents.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Increments the violation count for a function and stores the latest violation.
   */
  incrementViolationCount(functionName: string, violation: ViolationReport): void {
    const registration = this.store.get(functionName);
    if (registration) {
      registration.violationCount++;
      registration.lastViolation = violation;
    }
  }

  /**
   * Gets all intents that match the given tags.
   * If no tags provided, returns all intents.
   */
  getByTags(tags: string[]): Map<string, RegisteredIntent> {
    if (tags.length === 0) {
      return this.getAll();
    }

    const filtered = new Map<string, RegisteredIntent>();
    
    for (const [name, registration] of this.store) {
      const intentTags = registration.declaration.tags ?? [];
      const hasMatchingTag = tags.some(tag => intentTags.includes(tag));
      if (hasMatchingTag) {
        filtered.set(name, registration);
      }
    }

    return filtered;
  }

  /**
   * Gets statistics about registered intents.
   */
  getStats(): {
    totalIntents: number;
    totalViolations: number;
    functionsByViolationCount: Array<{ name: string; count: number }>;
  } {
    let totalViolations = 0;
    const functionsByViolationCount: Array<{ name: string; count: number }> = [];

    for (const [name, registration] of this.store) {
      totalViolations += registration.violationCount;
      functionsByViolationCount.push({
        name,
        count: registration.violationCount,
      });
    }

    functionsByViolationCount.sort((a, b) => b.count - a.count);

    return {
      totalIntents: this.store.size,
      totalViolations,
      functionsByViolationCount,
    };
  }
}

export { IntentRegistry };
export const intentRegistry = IntentRegistry.getInstance();
