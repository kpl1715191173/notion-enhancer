import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { inflateRawSync } from "node:zlib";
import { root, verifyExtension } from "./verify-extension.mjs";
import { createZip } from "./zip.mjs";

await verifyExtension();
const source = path.join(root, "src"), context = vm.createContext({ URL });
vm.runInContext(await fs.readFile(path.join(source, "api/notion-hosts.js"), "utf8"), context);
const { isNotionUrl } = context.__enhancerNotionHosts;
for (const host of ["notion.so", "www.notion.so", "notion.site", "public.notion.site", "app.notion.com", "foo.app.notion.com"])
  assert.equal(isNotionUrl(`https://${host}/workspace`), true);
for (const url of ["https://notion.so.evil.test/", "https://evilnotion.so/", "https://notion.com/", "http://app.notion.com/", undefined])
  assert.equal(isNotionUrl(url), false);

let onConnect, onClick;
const values = {}, events = [], tabs = [{ id: 2, index: 1, url: "https://public.notion.site/page" }];
context.console = console;
context.importScripts = () => {};
context.chrome = {
  windows: { WINDOW_ID_CURRENT: -2 },
  storage: { local: {
    get: async (keys) => keys ? Object.fromEntries(keys.map((key) => [key, values[key]])) : values,
    set: async (entries) => Object.assign(values, entries),
  } },
  tabs: {
    query: async () => tabs, highlight: async () => {}, create: async () => { throw Error("Existing Notion tab should be reused"); },
    sendMessage: (...args) => events.push(args), reload: (id) => events.push(["reload", id]),
  },
  action: { onClicked: { addListener: (listener) => { onClick = listener; } } },
  runtime: { onConnect: { addListener: (listener) => { onConnect = listener; } } },
};
vm.runInContext(await fs.readFile(path.join(source, "worker.js"), "utf8"), context);
const port = (sender) => {
  let listener;
  onConnect({ sender, onMessage: { addListener: (callback) => { listener = callback; } },
    onDisconnect: { addListener() {} }, postMessage: (message) => events.push(message) });
  return listener;
};
const menuMessage = port({}); // Standalone extension options pages have no tab.
await menuMessage({ channel: "notion-enhancer", invocation: "db-test", message: {
  action: "query-database", data: { namespace: ["default"], query: "set", args: { key: "test", value: 42 } },
} });
assert.equal(values.default__test, 42);
const tabMessage = port({ tab: tabs[0] });
await onClick({ url: "https://example.test/" });
assert.equal(events.at(-1)[0], 2);
await tabMessage({ channel: "notion-enhancer", message: "reload-app" });
assert.deepEqual(events.at(-1), ["reload", 2]);

// Decode local ZIP entries independently of the writer; compare exact bytes,
// including UTF-8 paths and the archive's root-level manifest.
const files = [{ name: "manifest.json", data: Buffer.from('{"manifest_version":3}') },
  { name: "assets/中文.txt", data: Buffer.from("浏览器扩展") }], zip = createZip(files);
let offset = 0;
for (const file of files) {
  assert.equal(zip.readUInt32LE(offset), 0x04034b50);
  const length = zip.readUInt32LE(offset + 18), nameLength = zip.readUInt16LE(offset + 26),
    start = offset + 30 + nameLength;
  assert.equal(zip.subarray(offset + 30, start).toString(), file.name);
  assert.deepEqual(inflateRawSync(zip.subarray(start, start + length)), file.data);
  offset = start + length;
}
assert.equal(zip.readUInt32LE(offset), 0x02014b50);
assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
console.log("Passed: Notion domains, MV3 worker, standalone menu database, tab navigation and ZIP decoding");
