// Tracks the last focused editable element on the page.
// When the popup sends a "paste" message, inserts the JSON at the cursor position.

// Known generative AI sites — floating button is shown when a prompt field is focused.
const AI_HOSTNAMES = [
  // OpenAI
  "chat.openai.com", "chatgpt.com", "playground.openai.com",
  // Anthropic
  "claude.ai", "playground.anthropic.com",
  // Google
  "gemini.google.com", "aistudio.google.com", "notebooklm.google", "labs.google",
  // Microsoft / Copilot
  "copilot.microsoft.com", "bing.com", "designer.microsoft.com",
  // Meta
  "meta.ai",
  // xAI
  "grok.com", "x.com",
  // Perplexity
  "perplexity.ai", "labs.perplexity.ai",
  // DeepSeek
  "deepseek.com", "chat.deepseek.com",
  // Mistral
  "chat.mistral.ai",
  // Groq
  "groq.com",
  // Multi-model / aggregators
  "poe.com", "you.com", "openrouter.ai", "chat.lmsys.org", "lmarena.ai",
  // Chatbots & assistants
  "character.ai", "pi.ai", "phind.com",
  "doubao.com", "kimi.com", "kimi.moonshot.cn",
  "qwen.ai", "tongyi.aliyun.com",
  "genspark.ai", "manus.im",
  "monica.im", "blackbox.ai", "coze.com",
  "hume.ai", "giga.chat", "quark.cn",
  "minimax.io",
  // Character / roleplay chat
  "janitorai.com", "candy.ai", "talkie-ai.com",
  "joyland.ai", "chub.ai", "moescape.ai",
  // AI Writing assistants
  "writesonic.com", "jasper.ai", "copy.ai", "rytr.me",
  "quillbot.com", "grammarly.com",
  "sudowrite.com", "novelai.net",
  "writer.com", "frase.io", "gamma.app",
  // Productivity / notes / workspace
  "notion.so", "mem.ai", "taskade.com",
  // Presentations
  "beautiful.ai", "pitch.com", "slidesai.io",
  // Translation / research
  "deepl.com", "consensus.app", "elicit.com", "scite.ai", "exa.ai",
  // AI Coding assistants
  "cursor.com", "replit.com", "lovable.dev",
  "bolt.new", "v0.dev", "windsurf.com",
  "github.com", "cognition.ai", "dify.ai",
  // Hugging Face & ML platforms
  "huggingface.co", "replicate.com", "together.ai", "cohere.com",
  // AI Image generators (text prompt input)
  "midjourney.com", "firefly.adobe.com", "express.adobe.com",
  "ideogram.ai", "leonardo.ai", "playgroundai.com",
  "nightcafe.studio", "civitai.com", "reve.art", "seaart.ai",
  "canva.com", "freepik.com", "picsart.com",
  "krea.ai", "recraft.ai", "artbreeder.com",
  "dreamstudio.ai", "stability.ai", "pixai.art",
  "imagine.art", "clipdrop.co", "deepai.org",
  "photoroom.com", "dreamina.com",
  // AI Video generators (text prompt input)
  "runwayml.com", "pika.art", "lumalabs.ai",
  "klingai.com", "hailuoai.com", "higgsfield.ai",
  "pixverse.ai", "haiper.ai", "vidu.com",
  "wan.video", "synthesia.io", "heygen.com",
  "invideo.io", "descript.com", "pictory.ai",
  "veed.io", "capcut.com", "opus.pro",
  // AI Audio / Music
  "suno.com", "udio.com", "elevenlabs.io",
  "soundraw.io", "aiva.ai", "mureka.ai",
  // AI meeting & transcription (text input for search/notes)
  "otter.ai", "fireflies.ai", "tldv.io",
];

function isAiSite() {
  const host = location.hostname.replace(/^www\./, "");
  return AI_HOSTNAMES.some((h) => host === h || host.endsWith("." + h));
}

// --- Floating button ---

let floatingBtn = null;
let trackedEl = null;
let hideTimer = null;
let rafId = null;

const BTN_SIZE = 28;
const BTN_GAP = 6;
const PLACEMENT_KEY = "json-prompter-btn-placement";
const DOUBLE_CTRL_KEY = "json-prompter-double-ctrl";
let btnPlacement = "top-left";

chrome.storage.local.get(PLACEMENT_KEY, (result) => {
  if (result[PLACEMENT_KEY]) btnPlacement = result[PLACEMENT_KEY];
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[PLACEMENT_KEY]) {
    btnPlacement = changes[PLACEMENT_KEY].newValue;
    if (trackedEl) positionButton(trackedEl);
  }
});

function createFloatingButton() {
  const btn = document.createElement("button");
  btn.id = "__json-prompter-btn__";
  btn.title = "Open JSON Prompter  (Ctrl × 2)";
  btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 2C2.67 2 2 2.67 2 3.5v2c0 .55-.45 1-1 1H.5a.5.5 0 0 0 0 1H1c.55 0 1 .45 1 1v2c0 .83.67 1.5 1.5 1.5H4a.5.5 0 0 0 0-1h-.5A.5.5 0 0 1 3 10.5v-2C3 7.67 2.4 7.1 1.62 7 2.4 6.9 3 6.33 3 5.5v-2a.5.5 0 0 1 .5-.5H4a.5.5 0 0 0 0-1H3.5ZM11.5 2H11a.5.5 0 0 0 0 1h.5a.5.5 0 0 1 .5.5v2c0 .83.6 1.4 1.38 1.5-.78.1-1.38.67-1.38 1.5v2a.5.5 0 0 1-.5.5H11a.5.5 0 0 0 0 1h.5c.83 0 1.5-.67 1.5-1.5v-2c0-.55.45-1 1-1h.5a.5.5 0 0 0 0-1H14c-.55 0-1-.45-1-1v-2C13 2.67 12.33 2 11.5 2Z" fill="currentColor"/>
  </svg>`;

  Object.assign(btn.style, {
    position: "fixed",
    zIndex: "2147483647",
    width: BTN_SIZE + "px",
    height: BTN_SIZE + "px",
    padding: "0",
    border: "none",
    borderRadius: "7px",
    background: "rgba(30,30,40,0.82)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 6px rgba(0,0,0,0.4)",
    opacity: "0",
    transition: "opacity 0.15s ease, transform 0.15s ease, background 0.1s",
    transform: "scale(0.85)",
    pointerEvents: "none",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(99,102,241,0.92)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(30,30,40,0.82)";
  });
  btn.addEventListener("mousedown", (e) => {
    // Prevent the textarea from losing focus before we open the popup
    e.preventDefault();
  });
  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openPopup" });
  });

  document.documentElement.appendChild(btn);
  return btn;
}

function positionButton(el) {
  if (!floatingBtn || !el) return;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const S = BTN_SIZE, G = BTN_GAP;
  const cx = rect.left + rect.width / 2 - S / 2;
  const cy = rect.top + rect.height / 2 - S / 2;
  let left, top;

  switch (btnPlacement) {
    case "top-left":    left = rect.left - S - G;  top = rect.top - S - G;   break;
    case "top":         left = cx;                  top = rect.top - S - G;   break;
    case "top-right":   left = rect.right + G;      top = rect.top - S - G;   break;
    case "left":        left = rect.left - S - G;   top = cy;                 break;
    case "right":       left = rect.right + G;      top = cy;                 break;
    case "bottom-left": left = rect.left - S - G;   top = rect.bottom + G;    break;
    case "bottom":      left = cx;                  top = rect.bottom + G;    break;
    case "bottom-right":left = rect.right + G;      top = rect.bottom + G;    break;
    default:            left = rect.left - S - G;   top = rect.top - S - G;   break;
  }

  floatingBtn.style.left = left + "px";
  floatingBtn.style.top = top + "px";
}

function startTrackingLoop() {
  function loop() {
    if (trackedEl) positionButton(trackedEl);
    rafId = requestAnimationFrame(loop);
  }
  if (!rafId) rafId = requestAnimationFrame(loop);
}

function stopTrackingLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function showButton(el) {
  clearTimeout(hideTimer);
  if (!floatingBtn) floatingBtn = createFloatingButton();
  trackedEl = el;
  positionButton(el);
  floatingBtn.style.pointerEvents = "auto";
  requestAnimationFrame(() => {
    floatingBtn.style.opacity = "1";
    floatingBtn.style.transform = "scale(1)";
  });
  startTrackingLoop();
}

function hideButton(immediate = false) {
  stopTrackingLoop();
  trackedEl = null;
  if (!floatingBtn) return;
  const doHide = () => {
    if (floatingBtn) {
      floatingBtn.style.opacity = "0";
      floatingBtn.style.transform = "scale(0.85)";
      floatingBtn.style.pointerEvents = "none";
    }
  };
  if (immediate) {
    doHide();
  } else {
    // Small delay so a click on the button registers before it disappears
    hideTimer = setTimeout(doHide, 120);
  }
}

// --- Focus tracking ---

let lastFocusedInput = null;

document.addEventListener("focusin", (e) => {
  const el = e.target;
  const isEditable = el.tagName === "TEXTAREA" || el.isContentEditable ||
    (el.tagName === "INPUT" && /^(text|search|url|email|password)$/i.test(el.type || "text"));

  if (isEditable) {
    lastFocusedInput = el;
    if (isAiSite() && (el.tagName === "TEXTAREA" || el.isContentEditable)) {
      showButton(el);
    }
  }
}, true);

document.addEventListener("focusout", (e) => {
  // If focus moves to our button, don't hide (mousedown preventDefault handles this,
  // but relatedTarget check is a belt-and-suspenders guard)
  if (e.relatedTarget === floatingBtn) return;
  hideButton();
}, true);

// --- Double-Ctrl detection ---
let lastCtrlTime = 0;
document.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    const now = Date.now();
    if (now - lastCtrlTime < 300) {
      lastCtrlTime = 0;
      // Read the setting fresh each time — avoids caching/race issues
      chrome.storage.local.get(DOUBLE_CTRL_KEY, (result) => {
        if (result[DOUBLE_CTRL_KEY]) {
          chrome.runtime.sendMessage({ action: "openPopup" });
        }
      });
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
      document.execCommand("insertText", false, msg.json);
    } else {
      const el = lastFocusedInput;
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;
      el.value = el.value.slice(0, start) + msg.json + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start + msg.json.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, reason: err.message });
  }

  return true;
});
