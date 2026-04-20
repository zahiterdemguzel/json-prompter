import { rows, setRows } from "./state.js";
import { render } from "./renderer.js";
import { escHtml, showToast, switchToTab } from "./utils.js";

export async function loadTemplates() {
  const list = document.getElementById("templateList");
  if (!list) return;
  const templates = await window.api.getTemplates();
  // Sort: pinned first, then by createdAt desc
  const sorted = [...templates].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  if (!sorted.length) {
    list.innerHTML = '<div class="history-empty">No templates yet.<br>Use "Save as Template" to create one.</div>';
    return;
  }

  list.innerHTML = sorted.map((t) => `
    <div class="template-item${t.pinned ? " pinned" : ""}" data-id="${escHtml(t.id)}">
      <div class="template-item-main">
        <div class="template-name">${escHtml(t.name)}</div>
        <div class="template-preview">${escHtml(JSON.stringify(Object.fromEntries(t.rows.filter(r => r.key).map(r => [r.key, r.value]))))}</div>
      </div>
      <div class="template-actions">
        <button class="template-pin-btn" data-id="${escHtml(t.id)}" title="${t.pinned ? "Unpin" : "Pin"}">${t.pinned ? "★" : "☆"}</button>
        <button class="template-delete-btn" data-id="${escHtml(t.id)}" title="Delete">×</button>
      </div>
    </div>`).join("");

  list.querySelectorAll(".template-item-main").forEach((el) => {
    const id = el.closest(".template-item").dataset.id;
    const t = sorted.find((s) => s.id === id);
    el.addEventListener("click", () => t && loadFromTemplate(t));
  });
  list.querySelectorAll(".template-pin-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); togglePin(btn.dataset.id); });
  });
  list.querySelectorAll(".template-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); deleteTemplate(btn.dataset.id); });
  });
}

function loadFromTemplate(t) {
  setRows(t.rows.length ? t.rows : [{ key: "", value: "", type: "str" }]);
  switchToTab("builder");
  render();
  showToast(`Loaded "${t.name}"`);
}

export async function saveCurrentAsTemplate() {
  const name = prompt("Template name:");
  if (!name || !name.trim()) return;
  const snapshot = rows.filter(r => r.key.trim()).map(r => ({ ...r }));
  if (!snapshot.length) { showToast("Add at least one field first"); return; }
  const templates = await window.api.getTemplates();
  const newTemplate = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: name.trim(),
    rows: snapshot,
    pinned: false,
    createdAt: Date.now(),
  };
  templates.unshift(newTemplate);
  await window.api.setTemplates(templates);
  showToast(`Saved "${newTemplate.name}"`);
}

async function togglePin(id) {
  const templates = await window.api.getTemplates();
  const t = templates.find(t => t.id === id);
  if (t) t.pinned = !t.pinned;
  await window.api.setTemplates(templates);
  loadTemplates();
}

async function deleteTemplate(id) {
  const templates = await window.api.getTemplates();
  const updated = templates.filter(t => t.id !== id);
  await window.api.setTemplates(updated);
  loadTemplates();
  showToast("Template deleted");
}
