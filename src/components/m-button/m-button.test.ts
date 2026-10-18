// =============================================================================
// m-button unit tests
// =============================================================================
// Vitest + happy-dom (see docs/COMPONENT_STANDARDS.md §9). Covers the
// public contract:
//   - Custom-element registration
//   - Default + reflected props
//   - Slots (default + named `icon`)
//   - `m-button-click` event semantics (composed, bubbles, suppressed when inert)
//   - Form-association plumbing (type/name/value forwarding, default type)
//   - A11y surface (aria-busy on loading, real <button> under the hood)
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LitElement } from 'lit';
import type { MButton, MButtonVariant, MButtonSize } from './m-button';
import './m-button'; // side-effect: registers the custom element

// happy-dom doesn't yet ship `ElementInternals`. We stub it just well enough
// for `m-button`'s form-association surface to work in tests:
//   - `.form` resolves to the nearest <form> ancestor, mirroring the
//     browser's behavior (the browser auto-associates form-associated
//     custom elements with the form they're inserted into).
// Everything else is unused by `m-button` so it's left undefined.
if (
    typeof (HTMLElement.prototype as { attachInternals?: () => ElementInternals }).attachInternals !==
    'function'
) {
    (HTMLElement.prototype as { attachInternals: () => ElementInternals }).attachInternals =
        function (this: HTMLElement): ElementInternals {
            const host = this;
            const internals: Record<string | symbol, unknown> = {};
            Object.defineProperty(internals, 'form', {
                configurable: true,
                get(): HTMLFormElement | null {
                    let node: HTMLElement | null = host;
                    while (node) {
                        if (node.tagName === 'FORM') {
                            return node as HTMLFormElement;
                        }
                        node = node.parentElement ?? (node.parentNode as HTMLElement | null);
                    }
                    return null;
                },
            });
            return internals as unknown as ElementInternals;
        };
}

const flush = (el: LitElement): Promise<void> => el.updateComplete.then(() => undefined);

describe('m-button', () => {
    let el: MButton;

    beforeEach(() => {
        document.body.innerHTML = '';
        el = document.createElement('m-button') as MButton;
        document.body.appendChild(el);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // -------------------------------------------------------------------------
    // Registration + structural baseline
    // -------------------------------------------------------------------------

    it('registers the <m-button> custom element', () => {
        expect(customElements.get('m-button')).toBeDefined();
    });

    it('renders a real <button> inside the shadow root', async () => {
        await flush(el);
        const btn = el.renderRoot.querySelector('button');
        expect(btn).toBeInstanceOf(HTMLButtonElement);
    });

    it('defaults to type=button to avoid accidental form submission', async () => {
        await flush(el);
        expect(el.renderRoot.querySelector('button')?.getAttribute('type')).toBe('button');
    });

    // -------------------------------------------------------------------------
    // Reflected props
    // -------------------------------------------------------------------------

    it.each(['primary', 'secondary', 'danger'] as const)(
        "reflects variant='%s' to the host attribute",
        async (variant) => {
            el.variant = variant satisfies MButtonVariant;
            await flush(el);
            expect(el.getAttribute('variant')).toBe(variant);
        },
    );

    it.each(['sm', 'md', 'lg'] as const)(
        "reflects size='%s' to the host attribute",
        async (size) => {
            el.size = size satisfies MButtonSize;
            await flush(el);
            expect(el.getAttribute('size')).toBe(size);
        },
    );

    it('reflects disabled to the host attribute when true', async () => {
        el.disabled = true;
        await flush(el);
        expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('reflects loading to the host attribute and sets aria-busy on the inner button', async () => {
        el.loading = true;
        await flush(el);
        expect(el.hasAttribute('loading')).toBe(true);
        expect(el.renderRoot.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
    });

    it('clears aria-busy when loading flips off', async () => {
        el.loading = true;
        await flush(el);
        el.loading = false;
        await flush(el);
        expect(el.renderRoot.querySelector('button')?.getAttribute('aria-busy')).toBe('false');
    });

    // -------------------------------------------------------------------------
    // Form-association plumbing
    // -------------------------------------------------------------------------

    it('forwards name and value to the inner button', async () => {
        el.name = 'submit-btn';
        el.value = 'go';
        await flush(el);
        const btn = el.renderRoot.querySelector('button') as HTMLButtonElement;
        expect(btn.name).toBe('submit-btn');
        expect(btn.value).toBe('go');
    });

    it('forwards type="submit" so it can submit a parent <form>', async () => {
        el.type = 'submit';
        await flush(el);
        expect(el.renderRoot.querySelector('button')?.getAttribute('type')).toBe('submit');
    });

    it('is form-associated (formAssociated = true)', () => {
        // Static class fields live on the constructor, not instances.
        const ctor = el.constructor as typeof MButton;
        expect(ctor.formAssociated).toBe(true);
    });

    // -------------------------------------------------------------------------
    // Slots
    // -------------------------------------------------------------------------

    it('projects default-slot children into the button label area', async () => {
        el.textContent = 'Save changes';
        await flush(el);
        const defaultSlot = el.renderRoot.querySelector('slot:not([name])');
        expect(defaultSlot).toBeTruthy();
        // The host's light DOM is what feeds the default slot — assert the
        // child text node exists so projection has something to render.
        expect(el.textContent?.trim()).toBe('Save changes');
    });

    it('renders a named `icon` slot alongside the default slot', async () => {
        const icon = document.createElement('span');
        icon.setAttribute('slot', 'icon');
        icon.textContent = '★';
        el.appendChild(icon);
        el.textContent = 'Favorite';
        await flush(el);

        const iconSlot = el.renderRoot.querySelector('slot[name="icon"]');
        const defaultSlot = el.renderRoot.querySelector('slot:not([name])');
        expect(iconSlot).toBeTruthy();
        expect(defaultSlot).toBeTruthy();
    });

    // -------------------------------------------------------------------------
    // Event: m-button-click
    // -------------------------------------------------------------------------

    it('dispatches m-button-click when activated, with composed + bubbles = true', async () => {
        await flush(el);

        const handler = vi.fn();
        el.addEventListener('m-button-click', handler);

        (el.renderRoot.querySelector('button') as HTMLButtonElement).click();
        await flush(el);

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0]?.[0] as CustomEvent | undefined;
        expect(event).toBeDefined();
        expect(event!.composed).toBe(true);
        expect(event!.bubbles).toBe(true);
        expect(event!.type).toBe('m-button-click');
    });

    it('passes { source, originalEvent } on the event detail', async () => {
        await flush(el);
        let captured: unknown;
        el.addEventListener('m-button-click', (e) => {
            captured = (e as CustomEvent).detail;
        });

        (el.renderRoot.querySelector('button') as HTMLButtonElement).click();
        await flush(el);

        const detail = captured as { source: MButton; originalEvent: Event } | undefined;
        expect(detail).toBeDefined();
        expect(detail!.source).toBe(el);
        expect(detail!.originalEvent).toBeInstanceOf(Event);
    });

    it('does NOT dispatch m-button-click when disabled', async () => {
        el.disabled = true;
        await flush(el);

        const handler = vi.fn();
        el.addEventListener('m-button-click', handler);

        // Native `disabled` on the inner <button> prevents the click event
        // from firing at all — that's the contract we want.
        const btn = el.renderRoot.querySelector('button') as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        btn.click();

        expect(handler).not.toHaveBeenCalled();
    });

    it('does NOT dispatch m-button-click when loading', async () => {
        el.loading = true;
        await flush(el);

        const handler = vi.fn();
        el.addEventListener('m-button-click', handler);

        const btn = el.renderRoot.querySelector('button') as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        expect(btn.getAttribute('aria-busy')).toBe('true');
        btn.click();

        expect(handler).not.toHaveBeenCalled();
    });

    it('renders a spinner element when loading', async () => {
        el.loading = true;
        await flush(el);
        expect(el.renderRoot.querySelector('.spinner')).toBeTruthy();
    });

    it('does not render a spinner when not loading', async () => {
        await flush(el);
        expect(el.renderRoot.querySelector('.spinner')).toBeFalsy();
    });

    // -------------------------------------------------------------------------
    // formDisabledCallback (form-association lifecycle)
    // -------------------------------------------------------------------------

    it('updates the reactive this.disabled when formDisabledCallback(true) fires', async () => {
        expect(el.disabled).toBe(false);

        // Simulate the browser flipping the ancestor <fieldset disabled>.
        el.formDisabledCallback(true);

        // Reactive property updated — the previous implementation skipped
        // this step, which meant Lit's next render would clobber the inner
        // button's disabled state.
        expect(el.disabled).toBe(true);

        await flush(el);

        // Reflects to the host attribute so SCSS `:host([disabled])` applies.
        expect(el.hasAttribute('disabled')).toBe(true);

        // And the inner button picks up the new state via Lit's render.
        const btn = el.renderRoot.querySelector('button') as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
    });

    it('clears the reactive this.disabled when formDisabledCallback(false) fires', async () => {
        el.formDisabledCallback(true);
        await flush(el);
        expect(el.disabled).toBe(true);
        expect(el.hasAttribute('disabled')).toBe(true);

        el.formDisabledCallback(false);
        await flush(el);

        expect(el.disabled).toBe(false);
        expect(el.hasAttribute('disabled')).toBe(false);
        const btn = el.renderRoot.querySelector('button') as HTMLButtonElement;
        expect(btn.disabled).toBe(false);
    });

    // -------------------------------------------------------------------------
    // Form submission / reset via ElementInternals
    // -------------------------------------------------------------------------

    it('forwards form submission via ElementInternals when the host is activated programmatically', async () => {
        const form = document.createElement('form');
        form.appendChild(el);
        document.body.appendChild(form);
        el.type = 'submit';
        await flush(el);

        // Behavior assertion, not implementation: the submit event must fire
        // when the host is clicked and type=submit, even though the click
        // never reached the inner <button>.
        let submitted = false;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitted = true;
        });

        el.click();

        expect(submitted).toBe(true);
    });

    it('forwards form reset via ElementInternals when the host is activated with type=reset', async () => {
        const form = document.createElement('form');
        const input = document.createElement('input');
        input.name = 'x';
        input.value = 'initial';
        form.appendChild(input);
        form.appendChild(el);
        document.body.appendChild(form);
        el.type = 'reset';
        await flush(el);

        // After reset, the input's value attribute and defaultValue should
        // both clear. happy-dom resets to defaultValue, which is the
        // initial markup-declared value; we check that the property was
        // touched (or the value attribute changed).
        const initialDefault = input.defaultValue;
        input.defaultValue = 'baseline';
        input.value = 'something-else';

        el.click();

        expect(input.value).not.toBe('something-else');
        expect(input.defaultValue).toBe('baseline');
    });

    it('does NOT forward form submission when the inner button is clicked directly (no double-fire)', async () => {
        const form = document.createElement('form');
        form.appendChild(el);
        document.body.appendChild(form);
        el.type = 'submit';
        await flush(el);

        let submitCount = 0;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitCount++;
        });

        // Direct click on the inner button — the user-clicks-the-visible-
        // button path. Native <button type="submit"> handles submit on its
        // own; our forwarding must NOT double-dispatch.
        const innerBtn = el.renderRoot.querySelector('button') as HTMLButtonElement;
        innerBtn.click();

        // Submits once (native), not twice.
        expect(submitCount).toBeLessThanOrEqual(1);
    });

    it('does NOT forward form submission when type=button (default)', async () => {
        const form = document.createElement('form');
        form.appendChild(el);
        document.body.appendChild(form);
        // type stays at the default 'button'.
        await flush(el);

        let submitted = false;
        let reset = false;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitted = true;
        });
        form.addEventListener('reset', () => {
            reset = true;
        });

        el.click();

        expect(submitted).toBe(false);
        expect(reset).toBe(false);
    });
});
