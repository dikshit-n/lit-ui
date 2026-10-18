# mimi-ui

Framework-agnostic UI primitives built with [Lit](https://lit.dev) and native Web Components. Consumes cleanly from React, Angular, Vue, and any framework that supports custom elements. Zero runtime dependencies beyond `lit`.

---

## Project structure

```
lit-ui/
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

**Two-file pattern per component.** Logic lives in the `.ts` file. Styles live in a sibling `.scss` file. This keeps reviews focused and the component folder portable — drop the whole folder into another project and it just works.

**Tokens and mixins are global.** Components `@use` them by path; the SASS compiler inlines the values at build time. No runtime CSS-in-JS.

---

## Architecture

### Component model

Every component is a single class extending `LitElement` registered with `@customElement('m-…')`. Three primitives define the contract:

| Layer | Mechanism | Purpose |
|---|---|---|
| **Inputs** | `@property` decorated fields | Reactive public API; reflected to HTML attributes for non-boolean primitives |
| **Outputs** | `CustomEvent` with `composed: true, bubbles: true` | Cross Shadow DOM boundaries; consumable from any framework |
| **Composition** | Named + default slots | Light-DOM children projected into the Shadow DOM |

### Encapsulation

Shadow DOM is the default. Component styles cannot leak out, and global styles cannot leak in — except via **CSS custom properties**. This is the entire theming story: consumers set `--m-color-primary` on a parent, components pick it up with a fallback.

```scss
:host {
  --_bg: var(--m-color-primary, #0066ff);   /* internal alias + fallback */
  background: var(--_bg);
}
```

Double-dash prefix (`--_bg`) is the convention for **internal** aliases derived from public design tokens. Consumers only ever touch the `m-` namespace.

### Variant strategy

Variants are **attributes on the host**, not classes on the inner element. This lets consumers target them with CSS selectors and keeps the internal class list minimal:

```scss
:host([variant='secondary']) { --_bg: #{t.$m-color-secondary-bg}; }
:host([variant='danger'])    { --_bg: #{t.$m-color-danger}; }
```

The shared `button` rule below uses the alias, so every variant gets hover/active/focus behavior automatically.

### Form-association

Components that participate in forms set `static formAssociated = true` and call `this.attachInternals()` in the constructor. This gives them:

- Participation in `<form>` submission (like a native `<button>` or `<input>`).
- The `ElementInternals` API for `formDisabledCallback`, `setFormValue`, validation hooks, etc.
- React/Angular/Vue form libraries can read their values through the standard `FormData` interface.

### Cross-framework consumption

- **React 18+**: works directly. For idiomatic JSX with typed props and synthetic events, wrap each component using `@lit/react`'s `createComponent`.
- **Angular 18+**: declare `CUSTOM_ELEMENTS_SCHEMA` in the consuming module, or register via `@angular/elements`. Form-association hooks into `NgModel` automatically.
- **Vue 3.4+**: works without config. v-model on form-associated elements is built-in.

The `composed: true` flag on every dispatched event is what makes this work — it lets the event cross the Shadow DOM boundary so framework event systems can hear it.

### Testing

- **Unit** — Vitest + happy-dom. Each component gets a co-located `.test.ts` covering props, events, slots, ARIA, and edge cases.
- **Accessibility** — `@storybook/addon-a11y` (axe-core) runs against every story. Use it as the a11y test surface.
- **Visual regression** — pair with Chromatic or Percy when ready.

### Documentation

Each component gets a co-located `.stories.ts` with controls wired to all props and a `tags: ['autodocs']` flag — Storybook generates the props table and usage examples automatically. MDX pages go alongside when a component needs a longer narrative.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR. Edit a component, see it live. |
| `npm run build` | Type-check (`tsc`) + production bundle to `dist/` as ES + CJS. |
| `npm run test` | Run the full Vitest suite once. |
| `npm run test:watch` | Re-run tests on file change. Use during development. |
| `npm run storybook` | Storybook at `http://localhost:6006`. Component explorer + a11y checks. |
| `npm run build-storybook` | Static Storybook build for deploy (Chromatic, Netlify, etc.). |

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

1. Create a folder under `src/components/m-<name>/`.
2. Add four files: `m-<name>.ts`, `m-<name>.scss`, `m-<name>.test.ts`, `m-<name>.stories.ts`.
3. Use `m-button` as the template — it has every convention you need (SASS, theming, form-association, a11y, events, slots, tests, story).
4. Re-export from `src/index.ts`.

Conventions to follow without exception:

- **Tag prefix:** `m-` (design system namespace).
- **Event prefix:** `m-<component>-<event>` — e.g. `m-change`, `m-button-click`. Always `composed: true, bubbles: true`.
- **Boolean props:** `@property({ type: Boolean })`. Reflect to attribute only if consumers need CSS targeting.
- **Slots:** default for the primary content, named slots for structural pieces (e.g. `icon`).
- **A11y:** every interactive component gets `:focus-visible`, `aria-busy` for loading states, and a real semantic element under the hood (button, input, etc.).
- **Motion:** wrap transitions in `@media (prefers-reduced-motion: no-preference)` or always provide a reduced-motion override.

---

## What's intentionally not here

- **No CSS-in-JS.** SASS + CSS custom properties handle theming with zero runtime cost.
- **No state management.** Components are stateless inputs → events. Consumers own state.
- **No build-time framework wrappers yet.** The path is `custom-elements-manifest` analyzer → generate React/Vue wrappers from the manifest. Set that up once you have ≥ 5 components and a concrete consumer asking for it.
- **No monorepo.** Single package until a second consumer (React app, Angular app, Vue app) lives in the same repo. Split then with npm workspaces.
