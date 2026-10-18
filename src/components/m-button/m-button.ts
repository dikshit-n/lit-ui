// =============================================================================
// <m-button>
// =============================================================================
// Production template per docs/README.md — every component convention in one
// place: variants on the host, form-association via ElementInternals, a
// typed `m-button-click` event with `composed: true, bubbles: true`, a11y
// (`aria-busy`, `:focus-visible`, real <button> under the hood), slots for
// composition (default + `icon`), and reduced-motion-aware styles.
//
// Public API surface (kept stable across the template):
//
//   variant : 'primary' | 'secondary' | 'danger'  (reflected)
//   size    : 'sm' | 'md' | 'lg'                  (reflected)
//   disabled: boolean                              (reflected)
//   loading : boolean                              (reflected)
//   type    : 'button' | 'submit' | 'reset'        (forwarded to inner <button>)
//   name    : string                               (forwarded; form-association)
//   value   : string                               (forwarded; form-association)
//
// Events:
//   m-button-click   — composed, bubbles. Fires when the inner <button> is
//                       activated and the component is neither disabled nor
//                       loading.
//
// Slots:
//   default — button label
//   icon    — leading icon (e.g. <span slot="icon">★</span>)
// =============================================================================

import { LitElement, html, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

// Vite resolves the SCSS at build time and hands us the compiled CSS string
// via the `?inline` import suffix. `unsafeCSS` lifts the string into a
// CSSResult that Lit can apply alongside the component's shadow boundary.
import buttonStyles from './m-button.scss?inline';

export type MButtonVariant = 'primary' | 'secondary' | 'danger';
export type MButtonSize = 'sm' | 'md' | 'lg';
export type MButtonType = 'button' | 'submit' | 'reset';

/** Detail payload of the `m-button-click` event. */
export interface MButtonClickDetail {
    /** The originating `<m-button>` instance. */
    readonly source: MButton;
    /** The original native `MouseEvent` for callers that need coordinates, etc. */
    readonly originalEvent: Event;
};

/**
 * Detail object available on `m-button-click` events.
 * Documented here so consumers get type-aware access when listening
 * (`event.detail` is typed as `MButtonClickDetail`).
 */
export type { MButtonClickDetail as MButtonClickEventDetail };

@customElement('m-button')
export class MButton extends LitElement {
    /** Form-associated custom element. Opts into `attachInternals()` and the
     *  `formAssociatedCallback` family. */
    static formAssociated = true;

    static override styles = unsafeCSS(buttonStyles);

    // -------------------------------------------------------------------------
    // Inputs
    // -------------------------------------------------------------------------

    /** Visual variant. Reflected so SCSS can target `:host([variant='…'])`. */
    @property({ type: String, reflect: true })
    variant: MButtonVariant = 'primary';

    /** Size scale. Reflected for SCSS targeting. */
    @property({ type: String, reflect: true })
    size: MButtonSize = 'md';

    /** Disabled state. Reflected so SCSS + native HTML semantics align. */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    /** Loading state. Disables interaction and exposes `aria-busy`. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** Native `<button type>` — controls form-submission semantics. */
    @property({ type: String })
    type: MButtonType = 'button';

    /** Form-associated name. */
    @property({ type: String })
    name = '';

    /** Form-associated value. */
    @property({ type: String })
    value = '';

    // -------------------------------------------------------------------------
    // Form association
    // -------------------------------------------------------------------------

    /** ElementInternals — available after the constructor returns. */
    private _internals: ElementInternals;
 
    constructor() {
        super();
        this._internals = this.attachInternals();
    }

    /**
     * Called by the browser when this element is inside a `<fieldset disabled>`
     * (or any other ancestor whose disabled state changes). The previous
     * implementation poked `btn.disabled` directly on the DOM, which Lit had
     * no knowledge of — the very next re-render would clobber it because
     * `?disabled=${this.disabled || this.loading}` evaluates from the
     * (still-`false`) reactive property.
     *
     * Updating the reactive property here keeps everything in sync: the host
     * attribute reflects (so SCSS `:host([disabled])` applies), Lit re-renders
     * the inner `<button>` with the correct disabled semantics, and any
     * listeners watching `this.disabled` see the change.
     */
    formDisabledCallback(disabled: boolean): void {
        this.disabled = disabled;
    }

    /**
     * Called by the browser when the associated `<form>` is reset. Buttons
     * don't carry internal state that needs clearing, but the callback is
     * declared here so the form-association lifecycle is complete and any
     * future internal state (e.g. a pending-flag) has a hook to reset.
     */
    formResetCallback(): void {
        // No-op — see doc comment.
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    override connectedCallback(): void {
        super.connectedCallback();
        // Catching the click on the host means shadow-DOM re-targeting does
        // the heavy lifting: any click on the inner <button> re-targets to
        // <m-button>, so a single host-level listener covers it.
        this.addEventListener('click', this._handleClick);
    }

    override disconnectedCallback(): void {
        this.removeEventListener('click', this._handleClick);
        super.disconnectedCallback();
    }

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    override render(): TemplateResult {
        const isInert = this.disabled || this.loading;

        return html`
            <button
                part="button"
                type=${this.type}
                name=${this.name}
                value=${this.value}
                ?disabled=${isInert}
                aria-busy=${this.loading ? 'true' : 'false'}
            >
                ${when(
                    this.loading,
                    () => html`<span class="spinner" part="spinner" aria-hidden="true"></span>`,
                )}
                <slot name="icon"></slot>
                <slot></slot>
            </button>
        `;
    }

    // -------------------------------------------------------------------------
    // Event handling
    // -------------------------------------------------------------------------

    /**
     * Re-dispatch the native click as `m-button-click`, then drive form
     * submission / reset through `ElementInternals` when activation didn't
     * already go through the inner `<button>`.
     *
     * Why the second half exists: the native inner `<button type="submit">`
     * (or `type="reset"`) only triggers form submission/reset on a direct
     * click. Programmatic activation (`el.click()` from a parent calling code,
     * a synthetic event, or even clicks landing on host padding that doesn't
     * overlap the inner button) re-targets to `<m-button>` and bypasses the
     * inner button's native behavior. The internals API lets us mirror that
     * behavior from the host level so all activation paths are equivalent.
     *
     * We gate the forwarding on `event.composedPath()`: if the click already
     * went through the inner `<button>`, the native submit/reset fired and
     * calling `requestSubmit()` / `reset()` again would double-dispatch the
     * form's submit event.
     */
    private _handleClick = (event: Event): void => {
        // 1. Re-dispatch as m-button-click so consumers can react.
        this.dispatchEvent(
            new CustomEvent<MButtonClickDetail>('m-button-click', {
                detail: {
                    source: this,
                    originalEvent: event,
                },
                composed: true,
                bubbles: true,
            }),
        );

        // 2. Forward submit/reset through ElementInternals when the inner
        //    button wasn't the activation target.
        if (this.type !== 'submit' && this.type !== 'reset') {
            return;
        }

        const path = event.composedPath();
        const innerBtn = this.renderRoot.querySelector('button');
        if (innerBtn && path.includes(innerBtn)) {
            // Direct click on the inner button — native submit/reset
            // already fired. Don't double-dispatch.
            return;
        }

        const form = this._internals.form;
        if (!form) {
            return;
        }

        if (this.type === 'submit') {
            form.requestSubmit();
        } else {
            form.reset();
        }
    };
};

declare global {
    interface HTMLElementTagNameMap {
        'm-button': MButton;
    }

    interface HTMLElementEventMap {
        'm-button-click': CustomEvent<MButtonClickDetail>;
    }
};
