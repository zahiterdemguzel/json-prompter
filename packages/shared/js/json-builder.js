import { rows } from "./state.js";

// Converts the current rows into a typed JSON object and returns it pretty-printed
export function buildJson() {
  const obj = {};
  rows.forEach((r) => {
    if (!r.key.trim()) return;
    const k = r.key.trim();
    switch (r.type) {
      case "str":  obj[k] = r.value; break;
      case "num":  obj[k] = Number(r.value) || 0; break;
      case "bool": obj[k] = r.value.toLowerCase() === "true"; break;
      case "null": obj[k] = null; break;
    }
  });
  return JSON.stringify(obj, null, 2);
}

// Updates the preview strip with a truncated version of the current JSON
export function updatePreview() {
  const json = buildJson();
  document.getElementById("preview").textContent =
    json.length > 120 ? json.slice(0, 120) + "…" : json;
}
