import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 9225;
const chrome = spawn("/usr/bin/chromium", ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--remote-allow-origins=*", "about:blank"]);
await new Promise((r) => setTimeout(r, 1500));
async function getWs(){for(let i=0;i<20;i++){try{const t=await(await fetch(`http://127.0.0.1:${PORT}/json`)).json();const p=t.find(x=>x.type==="page");if(p?.webSocketDebuggerUrl)return p.webSocketDebuggerUrl;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error("no ws");}
const ws=new WebSocket(await getWs());await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
const evl=async expr=>{const r=await send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});if(r.result?.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails));return r.result?.result?.value;};
await send("Page.enable");await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:2,mobile:false});
await send("Page.navigate",{url:"https://default-tau-neon.vercel.app/"});
await new Promise(r=>setTimeout(r,4000));
// Zoom into a cluster of person nodes: pick a person node, scroll its center, then zoom via react-flow viewport transform.
const info = await evl(`(() => {
  const persons=[...document.querySelectorAll('.react-flow__node')].filter(n=>n.querySelector('.flow-node--person'));
  // pick a person near the middle-left cluster
  const target = persons.find(n => /n-brady-deaton/.test(n.getAttribute('data-id'))) || persons[0];
  const r = target.getBoundingClientRect();
  // zoom in using the react-flow zoom-in control a few times
  const zin = document.querySelector('.react-flow__controls-zoomin');
  return { found: persons.length, targetId: target.getAttribute('data-id'), rect:{x:r.x,y:r.y,w:r.width,h:r.height}, hasZoomCtl: !!zin };
})()`);
console.log("pre-zoom:", JSON.stringify(info));
// Zoom in by clicking control 4x then center via setCenter is internal; instead set viewport via wheel on pane.
for (let i=0;i<4;i++){
  await evl(`(() => { const b=document.querySelector('.react-flow__controls-zoomin'); if(b) b.click(); return true; })()`);
  await new Promise(r=>setTimeout(r,400));
}
await new Promise(r=>setTimeout(r,1200));
// pan so a person cluster is centred: use react-flow pane drag via transform read
const post = await evl(`(() => {
  const vp=document.querySelector('.react-flow__viewport');
  const persons=[...document.querySelectorAll('.flow-node--person')];
  const vis = persons.map(p=>{const r=p.getBoundingClientRect(); return {id:(p.closest('.react-flow__node')||{}).getAttribute?.('data-id'), x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width)};}).filter(v=>v.x>-200&&v.x<1440&&v.y>-200&&v.y<900);
  return { transform: vp?vp.style.transform:null, visiblePersons: vis.slice(0,8) };
})()`);
console.log("post-zoom:", JSON.stringify(post,null,2));
const shot = await send("Page.captureScreenshot",{format:"png"});
writeFileSync("docs/design/renders/ple156-live-canvas-zoom-desktop-1440.png", Buffer.from(shot.result.data,"base64"));
console.log("saved zoom shot");
ws.close();chrome.kill();process.exit(0);
