// PLE-156 stage-④ visual-truth: Person nodes + curvilinear edges + Person modal, LIVE.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const BASE = "https://default-tau-neon.vercel.app/";
const PORT = 9223;

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

const CANVAS_DIAG = `(() => {
  const persons = [...document.querySelectorAll('.flow-node--person, [class*="flow-node--person"]')];
  const glyphs = [...document.querySelectorAll('.person-glyph')];
  const edges = [...document.querySelectorAll('.react-flow__edge')];
  const curvi = [...document.querySelectorAll('.flow-edge--curvilinear, [class*="curvilinear"]')];
  const today = document.querySelector('[class*="today"], [class*="Today"], .axis-today, .today-marker');
  const allNodes = [...document.querySelectorAll('.react-flow__node')];
  return {
    personNodesOnCanvas: persons.length,
    personGlyphs: glyphs.length,
    totalNodes: allNodes.length,
    totalEdges: edges.length,
    curvilinearEdges: curvi.length,
    todayMarkerPresent: !!today,
    sample: persons.slice(0,3).map(p => (p.getAttribute('data-id')||p.className||'').slice(0,40)),
  };
})()`;

const MODAL_DIAG = `(() => {
  const panel = document.querySelector('.detail-panel');
  const body = document.body.innerText;
  const graphic = document.querySelector('.person-graphic');
  const rows = [...document.querySelectorAll('.person-timeline__row')];
  const chips = [...document.querySelectorAll('.person-graphic__chip')];
  const curviInModal = [...document.querySelectorAll('.person-graphic path, .person-graphic [class*="curvilinear"]')];
  const amber = document.querySelector('[class*="confidence"], [class*="warning"], .detail-panel__confidence');
  return {
    panelPresent: !!panel,
    personGraphicPresent: !!graphic,
    timelineRows: rows.length,
    relationshipChips: chips.length,
    curvilinearPathsInModal: curviInModal.length,
    amberNotePresent: !!amber,
    hasUnconfirmedAmyText: /not yet confirmed|distinct from Amy|unconfirmed/i.test(body),
    title: (document.querySelector('.detail-panel__title, .detail-panel h2, .detail-panel h1')||{}).innerText || '',
    hasNaN: (body.match(/undefined NaN|Accessed undefined|NaN/g)||[]).length,
  };
})()`;

async function shoot(w, h, file, nodeId, diagExpr) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
  const url = nodeId ? `${BASE}?node=${nodeId}` : BASE;
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 4000));
  const diag = await evl(diagExpr);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(`\n=== ${file} (${w}x${h})${nodeId ? " node="+nodeId : ""} ===`);
  console.log(JSON.stringify(diag, null, 2));
  return diag;
}

const R = "docs/design/renders/";
// Canvas (person nodes + curvilinear edges + today marker)
await shoot(1440, 900, R+"ple156-live-canvas-desktop-1440.png", null, CANVAS_DIAG);
await shoot(390, 844, R+"ple156-live-canvas-mobile-390.png", null, CANVAS_DIAG);
// Person modal — Brady (rich, dated history) desktop
await shoot(1440, 900, R+"ple156-live-brady-modal-desktop-1440.png", "n-brady-deaton", MODAL_DIAG);
// Amy K. Cook — unconfirmed-identity note (desktop + mobile bottom-sheet)
await shoot(1440, 900, R+"ple156-live-amy-modal-desktop-1440.png", "n-amy-bancfirst", MODAL_DIAG);
await shoot(390, 844, R+"ple156-live-amy-modal-mobile-390.png", "n-amy-bancfirst", MODAL_DIAG);
// Christy Price — lighter entry
await shoot(1440, 900, R+"ple156-live-christy-modal-desktop-1440.png", "n-christy-price", MODAL_DIAG);

ws.close();
chrome.kill();
console.log("\nDONE");
process.exit(0);
