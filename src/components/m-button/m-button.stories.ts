// =============================================================================
// <m-button> stories
// =============================================================================
// Drives Storybook's controls panel + the auto-generated props table (via
// `tags: ['autodocs']`). The `a11y` addon runs axe-core against every story;
// if a story violates an a11y rule, the panel surfaces it under the
// Accessibility tab.
//
// Naming convention: `<noun>` for single-state stories, `<variant>-<state>`
// for orthogonal combinations.
// =============================================================================

import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';

import './m-button';

interface ButtonArgs {
    label: string;
    variant: 'primary' | 'secondary' | 'danger';
    size: 'sm' | 'md' | 'lg';
    disabled: boolean;
    loading: boolean;
    type: 'button' | 'submit' | 'reset';
}

const meta: Meta<ButtonArgs> = {
    title: 'Components/Button',
    component: 'm-button',
    tags: ['autodocs'],
    parameters: {
        // a11y panel gets noisy if it complains about color contrast on
        // every variant — explicit policy in docs/COMPONENT_STANDARDS.md §6:
        // focus rings via `:focus-visible`, real <button> under the hood,
        // aria-busy on loading. axe checks all of those.
        docs: {
            description: {
                component:
                    'Production button primitive. Variants on the host attribute, form-association via ElementInternals, `m-button-click` event (composed + bubbles). Theming via `--m-*` custom properties — see the source SCSS for the full surface.',
            },
        },
    },
    argTypes: {
        label: {
            control: 'text',
            description: 'Default-slot content (the button label).',
        },
        variant: {
            control: { type: 'select' },
            options: ['primary', 'secondary', 'danger'],
            description: 'Visual variant — host attribute, drives `:host([variant=…])` styles.',
        },
        size: {
            control: { type: 'select' },
            options: ['sm', 'md', 'lg'],
            description: 'Size scale — host attribute, drives padding / radius / font-size.',
        },
        disabled: {
            control: 'boolean',
            description: 'Disables interaction; also adds the `disabled` attribute to the inner <button>.',
        },
        loading: {
            control: 'boolean',
            description: 'Shows a spinner, sets `aria-busy`, blocks clicks.',
        },
        type: {
            control: { type: 'select' },
            options: ['button', 'submit', 'reset'],
            description: 'Forwarded to the inner <button type="…">. Defaults to `button` to prevent accidental form submission.',
        },
    },
    args: {
        label: 'Save changes',
        variant: 'primary',
        size: 'md',
        disabled: false,
        loading: false,
        type: 'button',
    },
    render: (args) => html`
        <m-button
            variant=${args.variant}
            size=${args.size}
            ?disabled=${args.disabled}
            ?loading=${args.loading}
            type=${args.type}
        >
            ${args.label}
        </m-button>
    `,
};

export default meta;
type Story = StoryObj<ButtonArgs>;

// -----------------------------------------------------------------------------
// Variants
// -----------------------------------------------------------------------------

export const Primary: Story = {
    name: 'Variant · primary',
    args: { variant: 'primary', label: 'Save changes' },
};

export const Secondary: Story = {
    name: 'Variant · secondary',
    args: { variant: 'secondary', label: 'Cancel' },
};

export const Danger: Story = {
    name: 'Variant · danger',
    args: { variant: 'danger', label: 'Delete account' },
};

// -----------------------------------------------------------------------------
// Sizes
// -----------------------------------------------------------------------------

export const SizeSmall: Story = {
    name: 'Size · sm',
    args: { size: 'sm', label: 'Compact' },
};

export const SizeMedium: Story = {
    name: 'Size · md (default)',
    args: { size: 'md', label: 'Default' },
};

export const SizeLarge: Story = {
    name: 'Size · lg',
    args: { size: 'lg', label: 'Emphasized' },
};

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

export const Disabled: Story = {
    name: 'State · disabled',
    args: { disabled: true, label: 'Unavailable' },
};

export const Loading: Story = {
    name: 'State · loading',
    args: { loading: true, label: 'Submitting…' },
};

// -----------------------------------------------------------------------------
// Composition — default slot + named `icon` slot
// -----------------------------------------------------------------------------

export const WithIcon: Story = {
    name: 'Slot · icon',
    parameters: {
        docs: {
            description: {
                story:
                    'Named slot `icon` renders before the default slot. Styled via the `--m-space-icon-gap` token.',
            },
        },
    },
    render: (): TemplateResult => html`
        <m-button variant="primary">
            <span slot="icon" aria-hidden="true">★</span>
            Add to favorites
        </m-button>
    `,
};

export const WithTrailingIcon: Story = {
    name: 'Slot · icon (custom layout)',
    parameters: {
        docs: {
            description: {
                story:
                    'Only one named slot is reserved (`icon`). For trailing icons, swap the order of children in the default slot, or extend the API with a new slot.',
            },
        },
    },
    render: (): TemplateResult => html`
        <m-button variant="secondary">
            Continue
            <span slot="icon" aria-hidden="true">→</span>
        </m-button>
    `,
};

// -----------------------------------------------------------------------------
// Form association — what consumers actually wire up in real apps
// -----------------------------------------------------------------------------

export const FormSubmit: Story = {
    name: 'Form · submit',
    parameters: {
        docs: {
            description: {
                story:
                    'Set `type="submit"` to trigger the enclosing <form>. The component is form-associated via `ElementInternals`, so disabled ancestors (e.g. `<fieldset disabled>`) propagate automatically.',
            },
        },
    },
    render: (): TemplateResult => html`
        <form
            @submit=${(e: Event) => {
                e.preventDefault();
                // In a real app this would post to a server. The story just
                // demonstrates wiring; no-op here.
            }}
        >
            <m-button type="submit" variant="primary" name="action" value="save">
                Submit
            </m-button>
        </form>
    `,
};

// -----------------------------------------------------------------------------
// Theming — show how `--m-*` overrides retheme without touching the component
// -----------------------------------------------------------------------------

export const ThemedCustom: Story = {
    name: 'Theming · custom palette',
    parameters: {
        docs: {
            description: {
                story:
                    'Every internal style references a public `--m-*` custom property. Override any of them on a parent to retheme. Here the entire primary palette is replaced.',
            },
        },
    },
    render: (): TemplateResult => html`
        <div
            style=${`
                --m-color-primary: #7c3aed;
                --m-color-primary-hover: #6d28d9;
                --m-color-primary-fg: #f5f3ff;
                --m-radius-md: 999px;
            `}
        >
            <m-button variant="primary">Purple, fully rounded</m-button>
        </div>
    `,
};

// -----------------------------------------------------------------------------
// Event surface — drive the `m-button-click` event from the docs page
// -----------------------------------------------------------------------------

export const EventDemo: Story = {
    name: 'Event · m-button-click',
    parameters: {
        docs: {
            description: {
                story:
                    'Listen with `addEventListener("m-button-click", handler)`. The event is `composed: true, bubbles: true`, so it crosses the Shadow DOM boundary and works inside React/Angular/Vue without adapters.',
            },
        },
    },
    render: (): TemplateResult => html`
        <m-button
            @m-button-click=${(e: CustomEvent<{ source: HTMLElement }>) => {
                // Surfaced in the Storybook actions panel — proves the
                // event crosses the shadow boundary.
                console.info('m-button-click fired', e.detail);
            }}
        >
            Click me — check the Actions panel
        </m-button>
    `,
};