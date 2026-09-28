// Isolated DOM emulator coverage, NOT browser E2E. Install jsdom outside the repo:
// npm install --prefix /tmp/auto9-react-dom --ignore-scripts --no-package-lock jsdom
// JSDOM_MODULE=/tmp/auto9-react-dom/node_modules/jsdom/lib/api.js node tests/browser/react-release-dom.mjs
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
const { JSDOM } = await import(process.env.JSDOM_MODULE || "jsdom");
const root = process.cwd();
const scratch = await mkdtemp(join(tmpdir(), "auto9-step375-dom-"));
const server = await createServer({ configFile: false, root, cacheDir: join(scratch, "vite"), publicDir: false,
  resolve: { alias: { "next/navigation": resolve(root, "tests/browser/react-release-navigation.jsx"), "next/link": resolve(root, "tests/browser/react-release-link.jsx") } },
  oxc: { jsx: { runtime: "automatic" } }, server: { middlewareMode: true, hmr: false },
});
let dom;
try {
  const { Fixture, hydrate } = await server.ssrLoadModule("/tests/browser/react-release-fixture.jsx");
  const html = renderToString(createElement(Fixture));
  assert(!html.includes("googletagmanager"));
  dom = new JSDOM(`<!doctype html><html><body><div id="root">${html}</div></body></html>`, { url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "history", "location", "Event", "PopStateEvent", "HTMLInputElement", "File", "FormData", "Node"]) {
    Object.defineProperty(globalThis, key, { value: key === "window" ? dom.window : dom.window[key], configurable: true });
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  window.analyticsLoads = 0;
  const append = window.Node.prototype.appendChild;
  window.Node.prototype.appendChild = function (node) {
    if (node.tagName === "SCRIPT" && node.src?.includes("googletagmanager.com")) {
      window.analyticsLoads++; node.removeAttribute("src");
      if (window.validationCase === "delayed-script") window.finishAnalyticsLoad = () => node.dispatchEvent(new Event("load"));
      else queueMicrotask(() => node.dispatchEvent(new Event("load")));
    }
    if (node.tagName === "IFRAME") {
      node.removeAttribute("src"); const result = append.call(this, node); return result;
    }
    return append.call(this, node);
  };
  window.objectUrls = { created: [], revoked: [] };
  URL.createObjectURL = () => { const url = `blob:fixture-${window.objectUrls.created.length}`; window.objectUrls.created.push(url); return url; };
  URL.revokeObjectURL = (url) => window.objectUrls.revoked.push(url);
  window.URL.createObjectURL = URL.createObjectURL; window.URL.revokeObjectURL = URL.revokeObjectURL;
  // The fixture documents the two jsdom platform shims (FileList + storage event).
  window.domEmulator = true;
  window.submissions = [];
  globalThis.fetch = window.fetch = async (url, options) => {
    assert.equal(url, "/api/special-request");
    window.submissions.push({ payload: JSON.parse(options.body.get("payload")), photos: options.body.getAll("photos").map((file) => file.name) });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  window.validationCase = process.env.DOM_CASE || "transitions";
  if (window.validationCase === "persisted-refused" || window.validationCase === "persisted-accepted") {
    localStorage.setItem("auto9_cookie_consent", window.validationCase === "persisted-refused" ? "refused" : "accepted");
    localStorage.setItem("auto9-crm-v2-theme", "light");
  }
  if (window.validationCase === "invalid-storage") {
    localStorage.setItem("auto9_cookie_consent", "invalid");
    localStorage.setItem("auto9-crm-v2-theme", "invalid");
  }
  if (window.validationCase === "denied-storage") {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("storage denied"); }, configurable: true });
  }
  await hydrate();
  const { runChecks } = await server.ssrLoadModule("/tests/browser/react-release-checks.jsx");
  await runChecks();
  const results = document.getElementById("results").textContent;
  console.log(`DOM_CASE=${window.validationCase} (jsdom; not browser E2E)\n${results}`);
  assert(results.startsWith("PASS"), results);
} finally { dom?.window.close(); await server.close(); }
