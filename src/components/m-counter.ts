import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("m-counter")
export class MCounter extends LitElement {
    static override styles = css`
        :host {
            display: inline-block;
        }
    `;

    @property({ type: Number }) count = 0;
    @property({ type: Number }) min = -Infinity;
    @property({ type: Number }) max = Infinity;

    private increamentClick() {
        this.count = this.count + 1;
    };

    private decreamentClick() {
        this.count = this.count - 1;
    };

    override render() {
        return html`
            <m-button
                ?disabled=${this.min === this.count}
                @click=${this.decreamentClick}
            >
                -
            </m-button>
            ${this.count}
            <m-button
                ?disabled=${this.max === this.count}
                @click=${this.increamentClick}
            >
                +
            </m-button>
        `
    }
};

declare global {
    interface HTMLElementTagMap {
        "m-counter": MCounter
    }
};
