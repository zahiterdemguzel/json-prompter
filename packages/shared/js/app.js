// Main entry point — wires up shared UI logic for both Electron and Chrome extension
import { render, addRow, handleCopy } from "./renderer.js";
import { buildJson } from "./json-builder.js";
import { loadHistory, clearHistory } from "./history.js";

// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    if (tab.dataset.tab === "history") loadHistory();
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
});

// Clear history button
document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);

// Global Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.api.hideWindow();
});

// Focus first key input when window is shown/opened
window.api.onWindowShown(() => {
  setTimeout(() => {
    document.querySelector(".key-input")?.focus();
  }, 50);
});

// Initial render
render();
