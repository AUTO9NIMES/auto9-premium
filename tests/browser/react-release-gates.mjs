// Real Chromium hydration/interaction tests with local navigation/link boundaries.
// Uses the repository's React, Next Script and Vite. No real analytics/API traffic.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser/react-release-gates.mjs
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
const serveOnly = process.argv.includes("--serve");
const scratch = await mkdtemp(join(tmpdir(), "auto9-step375-browser-"));
const root = process.cwd();
const server = await createServer({
  configFile: false, root, cacheDir: join(scratch, "vite-cache"), publicDir: false,
  resolve: { alias: {
    "next/navigation": resolve(root, "tests/browser/react-release-navigation.jsx"),
    "next/link": resolve(root, "tests/browser/react-release-link.jsx"),
  } },
  oxc: { jsx: { runtime: "automatic" } },
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root, scratch] } },
});
let browser;
const results = [];
try {
  const { Fixture } = await server.ssrLoadModule("/tests/browser/react-release-fixture.jsx");
  const markup = renderToString(createElement(Fixture));
  assert(!markup.includes("googletagmanager"));
  assert(markup.includes('name="detail" value="1 optique"'));
  server.middlewares.use(async (req, res, next) => {
    if (req.url === "/peer.html") { res.setHeader("Content-Type", "text/html"); res.end("<!doctype html><html><body>Storage event peer</body></html>"); }
    else if (req.url?.startsWith("/fixture") || req.url === "/" || req.url?.startsWith("/?")) {
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline'${serveOnly ? "" : " https://www.googletagmanager.com"}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' ws:;`);
      res.end(await server.transformIndexHtml("/", `<!doctype html><html><body><div id="root">${markup}</div><script type="module">if (new URLSearchParams(location.search).has("selftest")) {
      window.analyticsLoads = 0;
      const append = Node.prototype.appendChild;
      Node.prototype.appendChild = function (node) {
        if (node.tagName === "SCRIPT" && node.src?.includes("googletagmanager.com")) {
          window.analyticsLoads++;
          node.removeAttribute("src");
          queueMicrotask(() => node.dispatchEvent(new Event("load")));
        }
        return append.call(this, node);
      };
      window.objectUrls = { created: [], revoked: [] };
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (file) => { const url = create(file); window.objectUrls.created.push(url); return url; };
      URL.revokeObjectURL = (url) => { window.objectUrls.revoked.push(url); revoke(url); };
      window.submissions = [];
      window.fetch = async (url, options) => {
        if (url !== "/api/special-request") throw Error("Non-fixture fetch forbidden");
        window.submissions.push({ payload: JSON.parse(options.body.get("payload")), photos: options.body.getAll("photos").map(f => f.name) });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };
    }
    import { hydrate } from '/tests/browser/react-release-fixture.jsx'; await hydrate(); if (new URLSearchParams(location.search).has("selftest")) { const { runChecks } = await import("/tests/browser/react-release-checks.jsx"); await runChecks(); }</script></body></html>`));
    } else next();
  });
  await server.listen();
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  if (serveOnly) {
    console.log(`FIXTURE_URL=${origin}`, true);
    await new Promise((done) => { process.once("SIGINT", done); process.once("SIGTERM", done); });
    process.exitCode = 0;
  } else {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
  async function scenario(name, run, initial = {}) {
    const context = await browser.newContext();
    const errors = []; let analyticsRequests = 0;
    const captured = [];
    await context.addInitScript((initial) => {
      for (const [key, value] of Object.entries(initial)) if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      window.objectUrls = { created: [], revoked: [] };
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (file) => { const url = create(file); window.objectUrls.created.push(url); return url; };
      URL.revokeObjectURL = (url) => { window.objectUrls.revoked.push(url); revoke(url); };
    }, initial);
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "www.googletagmanager.com") {
        analyticsRequests++;
        await route.fulfill({ contentType: "text/javascript", body: "window.fakeAnalyticsLoaded = true;" });
      } else if (url.origin === origin && url.pathname === "/api/special-request") {
        captured.push(route.request().postData());
        await route.fulfill({ contentType: "application/json", body: '{"success":true}' });
      } else if (url.origin === origin || url.protocol === "blob:") await route.continue();
      else await route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(origin);
    await page.waitForFunction(() => window.releaseGate && document.querySelector('[name="detail"]'));
    await run({ page, context, captured, analyticsRequests: () => analyticsRequests, origin });
    assert.deepEqual(await page.evaluate(() => window.releaseGate.errors), []);
    assert.deepEqual(errors, []);
    results.push({ name, passed: true }); console.log(`PASS ${name}`);
    await context.close();
  }
  await scenario("SSR hydration, initial privacy, refuse/persist/reload", async ({ page, analyticsRequests }) => {
    await page.getByRole("button", { name: "Refuser", exact: true }).click();
    assert.equal(analyticsRequests(), 0);
    assert.equal(await page.evaluate(() => window.gtag), undefined);
    assert.equal(await page.evaluate(() => localStorage.getItem("auto9_cookie_consent")), "refused");
    await page.reload(); await page.getByRole("button", { name: "Cookies", exact: true }).waitFor();
    assert.equal(analyticsRequests(), 0);
  });
  await scenario("accept, pathname navigation, revoke, navigate denied, accept again", async ({ page, analyticsRequests }) => {
    await page.getByRole("button", { name: "Accepter", exact: true }).click();
    await page.waitForFunction(() => window.dataLayer?.some((entry) => entry[0] === "event"));
    const views = () => page.evaluate(() => window.dataLayer.filter((entry) => entry[0] === "event").map((entry) => entry[2].page_path));
    assert.deepEqual(await views(), ["/"]);
    await page.evaluate(() => window.releaseGate.navigate("/next?x=1"));
    await page.waitForFunction(() => window.dataLayer.filter((entry) => entry[0] === "event").length === 2);
    assert.deepEqual(await views(), ["/", "/next?x=1"]);
    await page.getByRole("button", { name: "Cookies", exact: true }).click();
    await page.getByRole("button", { name: "Refuser", exact: true }).click();
    assert.equal(await page.evaluate(() => window["ga-disable-G-CE110ZOZ4V"]), true);
    await page.evaluate(() => window.releaseGate.navigate("/denied"));
    await page.getByRole("button", { name: "Cookies", exact: true }).click();
    assert.equal((await views()).length, 2);
    await page.getByRole("button", { name: "Accepter", exact: true }).click();
    await page.waitForFunction(() => window.dataLayer.filter((entry) => entry[0] === "event").length === 3);
    assert.deepEqual(await views(), ["/", "/next?x=1", "/denied"]);
    assert.equal(analyticsRequests(), 1);
  });
  await scenario("persisted consent and theme; cross-tab withdrawal and theme change", async ({ page, context, origin }) => {
    await page.waitForFunction(() => window.dataLayer?.some((entry) => entry[0] === "event"));
    await page.waitForFunction(() => document.querySelector(".crm-v2-root").dataset.theme === "light");
    assert.equal(await page.getByRole("button", { name: "Activer le thème sombre" }).count(), 2);
    const peer = await context.newPage(); await peer.goto(origin);
    await peer.evaluate(() => { localStorage.setItem("auto9_cookie_consent", "refused"); localStorage.setItem("auto9-crm-v2-theme", "dark"); });
    await page.waitForFunction(() => window["ga-disable-G-CE110ZOZ4V"] && document.querySelector(".crm-v2-root").dataset.theme === "dark");
    await page.getByRole("button", { name: "Activer le thème clair" }).first().click();
    assert.equal(await page.evaluate(() => localStorage.getItem("auto9-crm-v2-theme")), "light");
    await page.reload(); await page.waitForFunction(() => document.querySelector(".crm-v2-root").classList.contains("crm-v2-light"));
    assert.equal(await page.evaluate(() => window["ga-disable-G-CE110ZOZ4V"]), true);
  }, { auto9_cookie_consent: "accepted", "auto9-crm-v2-theme": "light" });
  await scenario("form detail navigation reset, retained fields/photos, submit and URL cleanup", async ({ page, captured }) => {
    await page.getByPlaceholder("Votre nom").fill(" Alice ");
    await page.getByPlaceholder("06...").fill("0612345678");
    await page.getByPlaceholder("Ex. Audi A3").fill(" Audi A3 ");
    await page.getByRole("button", { name: "2 optiques", exact: true }).click();
    assert.equal(await page.locator('[name="detail"]').inputValue(), "2 optiques");
    await page.locator('input[type="file"]').setInputFiles([{ name: "one.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMZkAAAAASUVORK5CYII=", "base64") }]);
    await page.evaluate(() => window.releaseGate.navigate("/?type=jantes"));
    await page.getByRole("button", { name: "4 jantes", exact: true }).click();
    assert.equal(await page.locator('[name="detail"]').inputValue(), "4 jantes");
    await page.evaluate(() => window.releaseGate.navigate("/?type=jantes&other=1"));
    assert.equal(await page.locator('[name="detail"]').inputValue(), "4 jantes");
    await page.evaluate(() => window.releaseGate.navigate("/?type=phares"));
    await page.getByRole("button", { name: "1 optique", exact: true }).waitFor();
    assert.equal(await page.locator('[name="detail"]').inputValue(), "1 optique");
    assert.equal(await page.getByPlaceholder("Votre nom").inputValue(), " Alice ");
    assert.equal(await page.locator('img[src^="blob:"]').count(), 1);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => document.body.textContent.includes("envoyée"));
    assert.equal(captured.length, 1); assert(captured[0].includes('"detail":"1 optique"')); assert(captured[0].includes('"customerName":"Alice"')); assert(captured[0].includes('filename="one.png"'));
    assert.equal(await page.getByPlaceholder("Votre nom").inputValue(), " Alice ");
    await page.evaluate(() => window.releaseGate.unmount());
    const urls = await page.evaluate(() => window.objectUrls);
    assert.equal(urls.created.length, 1); assert.deepEqual(urls.revoked, urls.created);
  });
  await writeFile(join(scratch, "results.json"), JSON.stringify(results, null, 2));
  console.log(`BROWSER_TESTS=${results.length} PASS; evidence=${scratch}`);
  }
} finally { await browser?.close(); await server.close(); }
