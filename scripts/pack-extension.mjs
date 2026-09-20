import { execFileSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
const output = "public/lum3nd-extension.zip";
if (existsSync(output)) unlinkSync(output);
execFileSync(
  "zip",
  [
    "-j",
    output,
    "extension/manifest.json",
    "extension/popup.html",
    "extension/popup.js",
  ],
  { stdio: "inherit" },
);
