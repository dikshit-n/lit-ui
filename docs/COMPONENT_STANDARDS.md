# Component Standards

> Engineering fundamentals for every component in this design system. Apply at
> design time; verify before marking a component done — see
> [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md). The architectural
> conventions (variants, encapsulation, cross-framework consumption) live in
> the root [`README.md`](../README.md).

---

## 1. File structure

```
src/components/m-<name>/
├── m-<name>.ts          # Logic — props, lifecycle, render
├── m-<name>.scss        # Styles — variants, theming, motion
├── m-<name>.test.ts     # Unit tests — Vitest + happy-dom
└── m-<name>.stories.ts  # Storybook + autodocs
```

Plus a re-export from `src/index.ts`. Drop the folder into another project and
it just works — that's the contract.

---

## 2. Reactive state is the source of truth

The `@property`-decorated field is the **single source of truth**. Any
lifecycle hook that wants to change visual state must update the reactive
property — never poke the DOM directly. A direct DOM write is silently
overwritten by the next render because Lit evaluates templates from the
reactive property.

```typescript
// ❌ Wrong — bypasses Lit's state; the next render clobbers it.
formDisabledCallback(disabled: boolean): void {
    this.renderRoot.querySelector('button')!.disabled = disabled;
}

// ✅ Right — Lit re-renders, the host attribute reflects, SCSS targets update.
formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
}
```

Same applies to `formResetCallback` and any custom lifecycle hook: update
reactive state, let Lit do the rest.

---

## 3. Form association: utilize, don't just connect

If the component participates in forms, set `static formAssociated = true`
and call `attachInternals()` in the constructor. Then **use** the internals:

- `formDisabledCallback` — sync reactive state (see
  [§2 Reactive state is the source of truth](#2-reactive-state-is-the-source-of-truth)).
- `formResetCallback` — clear internal state on form reset (no-op is OK, but
  declare it so the lifecycle is complete and future state has a hook).
- **Submit / reset forwarding** in `_handleClick` — so every activation path
  behaves identically to a native `<button>`:

```typescript
private _handleClick = (event: Event): void => {
    this.dispatchEvent(/* m-<comp>-<event> */);

    if (this.type !== 'submit' && this.type !== 'reset') return;

    // Gate: if the click already passed through the inner <button>, native
    // submit/reset fired — don't double-dispatch.
    const path = event.composedPath();
    const innerBtn = this.renderRoot.querySelector('button');
    if (innerBtn && path.includes(innerBtn)) return;

    const form = this._internals.form;
    if (!form) return;
    if (this.type === 'submit') form.requestSubmit();
    else form.reset();
};
```

**FormData discipline.** Pick **one** path:

- Forward `name` / `value` to the inner `<button>` (native form-association
  picks them up automatically), **or**
- Call `this._internals.setFormValue(this.value)` in `updated()`.

Doing both produces duplicate entries in `FormData`.

**Default `type="button"`.** A submit-type button inside a `<form>`
accidentally submits on click. Components are usually generic; the consumer
opts into submit by setting `type="submit"`.

---

## 4. Variants on the host, not inner classes

Variants are **attributes on the host**, not classes on the inner element.
Use `:host([variant='…'])` for variant selectors — this gives consumers a
stable CSS hook (the host attribute) without touching inner DOM, and keeps
the inner class list minimal.

Reflect boolean props (`disabled`, `loading`) **only when consumers or SCSS
need to target the attribute**. Pure JS state doesn't need reflection.

---

## 5. Theming: public, internal, SCSS fallback

Three layers, one direction:

1. **Public custom properties** (`--m-color-primary`) — what consumers override.
2. **Internal aliases** (`--_bg`, `--_fg`, `--_padding`) — what styles actually
   reference. Variants and sizes only override aliases, never raw colors.
3. **SASS-token fallbacks** (`#{t.$m-color-primary}`) — inlined at build time.

```scss
:host {
    --_bg: var(--m-color-primary, #{t.$m-color-primary});
}
:host([variant='secondary']) {
    --_bg: var(--m-color-secondary-bg, #{t.$m-color-secondary-bg});
}
```

No hard-coded colors or pixel sizes in component SCSS. If a value isn't a
token, it shouldn't ship.

---

## 6. Accessibility

- **Real semantic element under the hood** — `<button>`, `<input>`, `<a>`,
  etc. Never `<div role="button">`. Screen readers and keyboard navigation
  come for free when you pick the right element.
- **`:focus-visible` ring**, keyboard-only. Use the `focus-ring()` mixin from
  `_mixins.scss`.
- **`aria-busy`** on the interactive element whenever a loading state is
  active. Reflect the loading prop so SCSS can target it.
- **Native `disabled` over `aria-disabled`** unless you specifically need the
  element to remain focusable. Native handles both visual AND pointer-events.
- **Run the a11y Storybook addon** — axe-core on every default story. Zero
  violations is the bar.

---

## 7. Events

- **Always `composed: true, bubbles: true`** — events must cross the Shadow
  DOM boundary for cross-framework consumers (React, Angular, Vue) to hear them.
- **Naming**: `m-<component>-<event>` — e.g. `m-button-click`. Document the
  `m-` namespace so the consumer-side `addEventListener` reads consistently.
- **Typed detail** — never `any`. Register on `HTMLElementEventMap` for
  type-safe listeners:

```typescript
interface HTMLElementEventMap {
    'm-button-click': CustomEvent<MButtonClickDetail>;
}
```

---

## 8. Performance and bundle hygiene

- **`?disabled=${bool}`** for boolean attributes, not `disabled=${bool}`.
  Lit's `?` prefix removes/omits the attribute; bare binding serializes `false`
  as the string `"false"`.
- **Tree-shakeable**: re-export from `index.ts`; consumers `import` specific
  components. Anything imported gets bundled — keep the public surface small.
- **Reduced motion**: wrap transitions via the `motion()` mixin in
  `@media (prefers-reduced-motion: no-preference)`. For indicators that must
  stay animated (spinners), slow them down under `prefers-reduced-motion: reduce`
  — don't kill them entirely, the user still needs the affordance.

---

## 9. Testing

- Vitest + happy-dom (see [Definition of done → Tests](./DEFINITION_OF_DONE.md#tests-per-9-testing)
  for the per-component test categories that must be covered).
- **Stub environment holes** — e.g. happy-dom doesn't ship
  `HTMLElement.prototype.attachInternals`. Provide a stub whose `.form`
  getter walks up the DOM to the nearest `<form>` ancestor (mirrors the
  browser).
- **Behavior assertions over implementation spies** when the environment
  wraps methods. happy-dom's `ClassMethodBinder` interferes with
  `vi.spyOn(form, 'requestSubmit')`. Assert the **observable outcome**
  (`submit` event fired; form `reset` cleared control values) instead.
- Cover, at minimum: registration, every reflected prop, event dispatch with
  `composed`/`bubbles`/typed detail, slot projection (default + named),
  disabled/loading blocks interaction, form-association lifecycle both
  directions.

---

## 10. Storybook

- `tags: ['autodocs']` for the auto-generated props table.
- `argTypes` for every public prop with control hints (`select` for unions,
  `boolean` for flags).
- **Stories that matter**:
  - One per variant and per size.
  - One per state (disabled, loading, error).
  - At least one **slot-composition** story (named + default).
  - A **theming** story proving `--m-*` overrides retheme the component.
  - An **event** story that dispatches the event into the Actions panel so
    consumers can see the payload shape.