// PLE-149 stage-④ visual-truth: Present-mode citation links + access date, LIVE.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const URL = "https://default-tau-neon.vercel.app/?node=n-mayor-nichols";
const PORT = 9222;

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--remote-allow-origins=*", "about:blank",
]);
await new Promise((r) => setTimeout(r, 1500));

async function getWs() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("no ws");
}

const ws = new WebSocket(await getWs());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evl(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

async function shoot(w, h, file) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
  await send("Page.navigate", { url: URL });
  await new Promise((r) => setTimeout(r, 3500));
  // Click ▶ Present (selectedId already = n-mayor-nichols via deep link)
  const clicked = await evl(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Present/i.test(x.textContent||'') || /Presenter/i.test(x.getAttribute('aria-label')||''));
    if (b) { b.click(); return true; } return false;
  })()`);
  await new Promise((r) => setTimeout(r, 2500));
  // If modal not present, try opening via the focused node (press 'i')
  let diag = await evl(`(() => {
    const links = [...document.querySelectorAll('a.detail-panel__cite-link')];
    const body = document.body.innerText;
    const panel = document.querySelector('.detail-panel, .presenter-detail-scrim');
    return {
      clickedPresent: ${clicked},
      presenterActive: !!document.querySelector('.presenter, [class*=presenter]'),
      panelPresent: !!panel,
      citeLinkCount: links.length,
      citeHrefs: links.slice(0,6).map(a => ({ text:(a.textContent||'').trim().slice(0,60), href:a.href, target:a.target, rel:a.rel })),
      accessedUndefined: (body.match(/Accessed undefined|undefined NaN|NaN/g)||[]).length,
      accessedSnippet: (body.match(/Accessed[^.\\n]{0,30}/g)||[]).slice(0,4),
    };
  })()`);
  if (!diag.panelPresent || diag.citeLinkCount === 0) {
    await evl(`(() => {
      const ev = new KeyboardEvent('keydown', {key:'i', code:'KeyI', keyCode:73, bubbles:true});
      document.dispatchEvent(ev); document.body.dispatchEvent(ev);
      const node = document.querySelector('[data-id="n-mayor-nichols"], .react-flow__node');
      if (node) node.dispatchEvent(new MouseEvent('click', {bubbles:true}));
      return true;
    })()`);
    await new Promise((r) => setTimeout(r, 1500));
    diag = await evl(`(() => {
      const links = [...document.querySelectorAll('a.detail-panel__cite-link')];
      const body = document.body.innerText;
      return {
        panelPresent: !!document.querySelector('.detail-panel'),
        citeLinkCount: links.length,
        citeHrefs: links.slice(0,6).map(a => ({ text:(a.textContent||'').trim().slice(0,60), href:a.href, target:a.target, rel:a.rel })),
        accessedUndefined: (body.match(/Accessed undefined|undefined NaN|NaN/g)||[]).length,
        accessedSnippet: (body.match(/Accessed[^.\\n]{0,30}/g)||[]).slice(0,4),
      };
    })()`);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(`\n=== ${file} (${w}x${h}) ===`);
  console.log(JSON.stringify(diag, null, 2));
  return diag;
}

const d1 = await shoot(1440, 900, "docs/design/renders/ple149-present-cite-desktop-1440.png");
const d2 = await shoot(390, 844, "docs/design/renders/ple149-present-cite-mobile-390.png");

ws.close();
chrome.kill();
console.log("\nDONE");
process.exit(0);
