import { LitElement, html, css, nothing } from "/js/lit/dist@3/lit-core.min.js";
import { scheduleTask } from "https://esm.sh/main-thread-scheduling";
// import { scheduleTask } from "/js/main-thread-scheduling";

const EVENT_INPUT_DID_GET_DATA = "input/did-get-data";
const EVENT_INPUT_DID_REQUEST_DATA_RESET = "input/did-request-data-reset";

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
    const event = new CustomEvent(EVENT_INPUT_DID_GET_DATA, {
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

    const event = new CustomEvent(EVENT_INPUT_DID_REQUEST_DATA_RESET, {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
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

    // next bound funcs are required to get proper called by window.addEventListener
    this._boundHandleInputDidGetData = this._handleInputDidGetData.bind(this);
    this._boundHandleInputRequestDataReset =
      this._handleInputRequestDataReset.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();

    // Apply external styles to the shadow dom
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", "css/cova.css");
    this.renderRoot.appendChild(linkElem);

    window.addEventListener(
      EVENT_INPUT_DID_GET_DATA,
      this._boundHandleInputDidGetData, // use this instead of: this._handleInputDidGetData(),
    );
    window.addEventListener(
      EVENT_INPUT_DID_REQUEST_DATA_RESET,
      this._boundHandleInputRequestDataReset, // use this instead of: this._handleInputRequestDataReset(),
    );
  }
  disconnectedCallback() {
    window.removeEventListener(
      EVENT_INPUT_DID_GET_DATA,
      this._boundHandleInputDidGetData || this._handleInputDidGetData,
    );
    window.removeEventListener(
      EVENT_INPUT_DID_REQUEST_DATA_RESET,
      this._boundHandleInputRequestDataReset ||
        this._handleInputRequestDataReset,
    );
    super.disconnectedCallback();
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

let processedRows = [];
let wordDict = {}; // word -> { id, alias_id }
let attributeDict = {}; // "name|value" -> id
let wordRows = [];

// === Pipeline stages ===
const pipeline = [
  extractAttributeTokens,
  tokenizeSpecialTags,
  cleanAndSplit,
  classifyTokens,
  extractWordsOnly,
  mapWordsToTokens,
];

// === Pipeline functions ===

function extractAttributeTokens(ctx) {
  const attrRegex = /\[att:(.*?)\](.*?)\[\/att\]/g;
  ctx.text = ctx.text.toLowerCase();

  ctx.text = ctx.text.replace(attrRegex, (_, name, value) => {
    const key = `${name.trim()}|${value.trim()}`;
    if (!attributeDict[key]) {
      attributeDict[key] = Object.keys(attributeDict).length;
    }
    const id = attributeDict[key];
    ctx.attributes.push({
      type: "attribute_token",
      name: name.trim(),
      value: value.trim(),
      id,
    });
    return ` <att_${id}> `;
  });
}

function tokenizeSpecialTags(ctx) {
  ctx.tokens = ctx.text
    .split(/(#[\w]+|@[\w]+|<att_\d+>)/g)
    .filter(Boolean)
    .map((t) => t.trim());
}

function cleanAndSplit(ctx) {
  ctx.tokens = ctx.tokens
    .map((s) =>
      s
        .replace(/[^\w#@<>]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function classifyTokens(ctx) {
  const finalTokens = [];
  for (const part of ctx.tokens) {
    if (/^<att_\d+>$/.test(part)) {
      const idx = parseInt(part.match(/\d+/)[0]);
      finalTokens.push(ctx.attributes[idx]);
    } else {
      const subparts = part.split(" ").filter(Boolean);
      for (const sub of subparts) {
        if (/^\d+(\.\d+)?$/.test(sub)) {
          finalTokens.push({ type: "number_token", value: sub });
        } else {
          finalTokens.push(sub);
        }
      }
    }
  }
  ctx.tokens = finalTokens;
}

function extractWordsOnly(ctx) {
  ctx.words = ctx.tokens
    .filter((t) => typeof t === "string")
    .map((w) => w.toLowerCase());
}

function mapWordsToTokens(ctx) {
  ctx.final_tokens = ctx.tokens.map((token) => {
    if (typeof token === "string") {
      const lower = token.toLowerCase();
      const dict = wordDict[lower];
      return {
        type: "word_token",
        value: dict?.alias_id || dict?.id || null,
        word: lower,
      };
    }
    return token; // preserve attribute_token or number_token
  });
}

// === Event handlers ===

window.addEventListener(EVENT_INPUT_DID_REQUEST_DATA_RESET, (e) => {
  console.log(e);
  processedRows = [];
});

window.addEventListener(EVENT_INPUT_DID_GET_DATA, async (e) => {
  // console.log(e);
  const rawText = e.detail?.data;
  if (typeof rawText !== "string") {
    const event = new CustomEvent("input/did-error-on-data", {
      bubbles: true,
      composed: true,
      detail: {
        message: `The provided data is not string, (got type: ${typeof rawText})`,
      },
    });
    window.dispatchEvent(event);
  }
  const lines = rawText.split("\n").slice(1);
  const linesCount = lines.length;
  let i = 0;
  if (i < linesCount) {
    do {
      await scheduleTask(
        () => {
          let j = i;
          if (j < Math.min(i + 5, linesCount)) {
            do {
              const row = (lines[j] || "").split("\t");
              const text = row[0] || "";
              let context = {
                text,
                row,
                source_text: text,
                tokens: [],
                words: [],
                attributes: [],
                final_tokens: [],
              };
              for (const stage of pipeline) stage(context);
              processedRows.push(context);
              j++;
            } while (j < Math.min(i + 5, linesCount));
          }
        },
        {
          priority: "smooth",
        },
      );
      i += 5;
    } while (i < linesCount);
  }
  // console.log(processedRows);
  // Word count from context.words
  const wordCount = {};
  processedRows.forEach(({ words }) => {
    words.forEach((w) => (wordCount[w] = (wordCount[w] || 0) + 1));
  });

  wordRows = Object.entries(wordCount).map(([word, count], index) => ({
    id: index + 1,
    word,
    count,
    enabled: true,
    alias: "",
    alias_id: null,
    selected: false,
  }));

  // Build dictionary for mapping
  wordDict = {};
  wordRows.forEach((row) => {
    wordDict[row.word] = {
      id: row.id,
      alias_id: row.alias_id,
    };
  });
  console.log(wordDict);
});
