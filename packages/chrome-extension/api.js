// Chrome extension implementation of the window.api contract.
// Loaded as a regular (non-module) script so it runs before module scripts,
// ensuring window.api is available when shared ES modules execute.

const HISTORY_KEY = "json-prompter-history";
const MAX_HISTORY = 50;

window.api = {
  // Identifies the platform so shared code can adjust labels/behaviour
  isExtension: true,

  async copyJson(json) {
    await navigator.clipboard.writeText(json);
    await saveToHistory(json);
    return true;
  },

  // Pastes JSON into the last focused text field on the active tab, then closes the popup.
  // Falls back to clipboard-only if the content script isn't reachable (e.g. chrome:// pages).
  async pasteJson(json) {
    await navigator.clipboard.writeText(json);
    await saveToHistory(json);

    try {
      // When opened via hotkey, background.js stores the target tab before the
      // popup window is created — currentWindow: true would otherwise resolve to
      // the popup window itself (which has no tabs).
      let tabId;
      const session = await chrome.storage.session.get("targetTabId");
      if (session.targetTabId) {
        tabId = session.targetTabId;
      } else {
        // Toolbar-button popup: the popup is attached to the browser window, so
        // currentWindow: true correctly returns the active tab.
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }

      if (tabId) {
        await chrome.tabs.sendMessage(tabId, { action: "paste", json });
      }
    } catch {
      // Content script not available — JSON is already in the clipboard as fallback
    }

    window.close();
    return true;
  },

  async getHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(HISTORY_KEY, (result) => {
        resolve(result[HISTORY_KEY] || []);
      });
    });
  },

  async clearHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [HISTORY_KEY]: [] }, resolve);
    });
  },

  hideWindow() {
    chrome.windows.getCurrent(win => {
      if (win && win.type === "popup") {
        chrome.windows.remove(win.id);
      } else {
        window.close();
      }
    });
  },

  // In a popup, the page loads fresh every time it opens — DOMContentLoaded is the equivalent
  onWindowShown(cb) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", cb);
    } else {
      cb();
    }
  },
};

async function saveToHistory(json) {
  return new Promise((resolve) => {
    chrome.storage.local.get(HISTORY_KEY, (result) => {
      const history = result[HISTORY_KEY] || [];
      history.unshift({ json, timestamp: Date.now() });
      chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, MAX_HISTORY) }, resolve);
    });
  });
}
