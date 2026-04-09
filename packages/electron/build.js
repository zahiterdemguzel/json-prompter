#!/usr/bin/env node
// Copies the shared package into the electron directory so electron-builder
// can package it correctly (electron-builder can't bundle files outside the app root).

const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../shared");
const dest = path.resolve(__dirname, "shared");

copyDir(src, dest);
console.log("Built: shared files copied to packages/electron/shared/");

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
