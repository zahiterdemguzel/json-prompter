// Tracks the last focused editable element on the page.
// When the popup sends a "paste" message, inserts the JSON at the cursor position.

// Known generative AI sites — shortcut hint is shown when focused on a prompt field here.
const AI_HOSTNAMES = [
  "chat.openai.com", "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "perplexity.ai",
  "poe.com",
  "character.ai",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
  "grok.com",
  "deepseek.com",
  "chat.deepseek.com",
  "meta.ai",
  "groq.com",
  "chat.mistral.ai",
  "huggingface.co",
  "cohere.com",
  "openrouter.ai",
  "chat.lmsys.org",
  "replicate.com",
  "writesonic.com",
  "jasper.ai",
  "copy.ai",
  "notion.so",
  "playground.anthropic.com",
  "aistudio.google.com",
  "together.ai",
  "labs.perplexity.ai",
  "pi.ai",
];

function isAiSite() {
  const host = location.hostname.replace(/^www\./, "");
  return AI_HOSTNAMES.some((h) => host === h || host.endsWith("." + h));
}

// --- Shortcut hint badge ---

let hintEl = null;
let hideHintTimer = null;

function createHint() {
  const el = document.createElement("div");
  el.id = "__json-prompter-hint__";
  el.textContent = "Ctrl × 2  →  JSON Prompter";
  Object.assign(el.style, {
    position: "fixed",
    zIndex: "2147483647",
    bottom: "16px",
    right: "16px",
    padding: "5px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "system-ui, sans-serif",
    fontWeight: "500",
    color: "#fff",
    background: "rgba(30,30,40,0.88)",
    backdropFilter: "blur(6px)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
    pointerEvents: "none",
    userSelect: "none",
    opacity: "0",
    transition: "opacity 0.15s ease",
  });
  document.documentElement.appendChild(el);
  return el;
}

function showHint() {
  if (!isAiSite()) return;
  clearTimeout(hideHintTimer);
  if (!hintEl) hintEl = createHint();
  // Force reflow so transition fires even on first show
  hintEl.style.opacity = "0";
  requestAnimationFrame(() => {
    hintEl.style.opacity = "1";
  });
}

function hideHint(delay = 1800) {
  clearTimeout(hideHintTimer);
  hideHintTimer = setTimeout(() => {
    if (hintEl) hintEl.style.opacity = "0";
  }, delay);
}

// --- Focus tracking ---

let lastFocusedInput = null;

document.addEventListener("focusin", (e) => {
  const el = e.target;
  const isEditable = el.tagName === "TEXTAREA" || el.isContentEditable ||
    (el.tagName === "INPUT" && /^(text|search|url|email|password)$/i.test(el.type || "text"));

  if (isEditable) {
    lastFocusedInput = el;
    // Only show hint for textarea / large contenteditable (likely prompt fields)
    if (el.tagName === "TEXTAREA" || el.isContentEditable) {
      showHint();
    }
  }
}, true);

document.addEventListener("focusout", () => {
  hideHint();
}, true);

// --- Double-Ctrl detection ---
// Two Ctrl keydowns within 300ms opens the extension popup.
// Any non-Ctrl key between the two presses resets the counter.
let lastCtrlTime = 0;
document.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    const now = Date.now();
    if (now - lastCtrlTime < 300) {
      chrome.runtime.sendMessage({ action: "openPopup" });
      lastCtrlTime = 0;
    } else {
      lastCtrlTime = now;
    }
  } else {
    lastCtrlTime = 0;
  }
}, true);

// --- Paste handler ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== "paste") return;

  if (!lastFocusedInput) {
    sendResponse({ success: false, reason: "no focused input" });
    return;
  }

  try {
    lastFocusedInput.focus();

    if (lastFocusedInput.isContentEditable) {
      // Works for rich text editors (Google Docs, Notion, etc.)
      document.execCommand("insertText", false, msg.json);
    } else {
      // Works for <input> and <textarea>: insert at cursor, preserve selection
      const el = lastFocusedInput;
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;
      el.value = el.value.slice(0, start) + msg.json + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start + msg.json.length;
      // Fire input event so React/Vue/Angular detect the change
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, reason: err.message });
  }

  return true; // keep message channel open for async sendResponse
});
