# mimi-ui

Framework-agnostic UI primitives built with [Lit](https://lit.dev) and native Web Components. Consumes cleanly from React, Angular, Vue, and any framework that supports custom elements. Zero runtime dependencies beyond `lit`.

---

## Documentation

Two companion documents in `docs/`:

- **[Component standards](./docs/COMPONENT_STANDARDS.md)** — engineering fundamentals: reactive state, form-association internals, theming, a11y, events, performance, testing, Storybook.
- **[Definition of done](./docs/DEFINITION_OF_DONE.md)** — the checklist that gates "this component is ready to ship."

The rest of this README is project-level orientation: structure, scripts, setup, architectural overview, scope.

---

## Project structure

```
lit-ui/
├── docs/
│   ├── COMPONENT_STANDARDS.md    # Engineering fundamentals
│   └── DEFINITION_OF_DONE.md     # Component-completion checklist
├── src/
│   ├── components/
│   │   ├── m-counter/              # Reference: Lit primitives, a11y, events
│   │   │   ├── m-counter.ts
│   │   │   ├── m-counter.test.ts
│   │   │   └── m-counter.stories.ts
│   │   └── m-button/               # Production template: SASS, theming,
│   │       │                        #   form-association, slots, a11y
│   │       ├── m-button.ts
│   │       ├── m-button.scss
│   │       ├── m-button.test.ts
│   │       └── m-button.stories.ts
│   ├── styles/
│   │   ├── _tokens.scss             # Design tokens (color, space, radius, motion)
│   │   └── _mixins.scss             # Reusable SASS mixins
│   └── index.ts                     # Public package entry — re-exports all components
├── tsconfig.json
├── vite.config.ts
├── vitest.setup.ts
└── package.json
```

**Component folder is portable.** Each `m-<name>/` folder is self-contained: logic, styles, tests, and stories live together. Tokens and mixins are global; components `@use` them by path. See
[§1 File structure](./docs/COMPONENT_STANDARDS.md#1-file-structure) and
[§5 Theming](./docs/COMPONENT_STANDARDS.md#5-theming-public-internal-scss-fallback) for the conventions.

---

## Architecture

### Component model

Every component is a single class extending `LitElement` registered with `@customElement('m-…')`. Three primitives define the contract:

| Layer | Mechanism | Purpose |
|---|---|---|
| **Inputs** | `@property` decorated fields | Reactive public API; reflected to HTML attributes where the standard requires (see [§4 Variants](./docs/COMPONENT_STANDARDS.md#4-variants-on-the-host-not-inner-classes)) |
| **Outputs** | `CustomEvent` with `composed: true, bubbles: true` | Cross Shadow DOM boundaries; consumable from any framework (see [§7 Events](./docs/COMPONENT_STANDARDS.md#7-events)) |
| **Composition** | Named + default slots | Light-DOM children projected into the Shadow DOM |

### Cross-framework consumption

- **React 18+**: works directly. For idiomatic JSX with typed props and synthetic events, wrap each component using `@lit/react`'s `createComponent`.
- **Angular 18+**: declare `CUSTOM_ELEMENTS_SCHEMA` in the consuming module, or register via `@angular/elements`. Form-association hooks into `NgModel` automatically.
- **Vue 3.4+**: works without config. v-model on form-associated elements is built-in.

The `composed: true` flag on every dispatched event is what makes this work — it lets the event cross the Shadow DOM boundary so framework event systems can hear it.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR. Edit a component, see it live. |
| `npm run build` | Type-check (`tsc`) + production bundle to `dist/` as ES + CJS. |
| `npm run test` | Run the full Vitest suite once. |
| `npm run test:watch` | Re-run tests on file change. Use during development. |
| `npm run storybook` | Storybook at `http://localhost:6006`. Component explorer + a11y checks. |
| `npm run build:storybook` | Static Storybook build for deploy (Chromatic, Netlify, etc.). |

Add `npm run lint` and `npm run format` when you wire ESLint + Prettier — the rest of the tooling is intentionally minimal until you have a team convention to follow.

---

## Local setup

**Prerequisites**

- Node.js ≥ 20

**From scratch**

```bash
git clone <repo-url> lit-ui
cd m-ui
npm install
```

**Run the dev server**

```bash
npm run dev
```

Open the printed URL. Edit any component under `src/components/` — Vite hot-reloads.

**Run tests**

```bash
npm run test          # one-shot
npm run test:watch    # watch mode
```

**Run Storybook**

```bash
npm run storybook
```

Open `http://localhost:6006`. The a11y tab in each story's panel runs axe-core against the rendered component and surfaces violations.

**Build for production**

```bash
npm run build         # emits dist/m-ui.es.js + dist/m-ui.cjs.js
```

The bundle is tree-shakeable — consumers only ship the components they import.

---

## Adding a new component

The fastest path: open **[DEFINITION_OF_DONE.md](./docs/DEFINITION_OF_DONE.md)** and run the checklist. Every box needs to be checked before merging. For the "why" behind each item, see **[COMPONENT_STANDARDS.md](./docs/COMPONENT_STANDARDS.md)**.

Use `m-button` as the working template — it implements every convention in the checklist and the standards doc.

---

## What's intentionally not here

- **No CSS-in-JS.** SASS + CSS custom properties handle theming with zero runtime cost.
- **No state management.** Components are stateless inputs → events. Consumers own state.
- **No build-time framework wrappers yet.** The path is `custom-elements-manifest` analyzer → generate React/Vue wrappers from the manifest. Set that up once you have ≥ 5 components and a concrete consumer asking for it.
- **No monorepo.** Single package until a second consumer (React app, Angular app, Vue app) lives in the same repo. Split then with npm workspaces.