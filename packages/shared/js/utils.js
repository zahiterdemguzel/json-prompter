export function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1500);
}

export function switchToTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.querySelector(`[data-tab="${name}"]`).classList.add("active");
  document.querySelector(`[data-panel="${name}"]`).classList.add("active");
}

export function detectType(value) {
  if (value === "" || value === null || value === undefined) return "str";
  const v = value.trim();
  if (v === "") return "str";
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) return "num";
  if (/^(true|false)$/i.test(v)) return "bool";
  if (v === "null") return "null";
  return "str";
}
