const PLACEMENT_KEY = "json-prompter-btn-placement";
const DOUBLE_CTRL_KEY = "json-prompter-double-ctrl";

const PLACEMENTS = {
  "0,0": { id: "top-left",     label: "Top-left corner" },
  "0,1": { id: "top",          label: "Top center" },
  "0,2": { id: "top-right",    label: "Top-right corner" },
  "1,0": { id: "left",         label: "Left center" },
  "1,1": null,
  "1,2": { id: "right",        label: "Right center" },
  "2,0": { id: "bottom-left",  label: "Bottom-left corner" },
  "2,1": { id: "bottom",       label: "Bottom center" },
  "2,2": { id: "bottom-right", label: "Bottom-right corner" },
};

const grid = document.getElementById("grid");
const selText = document.getElementById("sel-text");
const cellEls = {};

for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const p = PLACEMENTS[`${row},${col}`];
    const cell = document.createElement("div");

    if (!p) {
      cell.className = "cell center";
      cell.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.5" y="2.5" width="13" height="13" rx="2" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
      </svg>`;
    } else {
      cell.className = "cell";
      cell.innerHTML = `<div class="dot"></div>`;
      cell.addEventListener("click", () => select(p.id));
      cellEls[p.id] = cell;
    }

    grid.appendChild(cell);
  }
}

function select(id) {
  Object.values(cellEls).forEach(c => c.classList.remove("active"));
  if (cellEls[id]) cellEls[id].classList.add("active");
  const p = Object.values(PLACEMENTS).find(p => p && p.id === id);
  selText.textContent = p ? p.label : id;
  chrome.storage.local.set({ [PLACEMENT_KEY]: id });
}

const doubleCtrlToggle = document.getElementById("doubleCtrlToggle");
doubleCtrlToggle.addEventListener("change", () => {
  chrome.storage.local.set({ [DOUBLE_CTRL_KEY]: doubleCtrlToggle.checked });
});

chrome.storage.local.get([PLACEMENT_KEY, DOUBLE_CTRL_KEY], (result) => {
  select(result[PLACEMENT_KEY] || "top-left");
  doubleCtrlToggle.checked = result[DOUBLE_CTRL_KEY] === true;
});
