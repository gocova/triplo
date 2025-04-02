import { LitElement, html, css, nothing } from "/js/lit/dist@3/lit-core.min.js";
import { scheduleTask } from "https://esm.sh/main-thread-scheduling";
// import { scheduleTask } from "/js/main-thread-scheduling";

const EVENT_INPUT_DID_GET_DATA = "input/did-get-data";
const EVENT_INPUT_DID_REQUEST_DATA_RESET = "input/did-request-data-reset";
const EVENT_PROCESSOR_DID_FINISH_PROCESSING = "processor/did-finish-processing";
const EVENT_APP_DID_REQUEST_ENRICHMENT = "app/did-request-enrichment";
const EVENT_PROCESSOR_DID_ENRICH = "processor/did-enrich";
const EVENT_PROCESSOR_DID_BUILD_TOKEN_TREE = "processor/did-build-token-tree";

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
            <button @click="${this._handleExportRequest}">Export</button>
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
  _handleAddAlias() {
    const selected = this.wordRows.filter((r) => r.selected /* && !r.aliasId*/);

    if (selected.length === 0) return;
    // const newAliasId = `${this._selectedGroup}_${aliasCounter++}`;
    const newAliasId = (this._selectedGroup || "[unselected]").concat(
      "_",
      aliasCounter++,
    );

    const words = selected.map((r) => r.word);
    let count = 0;
    const enabled = selected[0].enabled;

    selected.forEach((row) => {
      if (!row.aliasId) {
        row.aliasId = newAliasId;
        count += row.count;
        row.enabled = enabled;
      }
      row.selected = false;
    });
    aliasInfo[newAliasId] = {
      type: "alias_token",
      aliasId: newAliasId,
      count: enabled ? count : 0,
      words,
      enabled,
    };

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
  _handleExportRequest() {
    console.log("-> WordTable._handleExportRequest: Exporting...");
    const blob = new Blob([JSON.stringify(aliasInfo, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aliasInfo.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    this._groups = [];
    this._selectedGroup = null;

    // next bound funcs are required to get proper called by window.addEventListener
    this._boundHandleInputDidGetData = this._handleInputDidGetData.bind(this);
    this._boundHandleInputRequestDataReset =
      this._handleInputRequestDataReset.bind(this);
    this._boundHandleProcessorDidFinishProcessing =
      this._handleProcessorDidFinishProcessing.bind(this);
    this._boundHandleProcessorDidBuildTokenTree =
      this._handleProcessorDidBuildTokenTree.bind(this);
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
      EVENT_PROCESSOR_DID_BUILD_TOKEN_TREE,
      this._boundHandleProcessorDidBuildTokenTree,
    );
  }
  disconnectedCallback() {
    window.removeEventListener(
      EVENT_PROCESSOR_DID_BUILD_TOKEN_TREE,
      this._boundHandleProcessorDidBuildTokenTree ||
        this._handleProcessorDidBuildTokenTree,
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
        <div class="main-contents">
          <button @click="${this._handleRequestEnrichment}">Enrich rows</button>
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
    this._groups = groups;
    this._selectedGroup = groups[0] || null;
  }
  _handleRequestEnrichment() {
    console.info(
      `TriploApp._handleRequestEnrichment: Will request '${EVENT_APP_DID_REQUEST_ENRICHMENT}'`,
    );
    window.dispatchEvent(new CustomEvent(EVENT_APP_DID_REQUEST_ENRICHMENT));
  }
  _handleProcessorDidBuildTokenTree() {
    console.info(
      `TriploApp._handleProcessorDidBuildTokenTree: Will handle '${EVENT_PROCESSOR_DID_BUILD_TOKEN_TREE}'`,
    );
    console.log(tokenTree);
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
let tokenTree = {
  // root fo the token tree
  children: {},
  rows: [],
};

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
  window.dispatchEvent(new CustomEvent(EVENT_PROCESSOR_DID_ENRICH));
}

function buildTokenTree() {
  console.info("-> Will build token tree");
  tokenTree = { children: {}, rows: [] };

  const innerWordDic = wordRows.reduce((d, row) => {
    d[row.word] = row;
    return d;
  }, {});

  processedRows.forEach((ctx) => {
    const tokens = ctx.enriched_tokens.filter(
      (t) => t.type === "word_token" || t.type === "alias_token",
    );
    const sorted = [...tokens].sort((a, b) => (b.count || 0) - (a.count || 0));

    let currentNode = tokenTree;
    for (const token of sorted) {
      const key = token.aliasId || token.word;
      let shouldAdd = false;
      switch (token.type) {
        case "word_token":
          let wordRow = innerWordDic[key];
          shouldAdd = wordRow.enabled;
          break;
        case "alias_token":
          shouldAdd = token.enabled;
          break;
      }
      if (shouldAdd) {
        if (!currentNode.children[key]) {
          currentNode.children[key] = { token, children: {}, rows: [] };
        }
        currentNode = currentNode.children[key];
        currentNode.rows.push(ctx);
      }
    }
  });

  console.log("Token tree built.");
  window.dispatchEvent(new CustomEvent(EVENT_PROCESSOR_DID_BUILD_TOKEN_TREE));
}

function traverseTreeForTriplets(node = tokenTree, path = [], triplets = []) {
  const keys = Object.keys(node.children);
  if (keys.length === 0 && node.rows.length > 0) {
    const positives = node.rows.map((r) => r.row);
    const query = path.map((t) => t.alias_id || t.word).join(" ");

    let easyNegs = [],
      hardNegs = [],
      extremeNegs = [];
    // Easy negatives = other leaves
    for (const t of triplets) {
      easyNegs.push(...t.positives);
    }

    // Hard = same parent but different leaf (TODO: expand logic later)
    // Extreme = different subtree (already included in easyNegs for now)

    triplets.push({ query, positives, easyNegs, hardNegs, extremeNegs });
  } else {
    for (const key of keys) {
      const child = node.children[key];
      traverseTreeForTriplets(child, [...path, child.token], triplets);
    }
  }
  return triplets;
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
  buildTokenTree();
});
