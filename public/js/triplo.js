import { LitElement, html, css, nothing } from "/js/lit/dist@3/lit-core.min.js";
import { scheduleTask } from "https://esm.sh/main-thread-scheduling";
// import { scheduleTask } from "/js/main-thread-scheduling";

const EVENT_INPUT_DID_GET_DATA = "input/did-get-data";
const EVENT_INPUT_DID_REQUEST_DATA_RESET = "input/did-request-data-reset";
const EVENT_PROCESSOR_DID_FINISH_PROCESSING = "processor/did-finish-processing";
const EVENT_APP_DID_REQUEST_ENRICHMENT = "app/did-request-enrichment";
const EVENT_PROCESSOR_DID_ENRICH = "processor/did-enrich";
const EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS =
  "processor/did-generate-token-sets";

export class InputPanel extends LitElement {
  static properties = {
    _data: { type: String },
    inputsetDataError: { type: String },
    disabled: { type: Boolean },
    _isAddReady: { type: Boolean },
  };

  constructor() {
    super();
    this._data = null;
    this.inputsetDataError = null;
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
      ? html`<textarea
          id="inputset-data"
          placeholder="Paste data"
          .value="${this._data}"
          @blur="${this._readData}"
          required
        ></textarea>`
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
    this._isAddReady = this._data && this._data.length > 0;
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
    selectedGroup: { type: String },
  };
  constructor() {
    super();
    this.wordRows = [];
    this.selectedGroup = "[unselected]";
    this._matched = new Set();
    this._sortAsc = true;
    this._sortColumn = "id";
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
    const sortColumn = this._sortColumn;
    const sortAsc = this._sortAsc;
    this.wordRows.sort((a, b) => {
      let valA = a[sortColumn] || "";
      let valB = b[sortColumn] || "";
      if (sortColumn === "word" || sortColumn === "aliasId")
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);

      // if (sortColumn === "alias_id") {
      //   valA = valA || 0;
      //   valB = valB || 0;
      // }
      return sortAsc ? valA - valB : valB - valA;
    });

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
          <td>
            <input
              type="checkbox"
              class="enabledCheckbox"
              data-id="${row.id}"
              .checked="${row.isPrimary}"
              .disabled="${row.aliasId !== null}"
              @change="${this._handleSetPrimaryWord}"
            />
          </td>
          <td>${row.count}</td>
          <td>
            <input
              type="checkbox"
              class="enabledCheckbox"
              data-id="${row.id}"
              .checked="${row.enabled}"
              .disabled="${row.aliasId !== null}"
              @change="${this._handleEnableWord}"
            />
          </td>
          <td>
            ${row.aliasId}
            <!-- <input
              type="text"
              class="aliasInput"
              data-id="${row.id}"
              value="${row.aliasId}"
              placeholder="group name"
            /> -->
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
    const sidePanel = html`<div class="related-text">
      <h4>Descripciones relacionadas (${matchedDescriptions.length})</h4>
      <ul>
        ${matchedDescriptions.map((d) => html`<li>${d}</li>`)}
      </ul>
    </div>`;
    return html`<div class="word-table-container">
        <div class="word-table-toolbar">
            <span>${this.selectedGroup}</span>
            <button @click="${this._handleExportAlias}">Export</button>
            <span id="alias-download-file"></span>
            <input id="alias-upload-file" type="file" @change="${this._handleImportAlias}"/>
        </div>
        <div class="scrollable">
            <table class="word-table">
            <thead>
                <tr>
                <th>
                    <input type="checkbox" @click="${this._handleToggleAllSelect}" />
                </th>
                <th @click="${() => this._handleSetSort("id")}">ID</th>
                <th @click="${() => this._handleSetSort("word")}"">Word</th>
                <th @click="${() => this._handleSetSort("isPrimary")}">Primary</th>
                <th @click="${() => this._handleSetSort("count")}"">Count</th>
                <th>Enabled</th>
                <th >
                    <span @click="${() => this._handleSetSort("aliasId")}">Alias</span>
                    <button @click="${this._handleAddAlias}">Add</button>
                    <button @click="${this._handleRemoveAlias}">Remove</button>
                </th>
                </tr>
            </thead>
            <tbody>
                ${renderedRows}
            </tbody>
            </table>
        </div>
      </div>
      ${sidePanel}`;
  }
  _handleToggleAllSelect(e) {
    const checked = e.target?.checked === true;
    this.wordRows = this.wordRows.map((row) => {
      row.selected = checked;
      return row;
    });
    if (checked) {
      this.wordRows.forEach((wordRow) => this._matched.add(wordRow.word));
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
        // console.log(row);
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
  _handleSetSort(column) {
    if (this._sortColumn === column) {
      this._sortAsc = !this._sortAsc;
    } else {
      this._sortColumn = column;
      this._sortAsc = true;
    }
    this.requestUpdate();
  }
  _handleEnableWord(e) {
    if (e.target?.dataset?.id) {
      const rowId = parseInt(e.target.dataset.id);
      const row = this.wordRows.find((r) => r.id === rowId);
      if (row) {
        // console.log(row);
        row.enabled = !row.enabled;

        this.requestUpdate();
      }
    }
  }
  _handleSetPrimaryWord(e) {
    if (e.target?.dataset?.id) {
      const rowId = parseInt(e.target.dataset.id);
      const row = this.wordRows.find((r) => r.id === rowId);
      if (row) {
        // console.log(row);
        row.isPrimary = !row.isPrimary;

        this.requestUpdate();
      }
    }
  }
  _handleAddAlias() {
    const selected = this.wordRows.filter((r) => r.selected /* && !r.aliasId*/);

    if (selected.length === 0) return;
    // const newAliasId = `${this._selectedGroup}_${aliasCounter++}`;
    const newAliasId = (this.selectedGroup || "[unselected]").concat(
      "_",
      aliasCounter,
    );

    // const words = selected.map((r) => r.word);
    let count = 0;
    const enabled = selected[0].enabled;
    const isPrimary = selected[0].isPrimary;

    const words = [];
    selected.forEach((row) => {
      if (!row.aliasId) {
        row.aliasId = newAliasId;
        count += row.count;
        row.enabled = enabled;
        row.isPrimary = isPrimary;
        words.push(row.word);
      }
      row.selected = false;
    });
    if (words.length > 0) {
      aliasInfo[newAliasId] = {
        type: "alias_token",
        aliasId: newAliasId,
        count: enabled ? count : 0,
        words,
        enabled,
        isPrimary,
        rowId: aliasCounter++,
      };
    }

    this._matched.clear();
    this.requestUpdate();
  }
  _handleRemoveAlias() {
    const selected = this.wordRows.filter((r) => r.selected /* && r.aliasId */);
    selected.forEach((row) => {
      if (row.aliasId) {
        const info = aliasInfo[row.aliasId];
        if (info) {
          const { words } = info;
          const wordIndex = words.indexOf(row.word);
          if (wordIndex >= 0) {
            words.splice(wordIndex, 1);
            if (info.enabled) {
              info.count -= row.count;
            }
            // info.words = words; // not required since we are using the same ref
          }
          const wordsLen = words.length;
          if (wordsLen <= 0) delete aliasInfo[row.aliasId];
        }
        row.aliasId = null;
      }
      row.selected = false;
    });
    this._matched.clear();
    this.requestUpdate();
  }
  _handleExportAlias() {
    console.log("-> WordTable._handleExportRequest: Exporting...");
    const blob = new Blob([JSON.stringify(aliasInfo, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // a.download = (this.selectedGroup || "[unselected]").concat(
    //   " alias_info.json",
    // );
    a.download = "alias_info ".concat(
      this.selectedGroup || "[unselected]",
      ".json",
    );
    a.textContent = "Download";
    a.style.display = "block";

    const downloadElementParent = this.renderRoot.querySelector(
      "#alias-download-file",
    );
    if (downloadElementParent) {
      downloadElementParent.appendChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 20000);
    }
  }
  _handleImportAlias(event) {
    console.info(`-> WordTable._handleImportAlias: Importing...`);
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        aliasInfo = JSON.parse(e.target.result);
        aliasCounter = 0;

        // Update wordRows if already loaded
        if (this.wordRows.length > 0) {
          // Reset current wordRows
          this.wordRows.forEach((row) => {
            row.aliasId = null;
            // row.alias = "";
            row.enabled = true;
            row.isPrimary = false;
          });
          // Reflect new data
          Object.entries(aliasInfo).forEach(([aliasId, info]) => {
            const { enabled, isPrimary, rowId } = info;
            info.rowId = Math.max(aliasCounter, rowId || 0);
            aliasCounter = info.rowId + 1;
            info.words.forEach((word) => {
              const row = this.wordRows.find((r) => r.word === word);
              if (row) {
                row.aliasId = aliasId;
                // row.alias = aliasId;
                row.enabled = enabled;
                row.isPrimary = isPrimary;
              }
            });
          });
        }
        this.requestUpdate();
        // alert("Alias info imported successfully.");
      } catch (err) {
        alert("Failed to import alias info.");
      }
      const fileUploadElement =
        this.renderRoot.querySelector("#alias-upload-file");
      if (fileUploadElement) {
        fileUploadElement.value = "";
      }
    };
    reader.readAsText(file);
  }
}

customElements.define("word-table", WordTable);

export class TrainingSets extends LitElement {
  static properties = {
    _selectedTrainingSet: { type: Number },
  };

  constructor() {
    super();
    this._tokenSets = [];
    this._selectedTrainingSet = null;

    // bound funcs required for the visualization
    this._boundHandleProcessorDidGenerateTokenSets =
      this._handleProcessorDidGenerateTokenSets.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();

    // Apply external styles to the shadow dom
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", "css/cova.css");
    this.renderRoot.appendChild(linkElem);

    window.addEventListener(
      EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS,
      this._boundHandleProcessorDidGenerateTokenSets,
    );
  }
  disconnectedCallback() {
    window.removeEventListener(
      EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS,
      this._boundHandleProcessorDidGenerateTokenSets ||
        this._handleProcessorDidGenerateTokenSets,
    );

    super.disconnectedCallback();
  }

  render() {
    const getTokenElement = (token) =>
      token.type === "alias_token"
        ? html`<span class="token"
            >${token.words.map(
              (w) => html`<div class="alias">${w}</div>`,
            )}</span
          >`
        : token.type === "word_token"
          ? html`<span class="token">${token.word}</span>`
          : emptyHtml;
    const trainingSetsDetails = html`${Object.entries(this._tokenSets).map(
      ([key, p]) => {
        // const p = this._tokenSets[key];
        return html`<tr
          @click="${() => this._handleTrainingSetSelection(key)}"
          class="${key === this._selectedTrainingSet ? "selected" : ""}"
        >
          <td>
            <input
              type="text"
              .value="${p.query}"
              spellcheck="false"
              class="training-set-query"
              data-id="${key}"
              @change="${this._handleQueryChange}"
              @focus="${() => this._handleTrainingSetSelection(key)}"
            />
          </td>
          <!-- <td class="${p.isLeaf ? "is-leaf" : ""}"> -->
          <td>
            <div class="path-view">
              ${p.tokens.map((token) => getTokenElement(token))}
            </div>
          </td>
          <td>${p.count}</td>
          <!-- <td>rows...</td> -->
        </tr>`;
      },
    )}`;
    const selectedPath = this._tokenSets[this._selectedTrainingSet];
    const getClearText = (finalTokens) =>
      html`${finalTokens.map(
        (t) =>
          html`${t.type === "word_token"
            ? t.word
            : t.type === "attribute_token"
              ? html`<span class="attribute-token">${t.value}</span>`
              : "<|unk|>"}&nbsp;`,
      )}`;
    const relatedTextsElement = html`<table>
      <thead>
        <tr>
          <th colspan="2">Related texts for '${this._selectedTrainingSet}'</th>
        </tr>
      </thead>
      <tbody>
        ${(selectedPath?.rows || []).map(
          (row) =>
            html`<tr>
              <td>${row.textId}</td>
              <!-- <td>${row.source_text}</td> -->
              <td>${getClearText(row.final_tokens)}</td>
            </tr>`,
        )}
      </tbody>
    </table>`;
    return html`<div class="training-sets-container">
      <div>Training sets</div>
      <div class="scrollable">
        <table>
          <thead>
            <tr>
              <th class="training-sets-name-column">Query</th>
              <th class="training-sets-path-column">Path</th>
              <th class="training-sets-size-column">Size</th>
              <!-- <th>Related texts</th> -->
            </tr>
          </thead>
          <tbody>
            ${trainingSetsDetails}
          </tbody>
        </table>
      </div>
      <div class="related-text">${relatedTextsElement}</div>
    </div>`;
  }
  _handleProcessorDidGenerateTokenSets() {
    console.info(
      `-> TrainingSets._handleProcessorDidGenerateTokenSets: Got called...'`,
    );
    this._tokenSets = tokenSets || {};
    this._selectedTrainingSet = null;
    this.requestUpdate();
  }
  _handleTrainingSetSelection(trainingSetId) {
    this._selectedTrainingSet = trainingSetId;
    // this.requestUpdate();
  }
  _handleQueryChange(e) {
    console.log("-> TrainingSets._handleQueryChange: Updating...");
    if (e.target) {
      if (e.target.dataset?.id) {
        const key = e.target.dataset.id;
        const relevantSet = this._tokenSets[key];
        if (relevantSet) {
          relevantSet.query = e.target.value || "";
          this.requestUpdate();
        }
      }
    }
  }
}

customElements.define("training-sets", TrainingSets);

export class TriploApp extends LitElement {
  static properties = {
    _inputDisabled: { type: Boolean },
    wordRows: { type: Array },
  };

  constructor() {
    super();
    this._inputDisabled = false;
    this.wordRows = [];
    this._groups = [];
    this._selectedGroup = null;

    // next bound funcs are required to get proper called by window.addEventListener
    this._boundHandleInputDidGetData = this._handleInputDidGetData.bind(this);
    this._boundHandleInputRequestDataReset =
      this._handleInputRequestDataReset.bind(this);
    this._boundHandleProcessorDidFinishProcessing =
      this._handleProcessorDidFinishProcessing.bind(this);
    this._boundHandleProcessorDidBuildTokenTree =
      this._handleProcessorDidGenerateTokenSets.bind(this);
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
    window.addEventListener(
      EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS,
      this._boundHandleProcessorDidBuildTokenTree,
    );
  }
  disconnectedCallback() {
    window.removeEventListener(
      EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS,
      this._boundHandleProcessorDidBuildTokenTree ||
        this._handleProcessorDidGenerateTokenSets,
    );
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
    const groupsElement = html`${this._groups.map((g) => html`<li>${g}</li>`)}`;
    return html`<div id="app">
      <div class="group-setup">
        <div class="initial-setup">
          <input-panel .disabled="${this._inputDisabled}"></input-panel>
          <div class="input-processing-progress" style="display: none"></div>
        </div>
        <div class="dictionary-setup">
          <div class="group-selector">
            <ul>
              ${groupsElement}
            </ul>
          </div>
          <word-table
            .wordRows="${this.wordRows}"
            .selectedGroup="${this._selectedGroup}"
          ></word-table>
        </div>
      </div>
      <div class="main">
        <div class="main-toolbar">
          <button @click="${this._handleRequestEnrichment}">Enrich rows</button>

          <div class="training-sets-toolbar">
            <span>Training sets:</span>
            <button @click="${this._handleExportTrainingSet}">Get link</button
            ><span id="training-sets-download-file"></span>
            <input
              id="training-sets-upload-file"
              type="file"
              @change="${this._handleImportTrainingSet}"
            />
          </div>
        </div>
        <training-sets></training-sets>
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
    this._groups = groups;
    this._selectedGroup = groups[0] || null;
    console.log("groups");
    console.log(groups);
    // this.requestUpdate();
  }
  _handleRequestEnrichment() {
    console.info(
      `TriploApp._handleRequestEnrichment: Will request '${EVENT_APP_DID_REQUEST_ENRICHMENT}'`,
    );
    window.dispatchEvent(new CustomEvent(EVENT_APP_DID_REQUEST_ENRICHMENT));
  }
  _handleProcessorDidGenerateTokenSets() {
    console.info(
      `TriploApp._handleProcessorDidGenerateTokenSets: Will handle '${EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS}'`,
    );
    // console.log(tokenTree);
  }
  _handleExportTrainingSet() {
    console.log("-> TriploApp._handleExportTrainingSets: Exporting...");
    const blob = new Blob([JSON.stringify(tokenSets, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    // a.download = (this.selectedGroup || "[unselected]").concat(
    //   " token_tree.json",
    // );
    a.download = "training_sets ".concat(groups[0] || "[unselected]", ".json");
    a.textContent = "Download";
    a.style.display = "block";

    const downloadElementParent = this.renderRoot.querySelector(
      "#training-sets-download-file",
    );
    if (downloadElementParent) {
      downloadElementParent.appendChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 20000);
    }
  }
  _handleImportTrainingSet(event) {
    console.log("-> TriploApp._handleImportTrainingSets: Importing...");
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        tokenSets = JSON.parse(e.target.result);
        console.log(
          "--> TriploApp._handleImportTrainingSets: tokenSets loaded",
        );
        window.dispatchEvent(
          new CustomEvent(EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS),
        );
        // alert("Alias info imported successfully.");
      } catch (err) {
        alert("Failed to import collectedPaths info.");
      }
      const fileUploadElement = this.renderRoot.querySelector(
        "#training-sets-upload-file",
      );
      if (fileUploadElement) {
        fileUploadElement.value = "";
      }
    };
    reader.readAsText(file);
  }
}
customElements.define("triplo-app", TriploApp);

let wordRows = [];
let wordDict = {}; // word -> { id, aliasId }
let attributeDict = {}; // "name|value" -> id
let attributeTypeCounters = {}; // name -> current index
let processedRows = [];
let wordToRows = {}; // optimized word-to-row lookup
let groups = [];
let aliasCounter = 0;
let aliasInfo = {};
let tokenSets = {};

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
        value: dict?.aliasId || dict?.id || null,
        word: lower,
      };
    }
    return token; // preserve attribute_token or number_token
  });
}

function enrichProcessedTokens() {
  console.info("-> Will enrich tokens...");
  processedRows.forEach((ctx) => {
    const enriched = [];
    const seenAliases = new Set();

    ctx.final_tokens.forEach((token) => {
      if (token.type === "word_token") {
        const row = wordRows.find((r) => r.word === token.word);
        if (!row || !row.enabled) return;

        if (row.aliasId && aliasInfo[row.aliasId]) {
          if (!seenAliases.has(row.aliasId)) {
            // const { aliasId, count, words, enabled } = aliasInfo[row.aliasId];
            // enriched.push({
            //   type: "alias_token",
            //   aliasId,
            //   count,
            //   words,
            //   enabled,
            // });
            // seenAliases.add(aliasId);
            const aliasToken = aliasInfo[row.aliasId];
            const { aliasId } = aliasToken;
            enriched.push(aliasToken);
            seenAliases.add(aliasId);
          }
        } else {
          enriched.push({ ...token, count: row.count });
        }
      } else {
        enriched.push(token);
      }
    });

    ctx.enriched_tokens = enriched;
  });
  console.log("Processed rows enriched.");
  console.log(processedRows);
  window.dispatchEvent(new CustomEvent(EVENT_PROCESSOR_DID_ENRICH));
}

function deduplicateTokenSets() {
  console.info("-> deduplicateTokenSets: Will deduplicate token sets...");

  const uniqueSets = {};
  const rowKeyToBestSet = new Map();
  const rowKeyToRedundantKeys = new Map();

  Object.entries(tokenSets).forEach(([key, set]) => {
    const rowIds = set.rows
      .map((r) => r.row.id || JSON.stringify(r.row))
      .sort()
      .join("|");

    // If first time seeing this row set, mark it
    if (!rowKeyToBestSet.has(rowIds)) {
      rowKeyToBestSet.set(rowIds, { key, set });
      rowKeyToRedundantKeys.set(rowIds, []);
    } else {
      const currentBest = rowKeyToBestSet.get(rowIds);
      const currentRedundant = rowKeyToRedundantKeys.get(rowIds);

      // Determine if current is better
      const isCurrentBetter =
        set.tokens.length > currentBest.set.tokens.length ||
        (set.tokens.length === currentBest.set.tokens.length && set.isLeaf);

      if (isCurrentBetter) {
        // Replace the best, add old key to redundant
        currentRedundant.push(currentBest.set.tokens);
        rowKeyToBestSet.set(rowIds, { key, set });
      } else {
        // Add this one to redundant list
        currentRedundant.push(set.tokens);
      }
    }
  });

  // Build final tokenSets
  rowKeyToBestSet.forEach(({ key, set }, rowIds) => {
    set.redundantKeys = rowKeyToRedundantKeys.get(rowIds);
    uniqueSets[key] = set;
  });

  tokenSets = uniqueSets;
  console.log("Deduplicated token sets and recorded redundant combinations.");
  console.log(tokenSets);
}

// function getTokenSubsets(tokens) {
//   const result = [];
//   const n = tokens.length;

//   for (let i = 1; i < 1 << n; i++) {
//     const subset = [];
//     for (let j = 0; j < n; j++) {
//       if (i & (1 << j)) {
//         subset.push(tokens[j]);
//       }
//     }
//     result.push(subset);
//   }

//   return result;
// }
function getTokenSubsets(tokens) {
  const result = [];
  const n = tokens.length;

  for (let i = 1; i < 1 << n; i++) {
    let withPrimary = false;
    const subset = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        const currToken = tokens[j];
        subset.push(currToken);
        if (currToken.isPrimary) withPrimary = true;
      }
    }
    if (withPrimary) result.push(subset);
  }

  return result;
}

function generateTokenSets() {
  console.info("-> generateTokenSets: Will generate token sets...");
  tokenSets = {};

  processedRows.forEach((ctx) => {
    const enrichedTokens = [
      ...ctx.enriched_tokens.filter(
        (t) => t.type === "word_token" || t.type === "alias_token",
      ),
    ];

    const fullKey = enrichedTokens
      .map((t) => t.aliasId || t.word)
      .sort()
      .join("|");

    const subsets = getTokenSubsets(enrichedTokens);
    subsets.forEach((subset) => {
      const key = subset
        .map((t) => t.aliasId || t.word)
        .sort()
        .join("|");
      if (!tokenSets[key]) {
        tokenSets[key] = {
          tokens: subset,
          query: "",
          rows: [],
          isLeaf: false,
          count: 0,
        };
      }
      tokenSets[key].rows.push(ctx);
      tokenSets[key].count++;
    });
    if (tokenSets[fullKey]) {
      tokenSets[fullKey].isLeaf = true;
    }
  });

  console.log("Token subsets generated and leaf sets identified.");
  console.log(tokenSets);
  deduplicateTokenSets();
  window.dispatchEvent(
    new CustomEvent(EVENT_PROCESSOR_DID_GENERATE_TOKEN_SETS),
  );
}

// === Event handlers ===

window.addEventListener(EVENT_INPUT_DID_REQUEST_DATA_RESET, (e) => {
  console.log(e);
  processedRows = [];
});

window.addEventListener(EVENT_INPUT_DID_GET_DATA, async (e) => {
  console.info(`-> Processing event: ${EVENT_INPUT_DID_GET_DATA}`);
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

  const lines = rawText.split("\n").filter(Boolean);
  const linesCount = lines.length;
  if (linesCount < 2) {
    alert(
      `At least 2 rows (1 line of headers + 1 line of data) were expected but got ${linesCount} rows!`,
    );
  }
  const headers = lines[0].toLowerCase().split("\t");
  const textIndex = 0; // always the first column
  const idIndex = headers.indexOf("id");
  const groupIndex = headers.indexOf("group");
  let i = 1;
  if (i < linesCount) {
    do {
      await scheduleTask(
        () => {
          let j = i;
          if (j < Math.min(i + 5, linesCount)) {
            do {
              const row = (lines[j] || "").split("\t");
              const text = row[textIndex] || "";
              const group =
                groupIndex !== -1
                  ? row[groupIndex] || "default_group"
                  : "default_group";
              const textId = idIndex !== -1 ? row[idIndex] || "" : "";
              let context = {
                text,
                group,
                textId,
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
  groups = Array.from(new Set(processedRows.map((row) => row.group)));

  // Word count from context.words
  const wordCount = {};
  processedRows.forEach(({ words }) => {
    words.forEach((w) => (wordCount[w] = (wordCount[w] || 0) + 1));
  });

  wordRows = Object.entries(wordCount).map(([word, count], index) => ({
    id: index,
    word,
    count,
    isPrimary: false,
    enabled: true,
    // alias: "",
    aliasId: null,
    selected: false,
  }));

  // Build dictionary for mapping
  wordDict = {};
  wordRows.forEach((row) => {
    wordDict[row.word] = {
      id: row.id,
      aliasId: row.aliasId,
    };
  });
  console.log(processedRows);
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

window.addEventListener(EVENT_APP_DID_REQUEST_ENRICHMENT, () => {
  console.info(`-> Processing event: '${EVENT_APP_DID_REQUEST_ENRICHMENT}'`);
  enrichProcessedTokens();
});

window.addEventListener(EVENT_PROCESSOR_DID_ENRICH, () => {
  console.info(`-> Processing event: '${EVENT_PROCESSOR_DID_ENRICH}'`);
  generateTokenSets();
});
