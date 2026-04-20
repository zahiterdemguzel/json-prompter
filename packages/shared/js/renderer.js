import { rows, TYPES, pushSnapshot } from "./state.js";
import { updatePreview, buildJson } from "./json-builder.js";
import { showToast, detectType } from "./utils.js";
import { attachAutocomplete } from "./autocomplete.js";

// Syncs badge and valInput to a given type — used by both auto-detect and manual cycle
function applyType(type, badge, input) {
  badge.className = `type-badge ${type}`;
  badge.textContent = type;
  input.disabled = type === "null";
  input.placeholder = type === "bool" ? "true / false" : type === "null" ? "(null)" : "value";
}

// Rebuilds the entire rows UI from the current state
export function render() {
  const container = document.getElementById("rows");
  container.innerHTML = "";

  rows.forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "kv-row";

    const keyInput = document.createElement("input");
    keyInput.className = "key-input";
    keyInput.placeholder = "key";
    keyInput.value = row.key;
    keyInput.addEventListener("input", (e) => {
      rows[i].key = e.target.value;
      updatePreview();
    });
    keyInput.addEventListener("keydown", (e) => handleKeyNav(e, i, "key"));
    attachAutocomplete(keyInput);

    const sep = document.createElement("span");
    sep.className = "kv-sep";
    sep.textContent = "→";

    const typeBadge = document.createElement("span");

    const valInput = document.createElement("input");
    valInput.className = "val-input";
    valInput.value = row.value;
    valInput.addEventListener("input", (e) => {
      rows[i].value = e.target.value;
      const detected = detectType(e.target.value);
      if (detected !== rows[i].type) {
        rows[i].type = detected;
        applyType(detected, typeBadge, valInput);
      }
      updatePreview();
    });
    valInput.addEventListener("keydown", (e) => handleKeyNav(e, i, "val"));

    applyType(row.type, typeBadge, valInput);
    typeBadge.addEventListener("click", () => {
      const currentIdx = TYPES.indexOf(rows[i].type);
      rows[i].type = TYPES[(currentIdx + 1) % TYPES.length];
      applyType(rows[i].type, typeBadge, valInput);
      updatePreview();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      if (rows.length > 1) {
        pushSnapshot();
        rows.splice(i, 1);
        render();
      }
    });

    div.append(keyInput, sep, valInput, typeBadge, removeBtn);
    container.appendChild(div);
  });

  updatePreview();
}

// Adds a new empty row and focuses its key input
export function addRow() {
  pushSnapshot();
  rows.push({ key: "", value: "", type: "str" });
  render();
  setTimeout(() => {
    const keys = document.querySelectorAll(".key-input");
    keys[keys.length - 1]?.focus();
  }, 20);
}

// Handles keyboard navigation within the row grid
export function handleKeyNav(e, rowIndex, field) {
  // Tab on the last value field → add a new row
  if (e.key === "Tab" && !e.shiftKey && field === "val" && rowIndex === rows.length - 1) {
    e.preventDefault();
    addRow();
  }

  // Ctrl/Cmd+Enter → paste action
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    handlePrimaryAction();
  }

  // Escape → close/hide window
  if (e.key === "Escape") {
    window.api.hideWindow();
  }

  // Arrow keys → move focus between rows (skip if autocomplete is handling it)
  if (e.key === "ArrowDown" && rowIndex < rows.length - 1) {
    if (field === "key" && document.activeElement._autocompleteOpen?.()) return;
    e.preventDefault();
    const sel = field === "key" ? ".key-input" : ".val-input";
    document.querySelectorAll(sel)[rowIndex + 1]?.focus();
  }
  if (e.key === "ArrowUp" && rowIndex > 0) {
    if (field === "key" && document.activeElement._autocompleteOpen?.()) return;
    e.preventDefault();
    const sel = field === "key" ? ".key-input" : ".val-input";
    document.querySelectorAll(sel)[rowIndex - 1]?.focus();
  }

  // Backspace on an empty row → delete it
  if (e.key === "Backspace" && rows[rowIndex].key === "" && rows[rowIndex].value === "" && rows.length > 1) {
    if (field === "key") {
      e.preventDefault();
      pushSnapshot();
      rows.splice(rowIndex, 1);
      render();
      const prevIdx = Math.max(0, rowIndex - 1);
      setTimeout(() => document.querySelectorAll(".val-input")[prevIdx]?.focus(), 20);
    }
  }
}

// Calls the platform's paste action — Electron pastes into the foreground window,
// Chrome extension pastes into the last focused text field on the active tab
async function handlePrimaryAction() {
  const json = buildJson();
  await window.api.pasteJson(json);
}

// Wires up the copy button
export function handleCopy() {
  const json = buildJson();
  window.api.copyJson(json);
  showToast("Copied to clipboard ✓");
}
