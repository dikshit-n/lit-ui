# Consumer Integration Plan

> How mimi-ui ships to React, Angular, and Vue consumers. Work in progress —
> the design system is in scaffolding; this plan is the roadmap to a
> publishable, multi-framework distribution.

---

## Goals

- **One install, multiple subpath imports.** Consumers `npm install @first-apps/mimi-ui` once and pick the framework entry they need.
- **Idiomatic DX per framework.** Typed JSX props/events for React; declarative templates for Angular; native slots for Vue. Consumers never write `<m-button>` and a manual `customElements.define`.
- **Tree-shakeable.** Consumers ship only the components they import.
- **Zero config for the typical consumer.** Targeted, minimal setup per framework; no bundler plugin required for the default case.

---

## Current state

- Source exports `MButton`, `MCounter`, `MClock` from `src/index.ts` (vanilla only).
- `vite build` already runs in library mode and emits ES + CJS to `dist/` (7.24 kB ES / 6.76 kB CJS).
- `package.json` is `private: true`. No `main`/`module`/`types`/`exports`/`files`/`sideEffects`. Not publishable.
- No `custom-elements.json`. No framework wrappers. No published type declarations.
- Storybook covers a11y + variants in isolation; no cross-framework smoke tests.

---

## Distribution shape

Single npm package, subpath exports:

| Subpath | Contents | Use when |
|---|---|---|
| `@first-apps/mimi-ui` | Vanilla LitElement classes | Plain HTML, native web-component projects |
| `@first-apps/mimi-ui/react` | `createComponent`-based React wrappers | React 18+ |
| `@first-apps/mimi-ui/angular` | Type declarations + `CUSTOM_ELEMENTS_SCHEMA` helpers | Angular 18+ |
| `@first-apps/mimi-ui/vue` | Typed `defineCustomElement` plugins | Vue 3.4+ |

The consumer's bundler resolves each subpath to its own ESM/CJS/types entry, declared via the `exports` map in `package.json`.

---

## Build-level changes to mimi-ui

### 1. Multi-entry Vite library build

The current `vite.config.ts` has a single entry (`src/index.ts`). The new build needs one input per subpath:

```ts
// vite.lib.config.ts (new)
build: {
  lib: {
    entry: {
      'index': resolve(__dirname, 'src/index.ts'),
      'react/index': resolve(__dirname, 'src/react/index.ts'),
      'angular/index': resolve(__dirname, 'src/angular/index.ts'),
      'vue/index': resolve(__dirname, 'src/vue/index.ts'),
    },
    formats: ['es', 'cjs'],
    fileName: (format, entryName) => `${entryName}.${format}.js`,
  },
  rollupOptions: {
    external: [/^lit/, /^@lit\//, 'react', 'react-dom', /^@angular\//, 'vue'],
  },
}
```

Keep a separate `vite.config.ts` for the application-style dev/build that powers Storybook and the demo. A new `npm run build:lib` script invokes the library config.

### 2. Custom Elements Manifest

Add `@custom-elements-manifest/analyzer` (v0.11.0) to the toolchain:

- Run as a prebuild step (`npm run analyze`).
- Emits `custom-elements.json` at the package root.
- The manifest is the source of truth for: type generation, framework wrappers, IDE hints, future auto-generation, Storybook controls.

Wired through `cem` config in `package.json` or a `cem.config.js` (JSDoc + decorator introspection).

### 3. TypeScript declaration generation

Consumers need `.d.ts` for typed props, events, and slots. Use `vite-plugin-dts` (v5.1.2) — it runs inside the Vite library build and emits declaration files alongside the JS output, keyed by the same multi-entry map.

If a class of type can't be resolved (rare edge cases in Lit decorator typing), fall back to `tsc --emitDeclarationOnly` for the affected entry only.

### 4. `package.json` publishing surface

```jsonc
{
  "private": false,                          // was: true
  "main": "./dist/index.cjs.js",
  "module": "./dist/index.es.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.es.js",
      "require": "./dist/index.cjs.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.es.js",
      "require": "./dist/react/index.cjs.js"
    },
    "./angular": { /* same shape */ },
    "./vue":     { /* same shape */ }
  },
  "files": ["dist", "custom-elements.json", "README.md", "docs/"],
  "sideEffects": false,                      // critical for tree-shaking
  "customElements": "./custom-elements.json"
}
```

`sideEffects: false` is the key flag — it tells bundlers they can drop unused exports aggressively. Re-validate after adding CSS-only side-effect imports (none today, but worth checking once a component uses a font or polyfill).

---

## Per-framework integration recipe

### React

**Wrapper generation: manual, one wrapper per component**, using `@lit/react`'s `createComponent` (v1.0.8). Rationale: at the current surface (3 components) manual wrappers keep types tight, the diff between vanilla and React intentional, and the dependency on a CEM-analyzer → wrapper codegen tool unnecessary. Re-evaluate auto-generation once component count crosses ~10.

Wrapper file pattern (`src/react/m-button.ts`):

```ts
import { createComponent } from '@lit/react';
import { MButton as MButtonEl } from '../components/m-button/m-button';

export const MButton = createComponent({
  tagName: 'm-button',
  elementClass: MButtonEl,
  events: { onClick: 'm-button-click' as const },
});
```

**Consumer-side**: zero config. Vite, Next.js, CRA, Remix — all work out of the box once `@lit/react` is on the consumer's dep tree (peer of mimi-ui). The wrapper exposes the element class as a JSX component with typed props, refs, and event handlers.

**Required consumer deps**: `@lit/react` (peer of mimi-ui), `react` ≥ 18, `react-dom` ≥ 18.

### Angular

Angular's first-class path for custom elements is `CUSTOM_ELEMENTS_SCHEMA`. mimi-ui ships:

1. `.d.ts` files for every component (props, events, slots).
2. An `angular/index.ts` that re-exports the type declarations and, optionally, registers components via `@angular/elements` for projects that need them as Angular components rather than raw custom elements.

**Consumer-side setup** (one line per module that uses `<m-*>`):

```ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA], /* ... */ })
export class FeatureModule {}
```

**NgModel / Reactive Forms integration**: any `<m-input>` that sets `static formAssociated = true` and calls `attachInternals()` participates in `<form>` submission automatically. Angular's `ngModel` reads through `ElementInternals` without extra wiring.

**Build plugin (if consumer publishes a library)**: `ng-packagr` with `customElements: 'valid'` so its template schema check accepts `<m-*>` tags. Documented in the consumer's `ng-package.json` snippet, not mimi-ui's.

### Vue

Vue 3.4+ has first-class custom element support. **No consumer-side plugin required**.

mimi-ui ships an optional `vue/index.ts` exporting typed `defineCustomElement` plugins for advanced use cases (e.g. consumers who want to alias `<m-button>` to `<AppButton>`):

```ts
import { defineCustomElement } from 'vue';
import { MButtonEl } from '@first-apps/mimi-ui';

export const MButton = defineCustomElement({ 'm-button': MButtonEl });
```

**Consumer-side**: zero config for the default case. `v-model` on form-associated elements is built-in. `v-bind`/`v-on` map to props/events. Slots project natively.

**TypeScript**: Volar picks up the `.d.ts` from the package's `types` field automatically.

---

## Plugin inventory

| Plugin | Role | Why |
|---|---|---|
| `@custom-elements-manifest/analyzer` (dev) | Generate `custom-elements.json` | Source of truth for types and future auto-generation |
| `vite-plugin-dts` (dev) | Emit `.d.ts` per entry during library build | Consumer-side type safety without `tsc` |
| `@lit/react` (peerDep) | `createComponent` for React wrappers | Lit team's official React binding |
| `@angular/elements` (consumer-side, optional) | Component registration for projects that need it | For projects that want `<m-button>` as an Angular component, not a custom element |

**Future candidates** (when component count or consumer needs grow):
- CEM → framework-wrapper auto-generation (eliminate the per-component React wrapper file).
- `@lit/task` for async state inside components.
- `lit-ssr` for server-side rendering of web components.

---

## Modularization strategy (src layout)

```
src/
├── index.ts                    # Vanilla public entry (existing)
├── react/
│   ├── index.ts                # Re-exports all React wrappers
│   └── m-button.ts             # One wrapper per component
├── angular/
│   ├── index.ts                # Type re-exports + registration helpers
│   └── m-button.ts             # Optional: define-component helpers
├── vue/
│   ├── index.ts                # defineCustomElement plugins
│   └── m-button.ts
├── components/                 # Source (unchanged)
│   └── m-<name>/
│       ├── m-<name>.ts
│       ├── m-<name>.scss
│       ├── m-<name>.test.ts
│       └── m-<name>.stories.ts
└── styles/
    ├── _tokens.scss
    └── _mixins.scss
```

Each framework folder maps to one entry in Vite's library build. The current `src/index.ts` continues to be the vanilla entry — framework folders are purely additive.

---

## Cross-framework testing

Three layers, increasing in scope:

1. **Component-level** (existing) — Vitest + happy-dom. Covers Lit behavior in isolation: registration, props, events, slots, a11y, form-association lifecycle.
2. **Visual regression** — Chromatic. The existing Storybook is the source of truth; Chromatic diffs per `.storybook` configuration. Catches unintended style changes across components.
3. **Cross-framework smoke** — Playwright. A minimal test app per framework (React, Angular, Vue) renders a few stories and asserts that the custom element upgrades and the framework event hookups work. Run on CI; not a unit test.

The third layer catches regressions like "Lit works but the React wrapper lost the event name" — class of bug that doesn't show up in either Vitest or Chromatic.

---

## Staging

Smallest surface to largest:

1. **Vite library mode + multi-entry build** — vanilla works as a real package.
2. **`custom-elements.json` via the analyzer** — unblocks types for steps 3-6.
3. **`vite-plugin-dts` + `.d.ts` outputs** — all framework consumers get typed props/events.
4. **`package.json` publishing surface** — `private: false`, `exports` map, `files`, `sideEffects: false`, `customElements` field.
5. **React wrappers** — biggest payoff (most React users; biggest DX gap vs raw custom elements).
6. **Angular `CUSTOM_ELEMENTS_SCHEMA` types + helpers** — small surface.
7. **Vue typed plugin** — smallest, because Vue already supports custom elements natively.
8. **Cross-framework Playwright tests** — once consumers are using the wrappers.

Steps 1-4 are prerequisites for any framework work. Steps 5-7 are parallelizable. Step 8 is a follow-up after at least one framework integration is in production.

---

## Out of scope (for this plan)

- **SSR / hydration.** Add `lit-ssr` when a consumer reports a real SSR need; the current SPA-only assumption is fine for v1.
- **Visual diffing between frameworks.** Same component rendered in React vs Vue should look identical; Chromatic's per-story snapshot covers this implicitly, but no cross-framework diff is set up.
- **Monorepo split.** Today this is a single package. Splitting the React wrappers into `@first-apps/mimi-ui-react` only pays off if consumers want to install React/Angular/Vue independently. Not now.
- **Auto-generated wrappers from CEM.** Manual wrappers are fine at this scale; revisit when count crosses ~10.