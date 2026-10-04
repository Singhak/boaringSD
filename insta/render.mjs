// Usage: node insta/render.mjs insta/posts/001-why-redis-is-fast
// Reads content.json in the post folder, writes slides/01.png ... (1080x1350)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const dir = path.resolve(process.argv[2] ?? "");
const content = JSON.parse(fs.readFileSync(path.join(dir, "content.json"), "utf8"));
const outDir = path.join(dir, "slides");
const htmlDir = path.join(dir, ".html");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(htmlDir, { recursive: true });

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge not found");

// Accent palettes. A slide picks one with "theme"; default cycles so the carousel feels lively.
const THEMES = {
  red: ["#ff5a4d", "#ff9a5a", "#3a1210"],
  blue: ["#4da3ff", "#7ee0ff", "#0f2340"],
  green: ["#3ddc97", "#b6f26b", "#0f2f24"],
  purple: ["#a971ff", "#ff7ad9", "#27133f"],
  amber: ["#ffc233", "#ff8a3d", "#3a2a0c"],
};
const CYCLE = ["red", "blue", "green", "purple", "amber"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, '<b class="hl">$1</b>');

const css = `
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;color:#f2f5fa;font-family:"Segoe UI","Segoe UI Emoji",Arial,sans-serif;position:relative;overflow:hidden;
  background:radial-gradient(900px 700px at 100% 0%,var(--bg) 0%,transparent 70%),radial-gradient(800px 600px at 0% 100%,var(--bg) 0%,transparent 70%),#0a0d14}
.dots{position:absolute;inset:0;background-image:radial-gradient(#ffffff14 2px,transparent 2px);background-size:44px 44px}
.ghost{position:absolute;right:30px;top:20px;font-size:420px;font-weight:900;line-height:1;color:transparent;-webkit-text-stroke:3px var(--a);opacity:.16}
.wrap{position:absolute;inset:110px 76px 150px 76px;display:flex;flex-direction:column;justify-content:center;gap:38px}
.pill{align-self:flex-start;font-size:28px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#0a0d14;background:linear-gradient(90deg,var(--a),var(--b));padding:12px 28px;border-radius:999px}
h1{font-size:104px;line-height:1.05;font-weight:900;letter-spacing:-2px}
h2{font-size:72px;line-height:1.1;font-weight:900;letter-spacing:-1px}
.hl{background:linear-gradient(90deg,var(--a),var(--b));-webkit-background-clip:text;background-clip:text;color:transparent}
p{font-size:42px;line-height:1.4;color:#c4cbd8}
code{font-family:Consolas,monospace;background:#ffffff18;color:var(--b);padding:2px 12px;border-radius:10px;font-size:.9em}
.cards{display:flex;flex-direction:column;gap:22px}
.card{display:flex;align-items:center;gap:28px;background:linear-gradient(135deg,#ffffff12,#ffffff06);border:2px solid #ffffff1c;border-left:8px solid var(--a);border-radius:26px;padding:26px 30px}
.card .ic{font-size:62px;line-height:1;flex:none;width:80px;text-align:center}
.card .tx{font-size:38px;line-height:1.3;color:#e3e8f2}
.bars{display:flex;flex-direction:column;gap:30px}
.bar-row .lab{display:flex;justify-content:space-between;font-size:36px;font-weight:700;margin-bottom:10px}
.bar-row .lab span:last-child{color:var(--b)}
.track{height:46px;border-radius:999px;background:#ffffff14;overflow:hidden}
.fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--a),var(--b))}
.note{font-size:28px;color:#8c95a6;text-align:right}
.flow{display:flex;flex-direction:column;align-items:center}
.box{width:100%;text-align:center;font-size:38px;font-weight:800;padding:26px;border-radius:24px;background:#ffffff0d;border:2px solid #ffffff22}
.box.hi{background:linear-gradient(90deg,var(--a),var(--b));color:#0a0d14;border:none;box-shadow:0 12px 40px -10px var(--a)}
.arrow{font-size:40px;color:var(--a);line-height:1.1;margin:4px 0}
.cols{display:flex;gap:26px}
.col{flex:1;background:linear-gradient(160deg,#ffffff14,#ffffff05);border:2px solid #ffffff1c;border-top:8px solid var(--a);border-radius:26px;padding:34px}
.col h3{font-size:44px;margin-bottom:14px}
.col p{font-size:36px}
.term{background:#05070b;border:2px solid #ffffff1c;border-radius:24px;overflow:hidden}
.term .top{display:flex;gap:12px;padding:20px 24px;background:#ffffff0d}
.term .top i{width:20px;height:20px;border-radius:50%;background:#ff5f56}
.term .top i:nth-child(2){background:#ffbd2e}.term .top i:nth-child(3){background:#27c93f}
pre{font-family:Consolas,monospace;font-size:36px;line-height:1.55;padding:30px 34px;color:#a5d6ff;white-space:pre-wrap}
.call{border-radius:30px;padding:44px;background:linear-gradient(135deg,var(--a),var(--b));color:#0a0d14}
.call p{color:#0a0d14;font-size:46px;font-weight:700;line-height:1.35}
.call .hl{background:none;color:#0a0d14;-webkit-text-fill-color:#0a0d14;font-weight:900;text-decoration:underline;text-decoration-thickness:6px;text-decoration-color:#fff}
.big{font-size:170px;line-height:1}
.foot{position:absolute;left:76px;right:76px;bottom:52px;display:flex;justify-content:space-between;align-items:center;font-size:28px;color:#8c95a6}
.handle{display:flex;align-items:center;gap:12px;color:#dfe5f0;font-weight:700}
.ig{width:40px;height:40px;color:var(--a)}
.prog{display:flex;gap:10px}
.prog i{width:14px;height:14px;border-radius:50%;background:#ffffff26}
.prog i.on{background:var(--a);width:40px;border-radius:8px}
.swipe{color:var(--a);font-weight:800;font-size:30px;letter-spacing:2px}
`;

function body(s) {
  const out = [];
  if (s.kicker) out.push(`<div class="pill">${md(s.kicker)}</div>`);
  if (s.big) out.push(`<div class="big">${s.big}</div>`);
  if (s.title) out.push(s.type === "hook" ? `<h1>${md(s.title)}</h1>` : `<h2>${md(s.title)}</h2>`);
  if (s.text && !s.callout) out.push(`<p>${md(s.text)}</p>`);
  if (s.bars)
    out.push(
      `<div class="bars">${s.bars
        .map((b) => `<div class="bar-row"><div class="lab"><span>${md(b.label)}</span><span>${md(b.value)}</span></div><div class="track"><div class="fill" style="width:${b.w}%"></div></div></div>`)
        .join("")}${s.barsNote ? `<div class="note">${esc(s.barsNote)}</div>` : ""}</div>`,
    );
  if (s.bullets?.length)
    out.push(
      `<div class="cards">${s.bullets
        .map((b) => {
          const [ic, tx] = b.includes("|") ? b.split("|") : ["▸", b];
          return `<div class="card"><div class="ic">${ic}</div><div class="tx">${md(tx)}</div></div>`;
        })
        .join("")}</div>`,
    );
  if (s.flow)
    out.push(
      `<div class="flow">${s.flow
        .map((f, i) => `${i ? '<div class="arrow">▼</div>' : ""}<div class="box ${f.startsWith("*") ? "hi" : ""}">${md(f.replace(/^\*/, ""))}</div>`)
        .join("")}</div>`,
    );
  if (s.cols)
    out.push(`<div class="cols">${s.cols.map((c) => `<div class="col"><h3>${md(c.title)}</h3><p>${md(c.text)}</p></div>`).join("")}</div>`);
  if (s.code) out.push(`<div class="term"><div class="top"><i></i><i></i><i></i></div><pre>${esc(s.code)}</pre></div>`);
  if (s.callout) out.push(`<div class="call"><p>${md(s.text)}</p></div>`);
  return out.join("");
}

// Instagram glyph (rounded square, lens, dot) drawn with the slide accent colour
const IG = `<svg class="ig" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>`;

const n = content.slides.length;
content.slides.forEach((s, i) => {
  const num = String(i + 1).padStart(2, "0");
  const [a, b, bg] = THEMES[s.theme ?? CYCLE[i % CYCLE.length]];
  const ghost = /^Reason/.test(s.kicker ?? "") ? `<div class="ghost">${s.kicker.replace(/\D/g, "")}</div>` : "";
  const dots = Array.from({ length: n }, (_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><style>${css}</style>
<body style="--a:${a};--b:${b};--bg:${bg}">
<div class="dots"></div>${ghost}<div class="wrap">${body(s)}</div>
<div class="foot"><span class="handle">${IG}${esc(content.handle ?? "")}</span><div class="prog">${dots}</div><span class="swipe">${i < n - 1 ? "SWIPE ➜" : "SAVE 🔖"}</span></div>
</body>`;
  const f = path.join(htmlDir, `${num}.html`);
  fs.writeFileSync(f, html);
  execFileSync(
    CHROME,
    [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--window-size=1080,1350", `--screenshot=${path.join(outDir, `${num}.png`)}`, pathToFileURL(f).href,
    ],
    { stdio: "ignore" },
  );
  console.log("rendered", num);
});
