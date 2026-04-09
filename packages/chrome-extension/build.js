#!/usr/bin/env node
// Copies the shared package into the chrome-extension directory so the
// extension can load those files (extensions can only serve files within their own root).
// Pass --zip to also produce dist/json-prompter-extension-<version>.zip.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = path.resolve(__dirname, "../shared");
const dest = path.resolve(__dirname, "shared");

copyDir(src, dest);
console.log("Built: shared files copied to packages/chrome-extension/shared/");

if (process.argv.includes("--zip")) {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "manifest.json"), "utf8"));
  const version = manifest.version;
  const distDir = path.resolve(__dirname, "../../dist");
  const zipName = `json-prompter-extension-${version}.zip`;
  const zipPath = path.join(distDir, zipName);

  fs.mkdirSync(distDir, { recursive: true });

  // Delete existing zip if present
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  // Files/dirs to include (everything except dev-only scripts and source maps)
  const exclude = ["build.js", "generate-icons.js", "node_modules"];
  const entries = fs.readdirSync(__dirname).filter(e => !exclude.includes(e));

  // Use PowerShell Compress-Archive (Windows) or zip (Unix)
  if (process.platform === "win32") {
    const items = entries.map(e => `"${path.join(__dirname, e)}"`).join(", ");
    execSync(
      `powershell -Command "Compress-Archive -Path ${items} -DestinationPath '${zipPath}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(
      `zip -r "${zipPath}" ${entries.join(" ")} --exclude "*.DS_Store"`,
      { cwd: __dirname, stdio: "inherit" }
    );
  }

  console.log(`Packaged: dist/${zipName}`);
}

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
