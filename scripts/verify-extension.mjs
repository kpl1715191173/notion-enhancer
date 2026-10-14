import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

export const root = fileURLToPath(new URL("../", import.meta.url));
export async function verifyExtension(source = path.join(root, "src")) {
  const json = async (file) => JSON.parse(await fs.readFile(path.join(source, file), "utf8")),
    manifest = await json("manifest.json"), pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const resource = async (file) => {
    const target = path.resolve(source, file.replace(/^\//, ""));
    assert.ok(target.startsWith(path.resolve(source) + path.sep), `Resource escapes extension: ${file}`);
    assert.ok((await fs.stat(target)).isFile(), `Missing extension resource: ${file}`);
  };
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, pkg.version, "Package and extension versions must match");
  await resource(manifest.background.service_worker);
  await resource(manifest.options_ui.page);
  for (const file of Object.values(manifest.icons)) await resource(file);
  for (const script of manifest.content_scripts) {
    for (const file of [...(script.js ?? []), ...(script.css ?? [])]) await resource(file);
    assert.deepEqual(script.matches, manifest.host_permissions);
  }
  assert.deepEqual(manifest.web_accessible_resources[0].matches, manifest.host_permissions);
  const registry = await json("registry.json"), ids = new Set();
  for (const folder of registry) {
    const mod = await json(`${folder}/mod.json`);
    for (const key of ["id", "name", "version", "description", "authors"]) assert.ok(mod[key], `${folder}: missing ${key}`);
    assert.ok(!ids.has(mod.id), `Duplicate mod ID: ${mod.id}`);
    ids.add(mod.id);
    for (const file of [...(mod.clientScripts ?? []), ...(mod.clientStyles ?? []), ...(mod.electronScripts ?? []).map(([, file]) => file)])
      await resource(`${folder}/${file}`);
  }
  assert.ok(ids.has("9f44bd58-8f2b-47ee-aefb-6e6906e53210"), "Mermaid must be registered");
  const bootstrap = manifest.content_scripts.find((script) => script.js.includes("extensions/mermaid-replacement/bootstrap.js"));
  assert.equal(bootstrap?.run_at, "document_start");
  await resource("extensions/mermaid-replacement/main-world.js");
  console.log(`Verified MV3 extension ${manifest.version}: ${registry.length} mods and manifest resources`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await verifyExtension(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
