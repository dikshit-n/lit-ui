import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js"
import { when } from 'lit/directives/when.js'

@customElement("m-button")
export class MButton extends LitElement {
    static override styles = css`
        :host button {
            background-color: lightgray;
            border: none;
            border-radius: 5px;
            outline: none;
            }
        :host button.sm {
            padding: 3px 10px;
        }
        :host button.md {
            padding: 5px 12px;
        }
        :host button.lg {
            padding: 6px 14px;
        }
    `

    @property()
    size: Size = "md";

    @property({ type: Boolean })
    loading = false;

    @property({ type: Boolean })
    disabled = false;

    @property({ type: String })
    class = "";

    @property({ attribute: 'role' })
    ariaRole: string | null = 'button';

    override render() {
        const classNames = [this.size, this.class].filter(className => className).join(" ");
        return html`
            <button
                class=${classNames}
                ?disabled=${this.loading ? true : this.disabled}
            >
                ${when(this.loading, () => '...')}
                ${when(!this.loading, () => html`<slot></slot>`)}
            </button>
        `
    };
};

declare global {
    interface HTMLElementTagNameMap {
        "m-button": MButton
    }
};

type Size = "sm" | "md" | "lg";
