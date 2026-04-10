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

// No-op — preview strip has been removed
export function updatePreview() {}
