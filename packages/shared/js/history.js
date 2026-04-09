import { setRows } from "./state.js";
import { render } from "./renderer.js";
import { escHtml, timeAgo, showToast } from "./utils.js";

// Fetches history from the platform and renders it into the history panel
export async function loadHistory() {
  const list = document.getElementById("historyList");
  const history = await window.api.getHistory();

  if (!history.length) {
    list.innerHTML = '<div class="history-empty">No history yet</div>';
    return;
  }

  list.innerHTML = history
    .map(
      (h, i) => `
      <div class="history-item" data-idx="${i}">
        <div class="history-json">${escHtml(h.json)}</div>
        <div class="history-time">${timeAgo(h.timestamp)}</div>
      </div>`
    )
    .join("");

  // Attach click handlers after rendering
  list.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", () => loadFromHistory(Number(el.dataset.idx)));
  });
}

// Parses a history entry back into rows and switches to the Builder tab
function loadFromHistory(idx) {
  window.api.getHistory().then((history) => {
    if (!history[idx]) return;
    try {
      const obj = JSON.parse(history[idx].json);
      const newRows = Object.entries(obj).map(([key, value]) => ({
        key,
        value: value === null ? "" : String(value),
        type:
          value === null        ? "null" :
          typeof value === "boolean" ? "bool" :
          typeof value === "number"  ? "num"  : "str",
      }));
      setRows(newRows.length ? newRows : [{ key: "", value: "", type: "str" }]);

      // Switch to Builder tab
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      document.querySelector('[data-tab="builder"]').classList.add("active");
      document.querySelector('[data-panel="builder"]').classList.add("active");

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
