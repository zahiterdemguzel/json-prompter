#!/usr/bin/env node
// Copies the shared package into the chrome-extension directory so the
// extension can load those files (extensions can only serve files within their own root).

const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../shared");
const dest = path.resolve(__dirname, "shared");

copyDir(src, dest);
console.log("Built: shared files copied to packages/chrome-extension/shared/");

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
