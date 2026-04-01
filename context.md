You are building IFL (Intent-First Layer) — a TypeScript library that makes 
programmer intent verifiable at runtime. This is the foundation prompt.
Do not build the full system yet. Only build what is listed here.

TECH STACK (exact versions, no substitutions):
- TypeScript 5.x strict mode
- fast-check (property-based testing / fuzzing)
- chalk@4 (NOT v5 — CJS compatibility)
- commander (CLI parsing)
- ts-morph (AST analysis)
- vitest (tests)
- tsx (TS execution)
- reflect-metadata (decorator support)

CREATE THIS EXACT STRUCTURE:
ifl/
├── package.json (workspace root)
├── tsconfig.base.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── types/
│   │           └── index.ts
│   └── cli/
│       ├── package.json
│       └── tsconfig.json

FILE 1: package.json (workspace root)
npm workspaces monorepo pointing to packages/*.
Scripts: build, test, dev.
devDependencies at root: typescript, tsx, vitest, ts-morph.
No application dependencies at root level.

FILE 2: tsconfig.base.json
Strict mode. Target ES2022. Module NodeNext. 
experimentalDecorators: true. emitDecoratorMetadata: true.
useDefineForClassFields: false (required for decorators).
Include paths for workspace packages.

FILE 3: packages/core/package.json
name: @ifl/core
dependencies: fast-check, chalk@4, reflect-metadata
exports field with ESM and CJS conditions and types.
main, module, types fields all set correctly.
build script: tsc --build

FILE 4: packages/core/tsconfig.json
Extends ../../tsconfig.base.json
rootDir: ./src, outDir: ./dist
Composite: true for project references.

FILE 5: packages/cli/package.json
name: @ifl/cli
bin field: { "ifl": "./dist/index.js" }
dependencies: commander, chalk@4, @ifl/core (workspace:*)

FILE 6: packages/cli/tsconfig.json
Extends ../../tsconfig.base.json
References @ifl/core package.

FILE 7: packages/core/src/types/index.ts
Define ALL types for the entire system.

IntentDeclaration<TInput extends any[], TOutput>:
  ensures?: (input: TInput, output: TOutput) => boolean
  requires?: (...input: TInput) => boolean
  handles?: Array<{
    when: (...input: TInput) => boolean,
    returns: TOutput | ((...input: TInput) => TOutput)
  }>
  description?: string
  samplingRate?: number  (0-1, default 1.0 dev / 0.01 prod)
  onViolation?: 'throw' | 'warn' | 'log' | ((violation: ViolationReport) => void)
  tags?: string[]

ViolationReport:
  id: string
  timestamp: Date
  functionName: string
  functionFile: string
  violationType: 'precondition' | 'postcondition' | 'edge_case' | 'exception'
  declaredIntent: string
  input: unknown[]
  actualOutput: unknown
  expectedOutput?: unknown
  causalChain: CausalStep[]
  suggestedFix?: string
  confidence: number
  stackTrace: string

CausalStep:
  step: number
  description: string
  passed: boolean
  value?: unknown

RegisteredIntent:
  declaration: IntentDeclaration<any[], any>
  functionName: string
  file: string
  registeredAt: Date
  violationCount: number
  lastViolation?: ViolationReport

AIVerificationResult:
  passed: boolean
  violations: ViolationReport[]
  staticIssues: StaticIssue[]
  confidence: number
  recommendation: 'accept' | 'reject' | 'review'
  reasoning: string

StaticIssue:
  type: 'missing_null_check' | 'unchecked_async' | 'type_mismatch' | 'unreachable_edge_case' | 'other'
  description: string
  line?: number
  severity: 'error' | 'warning' | 'info'

MonitoringSession:
  startedAt: Date
  totalChecks: number
  totalViolations: number
  samplingRate: number

Export all types as named exports. No default exports in this file.

After creating all files, run:
npm install

Show the output. Fix any errors before stopping.