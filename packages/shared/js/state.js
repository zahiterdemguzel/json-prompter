// The four value types a row can have, in cycling order
export const TYPES = ["str", "num", "bool", "null"];

// Shared mutable row state — one array used by renderer, builder, and history
export const rows = [{ key: "", value: "", type: "str" }];

export function setRows(newRows) {
  rows.length = 0;
  rows.push(...newRows);
}

export function resetRows() {
  rows.length = 0;
  rows.push({ key: "", value: "", type: "str" });
}
