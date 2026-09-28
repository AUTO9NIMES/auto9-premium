// Local real-DOM self-test fallback for hosts where launching a subprocess browser
// is sandboxed. Navigation is mocked; Analytics and API traffic are intercepted.
import { act } from "react";
export async function runChecks() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const results = [];
  function check(condition, label) { if (!condition) throw new Error(label); results.push(label); }
  const flush = async () => { await act(async () => { await new Promise((done) => requestAnimationFrame(done)); }); };
  const click = async (label) => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === label || node.getAttribute("aria-label") === label);
    if (!button) throw new Error(`Missing button: ${label}`);
    await act(async () => button.click()); await flush();
  };
  const navigate = async (url) => { await act(async () => window.releaseGate.navigate(url)); await flush(); };
  const views = () => (window.dataLayer || []).filter((entry) => entry[0] === "event").map((entry) => entry[2].page_path);
  const detail = () => document.querySelector('[name="detail"]').value;
  async function fill(placeholder, value) {
    const input = document.querySelector(`input[placeholder="${placeholder}"]`);
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
  }
  function output() {
    const result = document.createElement("pre"); result.id = "results";
    result.textContent = `PASS ${results.length} DOM assertions\n` + results.join("\n");
    document.body.appendChild(result);
  }
  try {
    await flush();
    check(window.releaseGate.errors.length === 0, "SSR hydration has no recoverable errors");
    if (window.validationCase === "query-navigation") {
      await navigate("/?type=phares");
      check(window.analyticsLoads === 0 && views().length === 0, "Initial query navigation sends nothing before consent");
      await click("Accepter");
      check(JSON.stringify(views()) === JSON.stringify(["/?type=phares"]), "Acceptance tracks the current initial URL exactly once");
      await navigate("/?type=jantes");
      check(JSON.stringify(views()) === JSON.stringify(["/?type=phares", "/?type=jantes"]), "Query-only navigation creates its own page_view");
      await navigate("/?type=jantes"); check(views().length === 2, "Repeated identical URL is deduplicated");
      await navigate("/details?type=jantes");
      check(views()[2] === "/details?type=jantes", "Pathname-only navigation preserves query");
      await navigate("/details?type=phares&q=a%20b&tag=x&tag=y");
      await navigate("/details?type=polissage&q=%2F%26");
      check(views().length === 5 && views()[3] === "/details?type=phares&q=a%20b&tag=x&tag=y" && views()[4] === "/details?type=polissage&q=%2F%26", "Rapid committed query updates retain complete raw URL order/encoding");
      await click("Cookies"); await click("Refuser");
      check(window["ga-disable-G-CE110ZOZ4V"] === true, "Query tracking retains immediate withdrawal");
      await navigate("/details?type=jantes"); await navigate("/denied?type=phares");
      check(views().length === 5, "Path/query navigation while refused sends nothing");
      await click("Cookies"); await click("Accepter");
      check(views().length === 6 && views()[5] === "/denied?type=phares" && window.analyticsLoads === 1, "Reacceptance tracks only the latest URL without another script load");
      await navigate("/denied?type=phares"); check(views().length === 6, "Identical URL after reacceptance remains deduplicated");
      check(window.releaseGate.errors.length === 0, "Query navigation preserves hydration correctness");
      output(); return;
    }
    if (window.validationCase?.startsWith("persisted-")) {
      check(document.querySelector(".crm-v2-root").dataset.theme === "light", "Fresh hydration restores persisted light theme");
      check(document.querySelectorAll('[aria-label="Activer le thème sombre"]').length === 2, "Persisted theme labels agree");
      if (window.validationCase === "persisted-refused") check(window.analyticsLoads === 0 && !window.gtag, "Persisted refusal never loads analytics");
      else check(window.analyticsLoads === 1 && views().length === 1 && window["ga-disable-G-CE110ZOZ4V"] === false, "Persisted acceptance initializes one page view");
      await act(async () => window.releaseGate.unmount());
      check(window["ga-disable-G-CE110ZOZ4V"] === true, "Unmount disables any loaded tracker");
      output(); return;
    }
    if (window.validationCase === "denied-storage" || window.validationCase === "invalid-storage") {
      check(window.analyticsLoads === 0 && !window.gtag, "Invalid/denied storage defaults to no analytics");
      check(document.querySelector(".crm-v2-root").dataset.theme === "dark", "Invalid/denied storage defaults to dark");
      await click("Activer le thème clair");
      check(document.querySelector(".crm-v2-root").dataset.theme === "light", "Theme works even when persistence is denied");
      await click("Accepter"); check(views().length === 1, "Explicit in-memory acceptance works");
      await click("Cookies"); await click("Refuser");
      check(window["ga-disable-G-CE110ZOZ4V"] === true, "Explicit refusal disables analytics despite denied persistence");
      output(); return;
    }
    if (window.validationCase === "delayed-script") {
      await click("Accepter"); check(views().length === 0, "No page views before script readiness");
      await click("Cookies"); await click("Refuser");
      await act(async () => window.finishAnalyticsLoad());
      check(views().length === 0 && window["ga-disable-G-CE110ZOZ4V"] === true, "Late onReady after refusal cannot initialize analytics");
      output(); return;
    }
    check(window.analyticsLoads === 0 && !window.gtag, "No tracker/script before consent");
    await click("Refuser");
    check(localStorage.getItem("auto9_cookie_consent") === "refused", "Refusal persists");
    check(window.analyticsLoads === 0, "Refusal never loads analytics");
    await click("Cookies"); await click("Accepter");
    check(window.analyticsLoads === 1 && views().length === 1 && window["ga-disable-G-CE110ZOZ4V"] === false, "Acceptance loads once and records initial page once");
    check(Object.prototype.toString.call(window.dataLayer.find((entry) => entry[0] === "event")) === "[object Arguments]", "Canonical gtag Arguments protocol retained");
    await navigate("/next?x=1");
    check(views().length === 2 && views()[1] === "/next?x=1", "Navigation emits correct single page view");
    await click("Cookies"); await click("Refuser");
    check(window["ga-disable-G-CE110ZOZ4V"] === true, "Withdrawal immediately disables loaded tracker");
    await navigate("/denied"); check(views().length === 2, "No event on denied navigation");
    await click("Cookies"); await click("Accepter");
    check(views().length === 3 && views()[2] === "/denied" && window.analyticsLoads === 1 && window["ga-disable-G-CE110ZOZ4V"] === false, "Reacceptance resumes once without reloading script");
    // A separate same-origin document produces actual browser storage events.
    const peer = document.createElement("iframe"); peer.src = "/peer.html";
    const loaded = new Promise((done) => peer.onload = done); document.body.appendChild(peer); await loaded;
    await act(async () => { peer.contentWindow.localStorage.setItem("auto9_cookie_consent", "refused"); peer.contentWindow.localStorage.setItem("auto9-crm-v2-theme", "light"); await new Promise((done) => requestAnimationFrame(done)); });
    if (window.domEmulator) {
      await act(async () => window.dispatchEvent(new window.StorageEvent("storage", { key: null, storageArea: localStorage })));
    }
    await flush();
    check(window["ga-disable-G-CE110ZOZ4V"] === true, "Cross-document withdrawal disables tracker");
    check(document.querySelector(".crm-v2-root").classList.contains("crm-v2-light"), "Cross-document persisted light theme applies root class");
    await click("Activer le thème sombre");
    check(localStorage.getItem("auto9-crm-v2-theme") === "dark", "Theme toggle persists dark");
    check(document.querySelector(".crm-v2-root").dataset.theme === "dark", "Theme toggle applies root attribute");
    check(document.querySelectorAll('[aria-label="Activer le thème clair"]').length === 2, "Both theme controls stay synchronized");
    await navigate("/?type=phares");
    check(detail() === "1 optique", "Initial detail is first option");
    check(document.querySelector('button[type="submit"]').disabled, "Invalid empty form cannot submit");
    await act(async () => document.querySelector("form").requestSubmit());
    check(window.submissions.length === 0, "Forced invalid submit is rejected by handler");
    await fill("Votre nom", " Alice "); await fill("06...", "0612345678"); await fill("Ex. Audi A3", " Audi A3 ");
    await click("2 optiques"); check(detail() === "2 optiques", "Manual detail selection works");
    const upload = document.querySelector('input[type="file"]');
    const file = new File(["fixture"], "one.png", { type: "image/png" });
    if (window.domEmulator) Object.defineProperty(upload, "files", { value: [file], configurable: true });
    else { const transfer = new DataTransfer(); transfer.items.add(file); upload.files = transfer.files; }
    await act(async () => { upload.dispatchEvent(new Event("change", { bubbles: true })); });
    await click("×");
    check(window.objectUrls.revoked.length === 1, "Removing a photo revokes its URL immediately");
    if (!window.domEmulator) { const again = new DataTransfer(); again.items.add(file); upload.files = again.files; }
    await act(async () => { upload.dispatchEvent(new Event("change", { bubbles: true })); });
    await navigate("/?type=jantes"); check(detail() === "1 jante", "Service navigation resets only detail");
    await click("4 jantes"); await navigate("/?type=jantes&other=1"); check(detail() === "4 jantes", "Unrelated query change preserves manual detail");
    await navigate("/?type=phares"); check(detail() === "1 optique", "Returning service does not resurrect old choice");
    check(document.querySelector('[placeholder="Votre nom"]').value === " Alice ", "Customer fields survive service changes");
    check(document.querySelectorAll('img[src^="blob:"]').length === 1, "Photos survive service changes");
    await act(async () => document.querySelector("form").requestSubmit()); await flush();
    check(window.submissions.length === 1, "Valid form submits exactly once");
    const submitted = window.submissions[0];
    check(submitted.payload.detail === "1 optique" && submitted.payload.customerName === "Alice" && submitted.payload.type === "phares", "Submitted payload uses current detail/type and trims name");
    check(submitted.photos[0] === "one.png", "Attachment reaches unchanged multipart contract");
    check(document.querySelector('[placeholder="Votre nom"]').value === " Alice ", "Successful submit retains form data");
    await act(async () => window.releaseGate.unmount());
    check(JSON.stringify(window.objectUrls.created) === JSON.stringify(window.objectUrls.revoked), "Every object URL revoked exactly once on unmount");
    check(window.releaseGate.errors.length === 0, "Hydration remains mismatch-free");
    peer.remove();
    output();
  } catch (error) {
    const result = document.createElement("pre"); result.id = "results"; result.textContent = `FAIL after ${results.length} assertions: ${error.stack}\n` + results.join("\n"); document.body.appendChild(result);
  } finally { globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
}
