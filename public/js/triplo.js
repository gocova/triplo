import { LitElement, html, css, nothing } from "/js/lit/dist@3/lit-core.min.js";
import { scheduleTask } from "https://esm.sh/main-thread-scheduling";
// import { scheduleTask } from "/js/main-thread-scheduling";

const EVENT_INPUT_DID_GET_DATA = "input/did-get-data";
const EVENT_INPUT_DID_REQUEST_DATA_RESET = "input/did-request-data-reset";
const EVENT_PROCESSOR_DID_FINISH_PROCESSING = "processor/did-finish-processing";

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

export class WordTable extends LitElement {
  static properties = {
    wordRows: { type: Array },
  };
  constructor() {
    super();
    this.wordRows = [];
    this._matched = new Set();
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
    // console.log(this.wordRows);
    const renderedRows = this.wordRows.map(
      (row) =>
        html`<tr>
          <td>
            <input
              type="checkbox"
              class="rowSelect"
              data-id="${row.id}"
              .checked="${row.selected}"
              @change="${this._handleRowSelect}"
            />
          </td>
          <td>${row.id}</td>
          <td>${row.word}</td>
          <td>${row.count}</td>
          <td>
            <input
              type="checkbox"
              class="enabledCheckbox"
              data-id="${row.id}"
              .checked="${row.enabled}"
            />
          </td>
          <td>
            <input
              type="text"
              class="aliasInput"
              data-id="${row.id}"
              value="${row.alias}"
              placeholder="group name"
            />
          </td>
        </tr>`,
    );
    const matchedDescriptions = Array.from(
      Array.from(this._matched).reduce((s, word) => {
        const rows = wordToRows[word];
        if (rows) rows.forEach((relatedRow) => s.add(relatedRow));
        return s;
      }, new Set()),
    ).map((ctx) => ctx.text);
    const sidePanel = html`<div class="">
      <h4>Descripciones relacionadas (${matchedDescriptions.length})</h4>
      <ul>
        ${matchedDescriptions.map((d) => html`<li>${d}</li>`)}
      </ul>
    </div>`;
    return html`<table class="word-table">
        <thead>
          <tr>
            <th><input type="checkbox" @click="${this._toggleAllSelect}" /></th>
            <th onclick="setSort('id')">ID</th>
            <th onclick="setSort('word')">Word</th>
            <th onclick="setSort('count')">Count</th>
            <th>Enabled</th>
            <th onclick="setSort('alias_id')">Alias</th>
          </tr>
        </thead>
        <tbody>
          ${renderedRows}
        </tbody>
      </table>
      ${sidePanel}`;
  }
  _toggleAllSelect(e) {
    const checked = e.target?.checked === true;
    this.wordRows = this.wordRows.map((row) => {
      row.selected = checked;
      return row;
    });
    if (checked) {
      wordRows.forEach((wordRow) => this._matched.add(wordRow.word));
    } else {
      this._matched.clear();
    }
    this.requestUpdate();
  }
  _handleRowSelect(e) {
    if (e.target?.dataset?.id) {
      const rowId = parseInt(e.target.dataset.id);
      const row = this.wordRows.find((r) => r.id === rowId);
      if (row) {
        console.log(row);
        row.selected = !row.selected;
        if (row.selected) {
          this._matched.add(row.word);
        } else {
          this._matched.delete(row.word);
        }
        this.requestUpdate();
      }
    }
  }
}

customElements.define("word-table", WordTable);

export class TriploApp extends LitElement {
  static properties = {
    _inputDisabled: { type: Boolean },
    wordRows: { type: Array },
  };

  constructor() {
    super();
    this._inputDisabled = false;
    this.wordRows = [];

    // next bound funcs are required to get proper called by window.addEventListener
    this._boundHandleInputDidGetData = this._handleInputDidGetData.bind(this);
    this._boundHandleInputRequestDataReset =
      this._handleInputRequestDataReset.bind(this);
    this._boundHandleProcessorDidFinishProcessing =
      this._handleProcessorDidFinishProcessing.bind(this);
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
    window.addEventListener(
      EVENT_PROCESSOR_DID_FINISH_PROCESSING,
      this._boundHandleProcessorDidFinishProcessing, // use this instead of this._handleProcessorDidFinishProcessing()
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
    window.removeEventListener(
      EVENT_PROCESSOR_DID_FINISH_PROCESSING,
      this._boundHandleProcessorDidFinishProcessing ||
        this._handleProcessorDidFinishProcessing,
    );
    super.disconnectedCallback();
  }
  render() {
    return html`<div id="app">
      <div class="project-parts"></div>
      <div class="part-details">
        <div class="part-title-bar"></div>
        <div class="initial-setup">
          <input-panel .disabled="${this._inputDisabled}"></input-panel>
          <div class="input-processing-progress" style="display: none"></div>
          <div class="dictionary panel" style="display: none"></div>
        </div>
        <div class="main">
          <div class="dictionary-setup">
            <word-table .wordRows="${this.wordRows}"></word-table>
          </div>
          <div class="main-contents"></div>
        </div>
      </div>
    </div>`;
  }
  _handleInputDidGetData() {
    this._inputDisabled = true;
  }
  _handleInputRequestDataReset() {
    if (this._inputDisabled) this._inputDisabled = false;
  }
  _handleProcessorDidFinishProcessing(e) {
    console.info(
      "TriploApp._handleProcessorDidFinishProcessing: Did get event",
    );
    this.wordRows = wordRows;
  }
}
customElements.define("triplo-app", TriploApp);

let wordRows = [];
let wordDict = {}; // word -> { id, alias_id }
let attributeDict = {}; // "name|value" -> id
let attributeTypeCounters = {}; // name -> current index
// sort vars
let processedRows = [];
let wordToRows = {}; // optimized word-to-row lookup

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
    const cleanName = name.trim();
    const cleanValue = value.trim();
    const key = `${cleanName}|${cleanValue}`;

    if (!attributeDict[key]) {
      if (!attributeTypeCounters[cleanName]) {
        attributeTypeCounters[cleanName] = 0;
      }
      attributeDict[key] = attributeTypeCounters[cleanName];
      attributeTypeCounters[cleanName]++;
    }

    const id = attributeDict[key];
    ctx.attributes.push({
      type: "attribute_token",
      name: cleanName,
      value: cleanValue,
      id,
    });
    return ` <att_${cleanName}_${id}> `;
  });
}

function tokenizeSpecialTags(ctx) {
  ctx.tokens = ctx.text
    .split(/(#[\w]+|@[\w]+|<att_[\w]+_\d+>)/g)
    .filter(Boolean)
    .map((t) => t.trim());
}

function cleanAndSplit(ctx) {
  ctx.tokens = ctx.tokens
    .map((s) =>
      s
        .replace(/[^\w#@<>_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function classifyTokens(ctx) {
  const finalTokens = [];
  for (const part of ctx.tokens) {
    if (/^<att_[\w]+_\d+>$/.test(part)) {
      const [_, type, id] = part.match(/^<att_(\w+)_([0-9]+)>$/);
      const match = ctx.attributes.find(
        (a) => a.name === type && a.id === parseInt(id),
      );
      if (match) {
        finalTokens.push(match);
      } else {
        finalTokens.push({
          type: "attribute_token",
          name: type,
          value: null,
          id: parseInt(id),
        });
      }
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
  ctx.words.forEach((word) => {
    if (!wordToRows[word]) wordToRows[word] = new Set();
    wordToRows[word].add(ctx);
  });
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
    id: index,
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
  console.log(wordRows);
  const didFinishProcessingEvent = new CustomEvent(
    EVENT_PROCESSOR_DID_FINISH_PROCESSING,
    {
      bubbles: true,
      composed: true,
      detail: {
        wordRows,
      },
    },
  );
  window.dispatchEvent(didFinishProcessingEvent);
});
