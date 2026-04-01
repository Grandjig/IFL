# Getting Started with IFL

This guide will help you set up IFL in your TypeScript project and write your first intent declaration.

## 1. Installation

```bash
npm install @ifl/core
```

Or with yarn:

```bash
yarn add @ifl/core
```

Or with pnpm:

```bash
pnpm add @ifl/core
```

## 2. TypeScript Configuration

IFL uses TypeScript decorators, which require specific compiler options. Add these to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### Required Options Explained

| Option | Why It's Needed |
|--------|----------------|
| `experimentalDecorators` | Enables the `@intent` decorator syntax |
| `emitDecoratorMetadata` | Allows IFL to read function parameter types |
| `useDefineForClassFields` | Ensures decorators run at the right time |

## 3. Your First Intent Declaration

Create a file `src/example.ts`:

```typescript
import 'reflect-metadata';
import { intent, isSorted, sameElements } from '@ifl/core';

// Define a function with intent
const sortNumbers = intent({
  description: 'Sorts an array of numbers in ascending order',
  requires: (arr) => Array.isArray(arr) && arr.every(n => typeof n === 'number'),
  ensures: (input, output) => isSorted(output) && sameElements(input[0], output),
  handles: [
    { when: (arr) => arr.length === 0, returns: [] },
    { when: (arr) => arr.length === 1, returns: (arr) => [...arr] }
  ],
  onViolation: 'warn'
})((arr: number[]): number[] => {
  return [...arr].sort((a, b) => a - b);
});

// Use the function normally
console.log(sortNumbers([3, 1, 4, 1, 5, 9, 2, 6]));
// Output: [1, 1, 2, 3, 4, 5, 6, 9]

console.log(sortNumbers([]));
// Output: []
```

Run it:

```bash
npx tsx src/example.ts
```

## 4. Decorator vs Function Wrapper Syntax

IFL supports both decorator syntax and function wrapper syntax. Choose based on your preference and environment.

### Decorator Syntax (Class Methods)

```typescript
import { intent } from '@ifl/core';

class Calculator {
  @intent({
    ensures: (input, output) => output === input[0] + input[1]
  })
  add(a: number, b: number): number {
    return a + b;
  }
}
```

### Function Wrapper Syntax (Standalone Functions)

```typescript
import { intent } from '@ifl/core';

const add = intent({
  ensures: (input, output) => output === input[0] + input[1]
})((a: number, b: number): number => {
  return a + b;
});
```

### When to Use Which

| Use Decorator Syntax When | Use Function Wrapper When |
|---------------------------|---------------------------|
| Working with class methods | Working with standalone functions |
| Using TypeScript with `experimentalDecorators` | Using environments without decorator support |
| Prefer cleaner visual separation | Need to wrap existing functions |

Both syntaxes provide identical functionality — the same verification, the same violation reports, the same performance characteristics.

## 5. Troubleshooting

### "experimentalDecorators is not enabled"

**Problem:** TypeScript error about decorators not being enabled.

**Solution:** Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

If using VS Code, you may need to restart the TypeScript server (Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server").

---

### "Cannot find module '@ifl/core'"

**Problem:** Module resolution fails after installation.

**Solution:** Check the following:

1. Verify the package is installed:
   ```bash
   npm ls @ifl/core
   ```

2. Check your `tsconfig.json` has correct module resolution:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "NodeNext"
     }
   }
   ```

3. If using a monorepo, ensure the package is hoisted or linked correctly.

---

### "Violations not being caught"

**Problem:** Functions with intentional bugs don't trigger violations.

**Solution:** Check the `samplingRate` setting:

```typescript
// This will NEVER check (samplingRate: 0)
@intent({
  ensures: ...,
  samplingRate: 0  // ← Bug: no checks will occur
})

// This will ALWAYS check (samplingRate: 1)
@intent({
  ensures: ...,
  samplingRate: 1  // ← Correct for development
})
```

In production, the default `samplingRate` is `0.01` (1% of calls). For testing, explicitly set it to `1`.

---

### "Type errors on intent declaration"

**Problem:** TypeScript complains about types in `ensures` or `requires`.

**Solution:** Ensure your generic types match the function signature:

```typescript
// Wrong: generic types don't match
const fn = intent<[string], number>({  // Claims input is string
  ensures: (input, output) => output > 0
})((n: number) => n * 2);  // But function takes number

// Correct: let TypeScript infer, or match explicitly
const fn = intent({
  ensures: (input, output) => (output as number) > 0
})((n: number) => n * 2);

// Or with explicit types:
const fn = intent<[number], number>({
  ensures: (input, output) => output > 0
})((n: number) => n * 2);
```

---

### "reflect-metadata errors"

**Problem:** Runtime error about `Reflect.metadata` not being defined.

**Solution:** Import `reflect-metadata` at your application's entry point:

```typescript
// At the TOP of your main file (index.ts, app.ts, etc.)
import 'reflect-metadata';

// Then your other imports
import { intent } from '@ifl/core';
```

This import must come before any code that uses decorators.

---

### "Violation reports show wrong file path"

**Problem:** The `functionFile` in violation reports shows the wrong location.

**Solution:** This can happen with bundlers that transform source maps. For accurate file paths:

1. Enable source maps in your build:
   ```json
   {
     "compilerOptions": {
       "sourceMap": true
     }
   }
   ```

2. If using a bundler (webpack, esbuild, vite), configure it to preserve source maps.

---

### "Performance issues in production"

**Problem:** IFL is slowing down production code.

**Solution:** Reduce the sampling rate:

```typescript
@intent({
  ensures: ...,
  samplingRate: process.env.NODE_ENV === 'production' ? 0.001 : 1.0
})
```

With `samplingRate: 0.001`, only 0.1% of calls are verified. The sampling check is the very first thing IFL does — if sampling doesn't trigger, there's essentially zero overhead.

---

## Next Steps

- Read the [full API reference](../README.md#intent-declaration-api)
- Explore the [examples](../examples/) directory
- Learn about [AI code verification](../README.md#verifying-ai-generated-code-the-ai-slop-killer)
