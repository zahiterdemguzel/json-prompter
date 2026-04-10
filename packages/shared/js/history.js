import { setRows } from "./state.js";
import { render } from "./renderer.js";
import { escHtml, timeAgo, showToast, switchToTab, detectType } from "./utils.js";

let searchBound = false;

function renderHistory(list, history, query) {
  // Pair each entry with its original index before filtering so click handlers
  // can reference the correct position in the full history array.
  const filtered = history
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !query || h.json.toLowerCase().includes(query));

  if (!filtered.length) {
    list.innerHTML = '<div class="history-empty">No history yet</div>';
    return;
  }

  list.innerHTML = filtered
    .map(
      ({ h, i }) => `
      <div class="history-item" data-idx="${i}">
        <div class="history-json">${escHtml(h.json)}</div>
        <div class="history-time">${timeAgo(h.timestamp)}</div>
      </div>`
    )
    .join("");

  list.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", () => loadFromHistory(Number(el.dataset.idx)));
  });
}

export async function loadHistory() {
  const list = document.getElementById("historyList");
  const searchEl = document.getElementById("historySearch");

  if (searchEl && !searchBound) {
    searchBound = true;
    searchEl.addEventListener("input", () => loadHistory());
  }

  const query = searchEl?.value.toLowerCase() ?? "";
  const history = await window.api.getHistory();

  renderHistory(list, history, query);
}

function loadFromHistory(idx) {
  window.api.getHistory().then((history) => {
    if (!history[idx]) return;
    try {
      const obj = JSON.parse(history[idx].json);
      const newRows = Object.entries(obj).map(([key, value]) => ({
        key,
        value: value === null ? "" : String(value),
        type: detectType(value === null ? "null" : String(value)),
      }));
      setRows(newRows.length ? newRows : [{ key: "", value: "", type: "str" }]);

      switchToTab("builder");

      render();
    } catch (e) {
      // Ignore malformed history entries
    }
  });
}

export async function clearHistory() {
  await window.api.clearHistory();
  loadHistory();
  showToast("History cleared");
}
