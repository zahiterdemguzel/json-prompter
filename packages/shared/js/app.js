// Main entry point — wires up shared UI logic for both Electron and Chrome extension
import { render, addRow, handleCopy } from "./renderer.js";
import { buildJson } from "./json-builder.js";
import { loadHistory, clearHistory } from "./history.js";
import { loadTemplates, saveCurrentAsTemplate } from "./templates.js";
import { initSettings, getSetting } from "./settings.js";
import { undo, redo } from "./state.js";
import { invalidateKeyCache } from "./autocomplete.js";

// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    if (tab.dataset.tab === "history") loadHistory();
    if (tab.dataset.tab === "templates") loadTemplates();
  });
});

// Add field button
document.getElementById("addBtn").addEventListener("click", addRow);

// Copy button
document.getElementById("copyBtn").addEventListener("click", handleCopy);

// Paste & Close button
document.getElementById("pasteBtn").addEventListener("click", async () => {
  const json = buildJson();
  await window.api.pasteJson(json);
  invalidateKeyCache();
});

// Clear history button
document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);

// Save as Template button
document.getElementById("saveTemplateBtn")?.addEventListener("click", saveCurrentAsTemplate);

// Global keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.api.hideWindow();

  // Undo/Redo — only when not typing in a text input
  const tag = document.activeElement?.tagName;
  const isInput = tag === "INPUT" || tag === "TEXTAREA";

  if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
    if (!isInput) {
      e.preventDefault();
      if (undo()) render();
    }
  }
  if (!isInput && (e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    if (redo()) render();
  }
});

// Focus first key input when window is shown/opened
window.api.onWindowShown(() => {
  invalidateKeyCache();
  setTimeout(() => {
    document.querySelector(".key-input")?.focus();
  }, 50);
});

// Boot: init settings, apply theme, then render
(async () => {
  await initSettings();
  const theme = getSetting("theme") || "auto";
  document.documentElement.className = "theme-" + theme;
  render();
})();
