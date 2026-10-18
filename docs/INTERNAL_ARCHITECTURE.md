# Internal Architecture

> Design-system internals for maintainers. Component-level conventions live
> in [COMPONENT_STANDARDS.md](./COMPONENT_STANDARDS.md); the completion
> checklist is in [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md).

---

## Styling

How a primitive design value reaches a rendered component, and how a
consumer rethemes it without touching component source.

```
                     DESIGN SYSTEM: BUILD TIME & RUNTIME

       BUILD TIME                                      RUNTIME
  ────────────────────────                 ──────────────────────────

  ┌───────────────────┐
  │   Primitives      │
  │                   │
  │  _tokens.scss     │
  │  _mixins.scss     │
  │                   │
  │  Source of Truth  │
  └─────────┬─────────┘
            │
            │ @use
            ▼
  ┌───────────────────┐
  │ Component SCSS    │
  │                   │
  │  3-layer alias    │
  │  chain            │
  │                   │
  │  Component styles │
  └─────────┬─────────┘
            │
            │ Vite
            │ ?inline
            ▼
  ┌───────────────────┐
  │ Component TS      │
  │                   │
  │  unsafeCSS()      │
  │       ↓           │
  │  CSSResult        │
  └─────────┬─────────┘
            │
            │ Lit applies styles
            | ___________________________________
                                                |
                                                ▼
                                      ┌──────────────────────┐
                                      │      Shadow DOM      │
                                      │                      │
                                      │  Component styles    │
                                      │                      │
                                      │  Internal aliases    │
                                      │         ↓ maps to    │
                                      │  Public CSS property │
                                      └──────────▲───────────┘
                                                 │
                              CSS custom property│
                                   inheritance   │
                                                 │
                                      ┌──────────┴───────────┐
                                      │      Consumer        │
                                      │                      │
                                      │  Sets --m-* on       │
                                      │  an ancestor         │
                                      │                      │
                                      │  Rethemes at runtime │
                                      │  No source edit      │
                                      │  No rebuild          │
                                      └──────────────────────┘
```

**Build time.** Primitives (`_tokens.scss`, `_mixins.scss`) are the single
source of design values. The component SCSS `@use`s them and declares a
three-layer alias chain on `:host` — an internal alias (`--_alias`) that
resolves through a public custom property (`--m-public`) with a SASS-token
fallback. Vite compiles the SCSS to a CSS string via `?inline`; the
component TS wraps it in `unsafeCSS`; Lit applies the result inside the
shadow root.

**Runtime.** The internal alias resolves at the element, walking
consumer-override → public-property → SASS-token. A consumer retheme is
just setting `--m-public` on any ancestor — CSS custom-property inheritance
carries the value into the shadow root, the alias re-resolves, and every
rule referencing it updates. No source edit, no rebuild.