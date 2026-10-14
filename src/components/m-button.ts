import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js"

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
    size: Size = "md"

    @property()
    loading?: Boolean = false;

    @property()
    disabled?: Boolean = false;

    @property()
    class?: string = "";

    override render() {
        const classNames = [this.size, this.class].filter(className => className).join(" ");
        return html`
            <button
                class=${classNames}
                ?disabled=${this.loading ? true : this.disabled}
            >
                ${this.loading ? '...' : html`<slot></slot>`}
            </button>
        `
    };
};

declare global {
    interface HTMLElementTagNameMap {
        "m-button": MButton
    }
};

type Size = "sm" | "md" | "lg"
