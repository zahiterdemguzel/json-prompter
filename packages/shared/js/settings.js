// Cached settings — call initSettings() before using getSetting/setSetting
const cache = {};

export async function initSettings() {
  const keys = ["theme", "prettyJson"];
  await Promise.all(keys.map(async (k) => { cache[k] = await window.api.getSetting(k); }));
}

export function getSetting(key) { return cache[key]; }

export async function setSetting(key, val) {
  cache[key] = val;
  await window.api.setSetting(key, val);
}
