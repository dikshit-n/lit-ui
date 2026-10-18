# Definition of Done

> A component is **done** when every box below is checked. Review the
> engineering fundamentals in [`COMPONENT_STANDARDS.md`](./COMPONENT_STANDARDS.md)
> for the "why" behind each item. Architectural conventions (variants,
> encapsulation, cross-framework consumption) live in the root
> [`README.md`](../README.md).

---

## Files

- [ ] `src/components/m-<name>/m-<name>.ts`
- [ ] `src/components/m-<name>/m-<name>.scss`
- [ ] `src/components/m-<name>/m-<name>.test.ts`
- [ ] `src/components/m-<name>/m-<name>.stories.ts`
- [ ] Re-exported from `src/index.ts`

## Static checks

- [ ] `npm run build` succeeds — TypeScript clean, Vite emits ES + CJS.
- [ ] `npm test` passes for the new component.
- [ ] `npm run build:storybook` succeeds; the component appears under
      `Components/<Name>` in the sidebar.

## Reactive model

- [ ] All `@property` decorators declare the correct type.
- [ ] Boolean props reflect **only when** consumers or SCSS need to target
      the attribute.
- [ ] Form-associated components: `static formAssociated = true`,
      `attachInternals()` in the constructor.
- [ ] Form-association lifecycle hooks (`formDisabledCallback`,
      `formResetCallback`) update **reactive state**, never the DOM directly.
- [ ] Form internals are **utilized** — submit/reset forwarded through
      `_internals.form` so all activation paths behave identically.

## Accessibility

- [ ] Real semantic element under the hood (`<button>`, `<input>`, `<a>`).
- [ ] `:focus-visible` ring on the interactive element.
- [ ] `aria-busy` toggles with the loading state.
- [ ] Default `type="button"` (so the component doesn't accidentally submit
      a parent `<form>`).
- [ ] axe-core: zero violations on every default story in Storybook.

## Theming

- [ ] All colors and dimensions use `--m-*` public custom properties.
- [ ] Each public property has a SASS-token fallback (no hard-coded values).
- [ ] Internal aliases use the `--_*` prefix; variants and sizes override
      aliases only.

## Events

- [ ] All custom events dispatch with `composed: true, bubbles: true`.
- [ ] Event names follow `m-<component>-<event>`.
- [ ] Detail payload is typed and registered on `HTMLElementEventMap`.

## Performance

- [ ] `?disabled=${bool}` (boolean attribute binding) — not
      `disabled=${bool}`.
- [ ] Reduced-motion-aware transitions via the `motion()` mixin.
- [ ] `name`/`value` either forwarded to the inner button **or** registered
      via `setFormValue` — never both (avoid FormData duplicates).

## Tests (per [§9 Testing](./COMPONENT_STANDARDS.md#9-testing))

- [ ] Custom-element registration assertion.
- [ ] Reflection assertion for every reflected prop.
- [ ] Event dispatch: count, `composed`, `bubbles`, typed detail shape.
- [ ] Slot projection (default + every named slot).
- [ ] Disabled/loading blocks click and surfaces `aria-busy`.
- [ ] Form-association lifecycle: `formDisabledCallback(true)` updates
      `this.disabled` AND the host attribute; the reverse clears both.
- [ ] Form-association lifecycle: submit/reset forwarding covered with
      **behavior assertions**, not `vi.spyOn` on wrapped methods.

## Storybook

- [ ] `tags: ['autodocs']`.
- [ ] `argTypes` wired for every public prop with control hints.
- [ ] Stories per variant, per size, per state.
- [ ] At least one slot-composition story.
- [ ] One **theming** story showing `--m-*` overrides.
- [ ] One **event** story that surfaces in the Actions panel.
- [ ] Component title follows `Components/<Name>`.

## Backward compatibility

- [ ] Sibling components that depend on this one still typecheck and their
      tests still pass.
- [ ] If the public API changed, the relevant sections in
      [COMPONENT_STANDARDS.md](./COMPONENT_STANDARDS.md) and
      [README.md](../README.md) are updated to reflect the new convention.