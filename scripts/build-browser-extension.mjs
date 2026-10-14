import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createZip } from "./zip.mjs";
import { root, verifyExtension } from "./verify-extension.mjs";

const source = path.join(root, "src"), dist = path.join(root, "dist"),
  extension = path.join(dist, "extension");
execFileSync(process.execPath, [path.join(source, "extensions/mermaid-replacement/build.cjs")], { stdio: "inherit" });
const manifest = await verifyExtension(source);
await fs.mkdir(dist, { recursive: true });
// Only replace the generated extension directory within this repository.
if (path.dirname(extension) !== dist || path.dirname(dist) !== path.resolve(root))
  throw new Error("Unsafe build destination");
await fs.rm(extension, { recursive: true, force: true });
const sourceOnly = new Set([
  "extensions/mermaid-replacement/build.cjs", "extensions/mermaid-replacement/test.cjs",
  "extensions/mermaid-replacement/hook.js", "extensions/mermaid-replacement/vendor/dist",
  "extensions/mermaid-replacement/vendor/package.json",
]);
await fs.cp(source, extension, { recursive: true, filter: (file) =>
  !sourceOnly.has(path.relative(source, file).split(path.sep).join("/")) });
await fs.copyFile(path.join(root, "LICENSE"), path.join(extension, "LICENSE"));
await verifyExtension(extension);

const files = [];
async function collect(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const entry of entries) {
    const name = prefix + entry.name, file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file, name + "/");
    else if (entry.isFile()) files.push({ name, data: await fs.readFile(file) });
    else throw new Error(`Unsupported extension file: ${file}`);
  }
}
await collect(extension);
const archive = path.join(dist, `notion-enhancer-${manifest.version}.zip`);
await fs.writeFile(archive, createZip(files));
console.log(`Load unpacked: ${extension}\nZIP archive: ${archive}`);
