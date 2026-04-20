// Key autocomplete — shows suggestions from history keys below key input fields.

let cachedKeys = null;

async function loadKeySuggestions() {
  if (cachedKeys) return cachedKeys;
  try {
    const history = await window.api.getHistory();
    const keySet = new Set();
    for (const entry of history) {
      try {
        const obj = JSON.parse(entry.json);
        for (const k of Object.keys(obj)) keySet.add(k);
      } catch {}
    }
    cachedKeys = [...keySet];
  } catch {
    cachedKeys = [];
  }
  return cachedKeys;
}

// Call after a paste/save so suggestions reflect the latest history.
export function invalidateKeyCache() {
  cachedKeys = null;
}

export function attachAutocomplete(inputEl) {
  let menu = null;
  let selectedIdx = -1;
  let isOpen = false;

  function createMenu() {
    menu = document.createElement("ul");
    menu.className = "autocomplete-menu";
    menu.setAttribute("role", "listbox");
    document.body.appendChild(menu);
  }

  function destroyMenu() {
    if (menu) { menu.remove(); menu = null; }
    isOpen = false;
    selectedIdx = -1;
  }

  function setSelected(idx) {
    if (!menu) return;
    menu.querySelectorAll(".autocomplete-item")
      .forEach((el, i) => el.classList.toggle("selected", i === idx));
    selectedIdx = idx;
  }

  function selectValue(value) {
    inputEl.value = value;
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    destroyMenu();
    inputEl.focus();
  }

  async function showSuggestions(prefix) {
    const all = await loadKeySuggestions();
    const lp = prefix.toLowerCase();
    const matches = all.filter(k => k.toLowerCase().startsWith(lp) && k !== prefix);
    if (!matches.length) { destroyMenu(); return; }

    if (!menu) createMenu();
    isOpen = true;
    selectedIdx = -1;
    menu.innerHTML = "";

    const rect = inputEl.getBoundingClientRect();
    menu.style.left = rect.left + "px";
    menu.style.top = (rect.bottom + 2) + "px";
    menu.style.width = rect.width + "px";

    matches.slice(0, 8).forEach((key, idx) => {
      const li = document.createElement("li");
      li.className = "autocomplete-item";
      li.setAttribute("role", "option");
      li.textContent = key;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault(); // keep focus on input
        selectValue(key);
      });
      li.addEventListener("mouseover", () => setSelected(idx));
      menu.appendChild(li);
    });
  }

  // Exposed so renderer.js can check before doing row arrow-key navigation.
  inputEl._autocompleteOpen = () => isOpen;

  inputEl.addEventListener("input", (e) => {
    const val = e.target.value;
    if (val.trim()) showSuggestions(val);
    else destroyMenu();
  });

  inputEl.addEventListener("focus", (e) => {
    if (e.target.value.trim()) showSuggestions(e.target.value);
  });

  inputEl.addEventListener("blur", () => {
    // Delay so a mousedown on a menu item fires before the menu is removed.
    setTimeout(destroyMenu, 150);
  });

  // Capture phase so this runs before the bubble-phase handleKeyNav listener.
  inputEl.addEventListener("keydown", (e) => {
    if (!isOpen || !menu) return;
    const items = menu.querySelectorAll(".autocomplete-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(Math.min(selectedIdx + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(Math.max(selectedIdx - 1, 0));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      const text = items[selectedIdx]?.textContent;
      if (text) selectValue(text);
    } else if (e.key === "Escape") {
      destroyMenu();
    } else if (e.key === "Tab" && selectedIdx < 0 && items.length > 0) {
      // Accept top suggestion; let Tab bubble to handleKeyNav for row navigation.
      selectValue(items[0].textContent);
    }
  }, true);
}
