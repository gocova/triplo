import { LitElement, html, css, nothing } from "/js/lit/dist@3/lit-core.min.js";

export class SimpleGreeting extends LitElement {
  static properties = {
    name: {},
  };
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      color: blue;
    }
  `;

  constructor() {
    super();
    // Declare reactive properties
    this.name = "World";
  }

  // Render the UI as a function of component state
  render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}
customElements.define("simple-greeting", SimpleGreeting);

export class InputPanel extends LitElement {
  static properties = {
    _name: { type: String },
    inputsetNameError: { type: String },
    _data: { type: String },
    inputsetDataError: { type: String },
    disabled: { type: Boolean },
    _isAddReady: { type: Boolean },
  };

  constructor() {
    super();
    this._data = null;
    this._name = null;
    this.inputsetDataError = null;
    this.inputsetNameError = null;
    this._isAddReady = false;
  }

  connectedCallback() {
    super.connectedCallback();

    // Apply external styles to the shadow dom
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", "css/cova.css");
    this.renderRoot.appendChild(linkElem);
  }
  render() {
    const inputContents = !this.disabled
      ? html`<input id="inputset-name"
        type="text"
        placeholder="Set name"
        @blur="${this._readName}"
        .value="${this._name}"
        required></input>
    <textarea id="inputset-data"
        placeholder="Paste data"
        .value="${this._data}"
        @blur="${this._readData}"
        required ></textarea>`
      : nothing;

    return html`<div class="input-panel panel">
      <form>
        <p class="panel-heading">Paste your table</p>
        <div class="panel-block vertical-content input-contents">
          ${inputContents}
        </div>
        <div class="panel-block">
          <button class="button is-outlined" @click="${this._doReset}">
            New
          </button>
          <button
            class="button is-outlined"
            @click="${this._submit}"
            .disabled="${!this._isAddReady || this.disabled}"
          >
            Add
          </button>
        </div>
      </form>
    </div>`;
  }

  validateAddButtonStatus() {
    this._isAddReady =
      this._name &&
      this._name.length > 0 &&
      this._data &&
      this._data.length > 0;
  }
  _readName(e) {
    let possibleValue = e.target?.value;
    if (possibleValue) {
      possibleValue = possibleValue.trim();
      if (possibleValue.length > 0) {
        this._name = possibleValue;
        this.validateAddButtonStatus();
      }
    }
  }

  _readData(e) {
    let possibleValue = e.target?.value;
    if (possibleValue && possibleValue.length > 0) {
      this._data = possibleValue;
      this.validateAddButtonStatus();
    }
  }
  _submit(e) {
    e.preventDefault();
    // this.disabled = true;
    const event = new CustomEvent("input/did-get-data", {
      bubbles: true,
      composed: true,
      detail: {
        data: this._data,
      },
    });
    this.dispatchEvent(event);
  }
  _doReset(e) {
    e.preventDefault();
    this._name = null;
    this._data = null;
    this.validateAddButtonStatus();

    const event = new CustomEvent("input/did-request-data-reset", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
    // this.disabled = false;
  }
}
customElements.define("input-panel", InputPanel);

export class TriploApp extends LitElement {
  static properties = {
    _inputDisabled: { type: Boolean },
  };

  constructor() {
    super();
    this._inputDisabled = false;
  }
  connectedCallback() {
    super.connectedCallback();

    // Apply external styles to the shadow dom
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", "css/cova.css");
    this.renderRoot.appendChild(linkElem);

    window.addEventListener("input/did-get-data", () =>
      this._handleInputDidGetData(),
    );
    window.addEventListener("input/did-request-data-reset", () =>
      this._handleInputRequestDataReset(),
    );
  }
  render() {
    return html`<div id="app">
      <div class="initial-setup">
        <input-panel .disabled="${this._inputDisabled}"></input-panel>
        <div class="input-processing-progress" style="display: none"></div>
        <div class="dictionary panel" style="display: none"></div>
      </div>
      <div class="main">
        <div class="main-title-bar"></div>
        <div class="main-contents"></div>
      </div>
    </div>`;
  }
  _handleInputDidGetData() {
    this._inputDisabled = true;
  }
  _handleInputRequestDataReset() {
    if (this._inputDisabled) this._inputDisabled = false;
  }
}
customElements.define("triplo-app", TriploApp);

window.addEventListener("input/did-request-data-reset", (e) => {
  console.log(e);
});

window.addEventListener("input/did-get-data", (e) => {
  console.log(e);
  if (typeof e.detail?.data === "string") {
  } else {
    const event = new CustomEvent("input/did-error-on-data", {
      bubbles: true,
      composed: true,
      detail: {
        message: `The provided data is not string, (got type: ${typeof e.detail?.data})`,
      },
    });
    window.dispatchEvent(event);
  }
});
