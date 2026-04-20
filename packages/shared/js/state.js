// The four value types a row can have, in cycling order
export const TYPES = ["str", "num", "bool", "null"];

// Shared mutable row state — one array used by renderer, builder, and history
export const rows = [{ key: "", value: "", type: "str" }];

const undoStack = [];
const redoStack = [];
const MAX_STACK = 100;

function deepCloneRows() {
  return rows.map((r) => ({ ...r }));
}

function restoreFrom(from, to) {
  if (!from.length) return false;
  to.push(deepCloneRows());
  const snapshot = from.pop();
  rows.length = 0;
  rows.push(...snapshot);
  return true;
}

export function pushSnapshot() {
  undoStack.push(deepCloneRows());
  if (undoStack.length > MAX_STACK) undoStack.shift();
  redoStack.length = 0;
}

export function undo() { return restoreFrom(undoStack, redoStack); }
export function redo() { return restoreFrom(redoStack, undoStack); }

export function setRows(newRows) {
  pushSnapshot();
  rows.length = 0;
  rows.push(...newRows);
}

export function resetRows() {
  rows.length = 0;
  rows.push({ key: "", value: "", type: "str" });
}
