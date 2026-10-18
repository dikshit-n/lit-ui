import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

@customElement("m-clock")
export class MClock extends LitElement {
    static override styles = css`
        :host {
            display: inline-block;
        }
        :host pre {
            white-space: normal;

            font-weight: 300;
            letter-spacing: 0.1em;
            line-height: 1;

            color: #16181d;
            background: transparent;
            border-bottom: 1px solid #dfe3ea;
        }
    `;

    private timerInterval: ReturnType<typeof setTimeout> | undefined = undefined;

    @state()
    private time = this.convertTime(new Date());

    override connectedCallback(): void {
        super.connectedCallback();
        this.timerInterval = setInterval(() => {
            this.time = this.convertTime(new Date());
        }, 1000);
    };

    override disconnectedCallback() {
        super.disconnectedCallback();
        clearInterval(this.timerInterval);
    };

    private convertTime(date: Date) {
        return new Date(date).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    protected override render(): unknown {
        return html`
            <pre>
                ${this.time}
            </pre>
        `
    };
};

declare global {
    interface HTMLElementTagNameMap {
        'm-clock': MClock;
    }
};
