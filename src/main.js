import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";

(async () => {
'use strict';
// ================= PRELOAD: everything loads behind a veil, then the room fades in =================
const SFX_FILES = { step_wood: ["footstep_wood_000", "footstep_wood_001", "footstep_wood_002", "footstep_wood_003", "footstep_wood_004"], step_concrete: ["footstep_concrete_000", "footstep_concrete_001", "footstep_concrete_002", "footstep_concrete_003", "footstep_concrete_004"], squish: ["impactSoft_medium_000", "impactSoft_medium_001", "impactSoft_medium_002"], glass: ["impactGlass_light_000", "impactGlass_light_001", "impactGlass_light_002"], clunk: ["impactMetal_heavy_000"], door: ["impactPlank_medium_000", "impactWood_heavy_000"], tick: ["impactWood_light_000", "impactWood_light_001", "impactWood_light_002"], bell: ["impactBell_heavy_000"] };
const TEX_FILES = ["floor_diff", "floor_nor_gl", "floor_rough", "velvet_diff", "velvet_nor_gl", "velvet_rough", "metal_diff", "metal_nor_gl", "metal_rough", "floor_ao"];
const ASSETS = { glb: null, sfx: {}, tex: {}, env: null };
const veilBar = document.getElementById("veil-bar");
async function preload() {
  const jobs = []; let done = 0; const tick = () => { done++; if (veilBar) veilBar.style.transform = `scaleX(${done / jobs.length})`; };
  const add = p => { jobs.push(p.catch(() => null).finally(tick)); };
  add(fetch("models/rex.json").then(r => r.ok ? r.json() : null).then(j => { if (!j) return; const b = atob(j.glb); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); ASSETS.glb = u.buffer; }));
  Object.entries(SFX_FILES).forEach(([k, list]) => list.forEach(f => add(fetch(`sfx/${f}.mp3`).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) (ASSETS.sfx[k] = ASSETS.sfx[k] || []).push(b); }))));
  const TL = new THREE.TextureLoader();
  TEX_FILES.forEach(n => add(TL.loadAsync(`tex/${n}.jpg`).then(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (n.endsWith("diff")) t.colorSpace = THREE.SRGBColorSpace; ASSETS.tex[n] = t; })));
  // studio HDR, stored as RGBE in a PNG (mantissas on top, exponent below) because the host only serves web image types
  add(new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = "env/studio-rgbe.png"; }).then(im => {
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const w = im.width, h = im.height / 2; const px = g.getImageData(0, 0, w, h * 2).data; const out = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, j = ((y + h) * w + x) * 4, o = ((h - 1 - y) * w + x) * 4; const e = px[j]; const s = e ? Math.pow(2, e - 136) : 0; out[o] = px[i] * s; out[o + 1] = px[i + 1] * s; out[o + 2] = px[i + 2] * s; out[o + 3] = 1; }
    const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.FloatType); t.mapping = THREE.EquirectangularReflectionMapping; t.flipY = false; t.needsUpdate = true; ASSETS.env = t;
  }));
  if (document.fonts && document.fonts.load) ["800 40px 'Bricolage Grotesque'", "700 20px 'Bricolage Grotesque'", "400 20px Lexend", "500 20px Lexend", "700 20px Lexend", "600 20px Caveat"].forEach(f => add(document.fonts.load(f)));
  await Promise.all(jobs);
}
await preload();
const DBG = []; const dbg = m => { DBG.push(String(m)); if (location.hash === '#debug') { let d = document.getElementById('dbg'); if (!d) { d = document.createElement('pre'); d.id = 'dbg'; d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:60vw;white-space:pre-wrap;background:#000c;color:#0f0;font:11px monospace;padding:6px;pointer-events:none'; document.body.appendChild(d); } d.textContent = DBG.join('\n'); } };
addEventListener('error', e => dbg('ERR ' + e.message));
// ================= CONTENT =================
const SRC_Q = { label: "10-Q, fiscal Q2 2027", url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm" };
const SRC_K = { label: "10-K, fiscal 2026", url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm" };
const GLOSSARY = {
  "revenue": "All the money customers paid the company for its products before any costs are subtracted. Also called sales.",
  "data center": "Buildings full of computers that run websites, cloud services and AI. NVIDIA sells the chips and systems inside them.",
  "hyperscalers": "The very largest cloud computing companies, which build huge data centers and rent computing power to others.",
  "fiscal year": "The 12-month period a company uses for its accounts. NVIDIA's ends in late January, so fiscal 2026 ended January 25, 2026.",
  "gross margin": "The share of revenue left after paying the direct cost of making the products. 75% means 75 cents of each sales dollar remain.",
  "operating income": "Profit from the core business after paying for products, research, salaries and other running costs, before interest and taxes.",
  "net income": "The bottom-line profit after every cost, interest and tax has been paid.",
  "long-term debt": "Money the company has borrowed that is not due within the next year, usually through bonds called senior notes.",
  "research and development": "Spending on inventing and designing new products, often shortened to R&D.",
  "buyback": "When a company uses its cash to buy its own shares from the market, leaving fewer shares in circulation.",
  "accounts receivable": "Money customers owe the company for products already delivered but not yet paid for.",
  "operating cash flow": "The actual cash the business brought in from its normal operations, as opposed to profit on paper.",
  "inventory": "Products and materials the company has made or bought but not yet sold.",
  "tariff": "A tax charged on goods when they are imported into a country."
};
const PITCH = {
  company: "NVIDIA", ticker: "NVDA", pitcher: "Rex Voltaire",
  hook: { id: "hook", q: "The opening pitch",
    text: "Good evening, shark. I'm Rex Voltaire, and tonight I'm pitching NVIDIA. We design the chips that train and run artificial intelligence, and the world's biggest tech companies buy them by the warehouse. Last quarter we brought in $96.2 billion in [[revenue]], more than double a year ago, and kept about 62 cents of every dollar as profit. The catch? Five customers account for about 70% of the money owed to us. If they slow down, so could we.",
    simple: "I'm Rex, pitching NVIDIA. They make the chips that power AI. Sales more than doubled in a year, to about $96 billion in three months, and they keep most of it as profit. But a handful of giant customers make up a lot of the business, which is risky.",
    card: ["$96.2B", "revenue, one quarter"],
    visual: { type: "bars", title: "Quarterly revenue, $ billions", unit: "B", items: [["Apr–Jul 2025", 46.743], ["Apr–Jul 2026", 96.221, true]] }, src: [SRC_Q] },
  questions: [
    { id: "sell", q: "What does NVIDIA sell?", s: "What it sells", card: ["93%", "of sales from data centers"],
      a: "Chips and complete computer systems for artificial intelligence. Last quarter our [[data center]] business brought in $89.0 billion of our $96.2 billion in [[revenue]], about 93% of everything. More than half of that came from [[hyperscalers]], the giant cloud companies. A smaller category, edge computing, added $7.2 billion.",
      simple: "NVIDIA makes the super-powerful chips that AI runs on. About 93 cents of every dollar it earns comes from selling them to companies that build AI data centers.",
      visual: { type: "bars", title: "Revenue by market, Apr–Jul 2026, $B", unit: "B", items: [["Hyperscale", 48.710, true], ["AI clouds, industrial, enterprise", 40.313], ["Edge computing", 7.198]] }, src: [SRC_Q] },
    { id: "growth", q: "How fast is NVIDIA growing?", s: "Growth", card: ["+106%", "revenue vs a year ago"],
      a: "Fast. Revenue for the quarter ended July 26, 2026 was $96.2 billion, up 106% from $46.7 billion a year earlier. For the full [[fiscal year]] that ended January 25, 2026, revenue was $215.9 billion, up 65% from $130.5 billion. Two years before that, it was $60.9 billion.",
      simple: "Sales more than doubled in one year. Three years ago NVIDIA sold about $61 billion worth of products in a year. Last year it sold about $216 billion.",
      visual: { type: "bars", title: "Full-year revenue, $ billions", unit: "B", items: [["Fiscal 2024", 60.922], ["Fiscal 2025", 130.497], ["Fiscal 2026", 215.938, true]] }, src: [SRC_Q, SRC_K] },
    { id: "profit", q: "Is NVIDIA profitable?", s: "Profit", card: ["62¢", "profit per $1 of sales"],
      a: "Very. On $96.2 billion of revenue last quarter, our [[gross margin]] was 75%, [[operating income]] was $63.7 billion and [[net income]] was $59.7 billion. That's about 62 cents of profit on every dollar of sales. Diluted earnings per share were $2.46, up from $1.08 a year ago.",
      simple: "After paying for everything, including making the chips, salaries and taxes, NVIDIA kept about 62 cents of every dollar customers paid.",
      visual: { type: "bars", title: "From sales to profit, Apr–Jul 2026, $B", unit: "B", items: [["Revenue", 96.221], ["Gross profit", 72.142], ["Operating income", 63.734], ["Net income", 59.688, true]] }, src: [SRC_Q] },
    { id: "debt", q: "How much debt does NVIDIA carry?", s: "Debt", card: ["$33.4B", "long-term debt"],
      a: "More than we used to. Our [[long-term debt]] was $33.4 billion on July 26, 2026, up from $8.5 billion six months earlier, roughly four times as much. We held $22.4 billion in cash and cash equivalents, not counting marketable securities, which are reported separately. Shareholders' equity was $229.0 billion. We also have a $25 billion commercial paper program with nothing borrowed under it.",
      simple: "NVIDIA borrowed a lot more this year. Long-term debt went from about $8.5 billion to about $33.4 billion in six months. That's a fast jump, even though the company is much bigger than its debt.",
      visual: { type: "bars", title: "Long-term debt, $ billions", unit: "B", items: [["Jan 25, 2026", 8.468], ["Jul 26, 2026", 33.366, true]] }, src: [SRC_Q, SRC_K] },
    { id: "spend", q: "Where does NVIDIA's money go?", s: "Spending", card: ["$7.1B", "R&D, one quarter"],
      a: "Into inventing the next chip, and into our own stock. We spent $7.1 billion on [[research and development]] last quarter, up 64% from a year ago, and total operating expenses rose 55%. In the first half of this fiscal year we also spent $39.0 billion on share repurchases, a [[buyback]].",
      simple: "NVIDIA spends billions every quarter designing new chips. It's also using a lot of cash to buy back its own shares.",
      visual: { type: "bars", title: "R&D spending per quarter, $ billions", unit: "B", items: [["Apr–Jul 2025", 4.291], ["Apr–Jul 2026", 7.054, true]] }, src: [SRC_Q] },
    { id: "customers", q: "Who are NVIDIA's customers?", s: "Customers", card: ["70%", "owed by 5 customers"],
      a: "Mostly large companies building AI data centers, and a few of them are very large. As of July 26, 2026, five direct customers each accounted for between 10% and 22% of our [[accounts receivable]], about 70% combined. Customers based outside the United States made up 38% of revenue last quarter, and China, including Hong Kong, contributed $7.9 billion.",
      simple: "A handful of huge buyers make up much of the business. Five customers owe NVIDIA about 70% of the money it's waiting to collect.",
      visual: { type: "bars", title: "Share of money owed to NVIDIA, Jul 26, 2026", unit: "%", items: [["Customer A", 22, true], ["Customer B", 14], ["Customer C", 13], ["Customer D", 11], ["Customer E", 10]] }, src: [SRC_Q] },
    { id: "cash", q: "Does NVIDIA make real cash?", s: "Cash flow", card: ["$74.4B", "cash from operations, 6 months"],
      a: "Real cash. In the first half of this fiscal year, our [[operating cash flow]] was $74.4 billion, up from $42.8 billion in the same six months a year earlier. For all of fiscal 2026 it was $102.7 billion.",
      simple: "The business brings in real money, about $74 billion in six months, not just profits on paper.",
      visual: { type: "bars", title: "Operating cash flow, Feb–Jul, $ billions", unit: "B", items: [["2025", 42.779], ["2026", 74.421, true]] }, src: [SRC_Q, SRC_K] },
    { id: "risk", q: "What could go wrong?", s: "What could go wrong", risk: true, card: ["4", "risks on the table"], note: "4 risks",
      a: "Plenty, and I'll show you every card. One: five customers make up about 70% of what we're owed, so a pullback by a few buyers would hit hard. Two: our filing says licensed H200 chips shipped to China face a 25% U.S. [[tariff]] that we haven't been able to pass on. Three: our [[long-term debt]] roughly quadrupled to $33.4 billion in six months, and we'll have to repay or refinance it. Four: [[inventory]] grew to $31.6 billion from $21.4 billion in January. If demand cools, that's a lot of product on the shelf.",
      simple: "If a few big customers stop buying, sales could drop fast. Selling to China is getting harder and more expensive. NVIDIA has taken on more debt. And it's holding a big pile of chips it still needs to sell.",
      visual: { type: "list", title: "Risks from NVIDIA's own filings", items: ["Five customers ≈ 70% of receivables", "25% tariff on licensed China H200s, not passed on", "Long-term debt $8.5B → $33.4B in six months", "Inventory $21.4B → $31.6B since January"] }, src: [SRC_Q] }
  ]
};
// Rex's pre-written reactions (said before an answer; never facts)
const REACT = {
  challenge: ["Fair hit.", "Tough one. I respect that.", "I was hoping you'd push on that."],
  positive: ["Glad you noticed.", "Now you're seeing the trick."],
  neutral: ["Watch closely.", "Let me show you.", "Ah. Good card to pull."]
};
const CHALLENGE = /(too much|a lot of|worr|concern|really\?|seriously|risky|scary|expensive|overvalued|bubble|why should|prove|doubt|skeptic|dangerous|yikes|sketchy|suspicious|not sure)/i;
const POSITIVE = /(impressive|wow|nice|amazing|love|cool|great|incredible|awesome)/i;

// ================= FREE-TEXT MATCHING (prepared answers only) =================
const KEYWORDS = {
  sell: [["what do you sell", 4], ["what does nvidia do", 4], ["what do you do", 4], ["you do", 3], ["you guys do", 4], ["does the company do", 4], ["what do you make", 4], ["business", 2], ["product", 2], ["sell", 2], ["make", 1], ["chip", 2], ["gpu", 2], ["data center", 2], ["datacenter", 2], ["hyperscal", 2], ["segment", 2], ["market", 1], ["gaming", 2], ["what is nvidia", 4], ["who are you", 2], ["ai", 1]],
  growth: [["grow", 3], ["growth", 3], ["fast", 2], ["trend", 2], ["increase", 2], ["last year", 2], ["history", 2], ["sales", 1], ["revenue", 1], ["bigger", 2], ["double", 2], ["year over year", 3]],
  profit: [["profit", 3], ["profitable", 4], ["margin", 3], ["earn", 2], ["earnings", 3], ["eps", 3], ["net income", 4], ["make money", 3], ["making money", 3], ["money", 1], ["bottom line", 3], ["income", 2]],
  debt: [["debt", 4], ["borrow", 3], ["loan", 3], ["owe", 2], ["liabilit", 3], ["balance sheet", 3], ["bond", 3], ["leverage", 3], ["cash on hand", 3], ["cash in the bank", 3], ["equity", 2], ["notes", 1]],
  spend: [["spend", 3], ["spending", 3], ["r&d", 4], ["r and d", 4], ["research", 3], ["buyback", 4], ["buy back", 4], ["repurchas", 4], ["expense", 3], ["cost", 2], ["where does your money go", 4], ["invest in", 2]],
  customers: [["customer", 4], ["who buys", 4], ["buyer", 3], ["client", 3], ["china", 3], ["concentrat", 3], ["depend", 2], ["international", 2], ["overseas", 2], ["who pays", 3], ["receivable", 3]],
  cash: [["cash flow", 5], ["cashflow", 5], ["real cash", 4], ["real money", 3], ["paper", 2], ["operating cash", 5], ["generate", 2], ["cash", 1]],
  risk: [["risk", 4], ["wrong", 4], ["downside", 4], ["worry", 3], ["concern", 3], ["problem", 3], ["danger", 3], ["bear case", 4], ["catch", 2], ["weakness", 3], ["tariff", 3], ["inventory", 3], ["competition", 2], ["compet", 2], ["threat", 3], ["bad", 2], ["fail", 2], ["scared", 2]]
};
const SIMPLER = /(simpl|don'?t (get|understand)|confus|eli5|plain english|in english|dumb it down|easier|what does that mean|lost me|explain (that|it|again)|i'?m (new|a beginner))/i;
const ADVICE = /(should i (buy|invest|sell|get)|is (it|this|nvidia|nvda) a (good|bad) (buy|investment|stock)|worth (buying|investing)|will (it|the stock|nvda|nvidia|the price) (go|rise|fall|drop)|price target|buy or sell|good investment|how much should i|recommend)/i;
const DEFINE = /(what(?:'s| is| are| does)|define|meaning of|explain)\s+(?:a |an |the )?([a-z&\- ]{2,40}?)(?:\s+mean)?\??$/i;
function matchQuestion(text) {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9&\s']/g, " ").replace(/\s+/g, " ") + " ";
  let best = null, bestScore = 0;
  for (const [id, list] of Object.entries(KEYWORDS)) { let s = 0; for (const [k, w] of list) if (t.includes(k.length <= 3 ? " " + k + " " : k)) s += w; if (s > bestScore) { bestScore = s; best = id; } }
  return bestScore >= 2 ? PITCH.questions.find(q => q.id === best) : null;
}
function glossaryHit(text) {
  const m = text.trim().match(DEFINE); const cand = m ? m[2].toLowerCase().trim() : text.toLowerCase(); const keys = Object.keys(GLOSSARY);
  return keys.find(k => cand === k || cand === k + "s" || cand.replace(/s$/, "") === k) || (m ? keys.find(k => cand.includes(k)) : null) || null;
}

// ================= STATE =================
const KEY = "thepit.proto.v4", START = 1000000;
const blank = () => ({ desk: ["water", "notepad"], captions: false, gate: false, studio: "classic", voice: true, sfx: true, voiceURI: "", asked: [], notes: [], offers: [], skipped: false, decided: null, started: false });
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const $ = id => document.getElementById(id);
const fmtB = v => "$" + v.toFixed(1) + "B";
const fmtUSD = v => "$" + Math.round(v).toLocaleString("en-US");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const committed = () => S.offers.reduce((t, o) => t + o.amount, 0);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pick = a => a[Math.floor(Math.random() * a.length)];
let busy = false;

// ================= AUDIO (synthesised, with room reverb) =================
let AC = null, noiseBuf = null, bus = null, amb = null;
function audio() {
  if (!S.sfx) return null;
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const ir = AC.createBuffer(2, AC.sampleRate * 1.4, AC.sampleRate); for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3); }
      const verb = AC.createConvolver(); verb.buffer = ir; const send = AC.createGain(); send.gain.value = .28;
      bus = AC.createGain(); bus.connect(AC.destination); bus.connect(send).connect(verb).connect(AC.destination);
      loadSamples();
    }
    if (AC.state === "suspended") AC.resume(); return AC;
  } catch (e) { return null; }
}
// recorded sounds: Kenney "Impact Sounds" (CC0, kenney.nl), fetched during preload
const SAMPLES = {};
function loadSamples() {
  if (!AC) return;
  Object.entries(ASSETS.sfx).forEach(([k, list]) => { SAMPLES[k] = []; list.forEach(buf => { try { AC.decodeAudioData(buf.slice(0), b => SAMPLES[k].push(b), () => {}); } catch (e) {} }); });
}
function playS(k, gain = 1, rate = 1, delay = 0) {
  const a = audio(); const list = SAMPLES[k]; if (!a || !list || !list.length) return false;
  const s = a.createBufferSource(); s.buffer = list[Math.floor(Math.random() * list.length)]; s.playbackRate.value = rate * (.95 + Math.random() * .1);
  const g = a.createGain(); g.gain.value = gain; s.connect(g).connect(bus); s.start(a.currentTime + delay); return true;
}
function ambience(on) {
  if (!on) { if (amb) { try { amb.g.gain.setTargetAtTime(0, AC.currentTime, .3); const a = amb; setTimeout(() => { try { a.src.stop(); a.o.stop(); } catch (e) {} }, 1200); } catch (e) {} amb = null; } return; }
  const a = audio(); if (!a || amb) return;
  const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 180;
  const o = a.createOscillator(); o.frequency.value = 60; const og = a.createGain(); og.gain.value = .006;
  const g = a.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(.05, a.currentTime, 1.5);
  src.connect(f).connect(g); o.connect(og).connect(g); g.connect(a.destination); src.start(); o.start(); amb = { src, o, g };
}
function noiseHit(t, { freq = 1800, q = .8, type = "bandpass", gain = .3, decay = .06 } = {}) {
  const a = AC, src = a.createBufferSource(); src.buffer = noiseBuf; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + decay);
  src.connect(f).connect(g).connect(bus); src.start(t, Math.random()); src.stop(t + decay + .05);
}
function tone(t, { f0 = 80, f1 = 40, gain = .5, decay = .25, type = "sine" } = {}) {
  const a = AC, o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + decay);
  const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + decay);
  o.connect(g).connect(bus); o.start(t); o.stop(t + decay + .05);
}
const SFX = {
  drumroll(dur) { const a = audio(); if (!a) return; const t0 = a.currentTime + .05; let t = t0; while (t < t0 + dur) { const p = (t - t0) / dur; noiseHit(t, { freq: 2200, q: .9, gain: .04 + .22 * p * p, decay: .05 }); t += .042 + .006 * Math.random(); } },
  crash() { const a = audio(); if (!a) return; const t = a.currentTime + .01; noiseHit(t, { freq: 6000, type: "highpass", q: .5, gain: .35, decay: 1.6 }); tone(t, { f0: 70, f1: 38, gain: .7, decay: .6 }); },
  clunk() { playS("clunk", .8, .8); const a = audio(); if (!a) return; const t = a.currentTime + .01; tone(t, { f0: 120, f1: 45, gain: .6, decay: .18, type: "triangle" }); noiseHit(t, { freq: 900, gain: .25, decay: .08 }); },
  whoosh() { const a = audio(); if (!a) return; const t = a.currentTime + .01; const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1600, t + .9); const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1); src.connect(f).connect(g).connect(bus); src.start(t); src.stop(t + 1.2); },
  flick() { const a = audio(); if (!a) return; const t = a.currentTime + .01; noiseHit(t, { freq: 4200, q: 2, gain: .18, decay: .05 }); noiseHit(t + .07, { freq: 3600, q: 2, gain: .12, decay: .05 }); },
  step(w = 1) { if (playS(S.studio === "classic" ? "step_wood" : "step_concrete", .55 * w + .1)) return; const a = audio(); if (!a) return; const t = a.currentTime + .005; tone(t, { f0: 110, f1: 60, gain: .3 * w, decay: .08 }); noiseHit(t, { freq: 700, type: "lowpass", gain: .16 * w, decay: .04 }); noiseHit(t + .07, { freq: 2600, q: 1.5, gain: .07 * w, decay: .03 }); tone(t, { f0: 180, f1: 170, gain: .05 * w, decay: .12, type: "triangle" }); },
  chord(t, freqs, dur, gain, bright) { const a = AC; freqs.forEach(f => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(bright, t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, bright * .35), t + dur); const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(fl).connect(g).connect(bus); o.start(t); o.stop(t + dur + .05); }); },
  stinger(kind) { const a = audio(); if (!a) return; const t = a.currentTime + .02;
    if (kind === "act2") this.chord(t, [130.8, 261.6, 329.6, 392], 1.4, .05, 2400);
    else if (kind === "deal") { this.bell(); [261.6, 329.6, 392, 523.3].forEach((f, i) => this.chord(t + i * .09, [f, f * 2], .9, .045, 3000)); this.chord(t + .4, [130.8, 261.6, 329.6, 392, 523.3], 1.8, .05, 2800); }
    else if (kind === "verdict") this.chord(t, [110, 116.5, 164.8], 2.2, .045, 900);
    else if (kind === "nodeal") { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 1.1); const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(300, t + 1.1); const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2); o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + 1.25); } },
  applause(dur = 2.6) { const a = audio(); if (!a) return; const t0 = a.currentTime + .05; for (let i = 0; i < dur * 90; i++) { const tt = t0 + Math.random() * dur; const env = Math.min(1, (tt - t0) / .4) * Math.min(1, (t0 + dur - tt) / .8); noiseHit(tt, { freq: 1200 + Math.random() * 2200, q: 1.2, gain: .05 * env + .005, decay: .03 + Math.random() * .03 }); } },
  _hb: null,
  tension(on) { if (!on) { clearInterval(this._hb); this._hb = null; return; } if (this._hb) return; const beat = () => { const a = audio(); if (!a) return; const t = a.currentTime + .01; tone(t, { f0: 62, f1: 45, gain: .32, decay: .12 }); tone(t + .22, { f0: 58, f1: 42, gain: .22, decay: .12 }); }; beat(); this._hb = setInterval(beat, 950); },
  squish() { if (playS("squish", .9)) return; const a = audio(); if (!a) return; const t = a.currentTime + .005; noiseHit(t, { freq: 350, type: "lowpass", gain: .35, decay: .14 }); tone(t, { f0: 160, f1: 90, gain: .2, decay: .12 }); },
  squeak() { const a = audio(); if (!a) return; const t = a.currentTime + .005; const o = a.createOscillator(); o.type = "square"; o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(1700, t + .08); o.frequency.exponentialRampToValueAtTime(1250, t + .18); const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 3; const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .22); o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + .25); },
  door() { playS("door", .7, .9); },
  glass() { playS("glass", .6); },
  bell() { playS("bell", .5); },
  gulp() { const a = audio(); if (!a) return; const t = a.currentTime + .3; [0, .35].forEach(d => tone(t + d, { f0: 180, f1: 90, gain: .25, decay: .12 })); },
  tick() { if (playS("tick", .7, 1.3)) return; const a = audio(); if (!a) return; const t = a.currentTime + .005; noiseHit(t, { freq: 3000, q: 3, gain: .06, decay: .02 }); }
};

// ================= VOICE: best free voice, locked; whole answer queued (no gaps) =================
const Voice = {
  list: [], chosen: null, talking: false, token: 0, safety: null, fake: null,
  score(v) {
    const n = v.name; let s = 0;
    if (/natural/i.test(n)) s += 60; if (/premium|enhanced/i.test(n)) s += 45; if (/neural/i.test(n)) s += 40; if (/siri/i.test(n)) s += 35; if (/online/i.test(n)) s += 20;
    if (/google uk english male|google us english/i.test(n)) s += 25;
    if (/guy|christopher|eric|andrew|brian|davis|roger|steffan|ryan|thomas|daniel|arthur|oliver|aaron|evan|tom|alex/i.test(n)) s += 12;
    if (/en[-_]US/i.test(v.lang)) s += 8; else if (/en[-_]GB/i.test(v.lang)) s += 6;
    if (/compact|novelty|whisper|bad news|bells|bubbles|cellos|jester|organ|trinoids|zarvox|superstar|wobble|boing/i.test(n)) s -= 80;
    return s;
  },
  async init() {
    const synth = window.speechSynthesis; if (!synth) { this.ui(); return; }
    const get = () => synth.getVoices().filter(v => /^en/i.test(v.lang));
    if (!get().length) await new Promise(r => { let d = false; const fin = () => { if (!d) { d = true; r(); } }; synth.onvoiceschanged = fin; setTimeout(fin, 2000); });
    this.list = get().sort((a, b) => this.score(b) - this.score(a)).slice(0, 8);
    this.chosen = this.list.find(v => v.voiceURI === S.voiceURI) || this.list[0] || null;
    if (this.chosen && !S.voiceURI) { S.voiceURI = this.chosen.voiceURI; save(); }
    this.ui();
  },
  ui() {
    const sel = $("voice-pick");
    if (!this.list.length) { sel.innerHTML = "<option>No voices on this device</option>"; sel.disabled = true; $("voice-test").disabled = true; $("voice-note").textContent = "This browser has no speech voices. Turn captions on to read Rex."; return; }
    sel.innerHTML = this.list.map(v => `<option value="${esc(v.voiceURI)}">${esc(v.name)}${/natural|premium|enhanced|neural|siri/i.test(v.name) ? " ★" : ""}</option>`).join("");
    sel.value = this.chosen.voiceURI;
  },
  pick(uri) { this.chosen = this.list.find(v => v.voiceURI === uri) || this.chosen; S.voiceURI = this.chosen ? this.chosen.voiceURI : ""; save(); },
  forSpeech(t) { return t.replace(/\$([\d.]+) billion/g, "$1 billion dollars").replace(/\$([\d.]+)B\b/g, "$1 billion dollars").replace(/≈/g, "about"); },
  stop() { this.token++; clearTimeout(this.safety); clearTimeout(this.fake); try { speechSynthesis.cancel(); } catch (e) {} this.talking = false; },
  // cb: { onSentence(i), onWord(i,len), onDone() }
  say(sentences, cb = {}) {
    this.stop(); const tok = this.token; const synth = window.speechSynthesis;
    const finish = () => { if (tok !== this.token) return; clearTimeout(this.safety); this.talking = false; cb.onDone && cb.onDone(); };
    if (!(S.voice && synth && this.chosen)) {
      let i = 0; const next = () => { if (tok !== this.token) return; if (i >= sentences.length) { finish(); return; } const idx = i++; this.talking = true; cb.onSentence && cb.onSentence(idx); this.fake = setTimeout(next, Math.max(1500, sentences[idx].split(/\s+/).length * 340)); };
      next(); return;
    }
    let total = 0;
    // Chrome can drop an utterance queued right after cancel(); give it a beat first
    this.fake = setTimeout(() => { if (tok !== this.token) return; sentences.forEach((text, idx) => {
      const u = new SpeechSynthesisUtterance(this.forSpeech(text)); u.voice = this.chosen; u.lang = this.chosen.lang; u.rate = .98; u.pitch = .92;
      u.onstart = () => { if (tok !== this.token) return; this.talking = true; cb.onSentence && cb.onSentence(idx); };
      u.onboundary = e => { if (tok !== this.token) return; if (!e.name || e.name === "word") cb.onWord && cb.onWord(idx, e.charLength || 4); };
      if (idx === sentences.length - 1) { u.onend = finish; u.onerror = finish; }
      (this._keep = this._keep || []).push(u); synth.speak(u);
    }); this._keep = this._keep.slice(-20); }, 70);
    sentences.forEach(text => { total += text.split(/\s+/).length; });
    this.safety = setTimeout(finish, total * 600 + 6000);
  }
};

// ================= CAPTIONS: word by word, only when switched on =================
const tokenize = raw => raw.match(/\[\[[^\]]+\]\]|\S+/g) || [];
const renderTok = tk => tk.startsWith("[[") ? `<button class="term" type="button" data-term="${esc(tk.slice(2, -2))}">${esc(tk.slice(2, -2))}</button>` : esc(tk);
const Captions = {
  toks: [], shown: 0, words: 0, t0: 0, iv: null,
  on() { return S.captions || !S.voice || !Voice.chosen; },
  start(raw) {
    this.toks = tokenize(raw); this.shown = 0; this.words = 0; this.t0 = performance.now(); clearInterval(this.iv);
    $("speech-sr").textContent = raw.replace(/\[\[([^\]]+)\]\]/g, "$1");
    $("subs").hidden = !this.on(); if (!this.on()) return;
    this.render(); this.iv = setInterval(() => this.tick(), 60);
  },
  word() { this.words++; },
  tick() { const est = Math.floor((performance.now() - this.t0) / 330) + 1; const n = Math.min(this.toks.length, Math.max(this.words + 1, est)); if (n !== this.shown) { this.shown = n; this.render(); } if (n >= this.toks.length) clearInterval(this.iv); },
  all() { clearInterval(this.iv); this.shown = this.toks.length; this.render(); },
  render() { $("sub-line").innerHTML = this.toks.slice(0, this.shown).map(renderTok).join(" "); },
  clear() { clearInterval(this.iv); $("sub-line").innerHTML = ""; $("subs").hidden = true; }
};

// ================= TEXT HELPERS =================
const splitSentences = t => t.split(/(?<=[^A-Z][.!?])\s+(?=[A-Z0-9“"$\[])/);
const plain = t => t.replace(/\[\[([^\]]+)\]\]/g, "$1");
const UNEASY = /(catch|risk|hit hard|tariff|haven't|refinance|pile|cools|slow down|wrong|worry|harder|more debt|borrowed|concentrat|quadrupled|on the shelf|fair hit|tough one)/i;

// ================= 3D STUDIO =================
const stage = $("stage");
let R = null;
const now = () => performance.now();
const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const smoother = p => p * p * p * (p * (p * 6 - 15) + 10);
const backOut = p => { const c = 1.4; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const tweens = [];
function tween(obj, key, to, dur, delay = 0, fn = ease) { tweens.push({ obj, key, to, dur: Math.max(1, dur), start: now() + delay, from: null, fn }); }
let timers = [];
const later = (ms, f) => { const id = setTimeout(f, ms); timers.push(id); return id; };
const clearLater = () => { timers.forEach(clearTimeout); timers = []; };
// critically-damped-ish spring with slight overshoot: reads as muscle, not machinery
class Spring { constructor(x = 0, k = 60, z = .72) { this.x = x; this.v = 0; this.t = x; this.k = k; this.z = z; } step(dt) { const a = this.k * (this.t - this.x) - 2 * this.z * Math.sqrt(this.k) * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; } }
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.gen = true; return t; }
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c.join(",")})`; }
function woodTex(base, dark, seed) {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = rnd(seed); const pw = 128;
    for (let x = 0; x < w; x += pw) for (let y = -Math.floor(r() * 400); y < h; y += 420 + Math.floor(r() * 300)) {
      g.fillStyle = shade(base, .85 + r() * .3); g.fillRect(x, y, pw, 700); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.strokeRect(x + 1, y, pw - 2, 700);
      for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(${dark},${.06 + r() * .12})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const gx = x + r() * pw; g.moveTo(gx, y); g.bezierCurveTo(gx + r() * 20 - 10, y + 200, gx + r() * 20 - 10, y + 450, gx + r() * 10 - 5, y + 700); g.stroke(); }
    }
  });
}
function noiseTex(base, amt, seed, w = 512) { return canvasTex(w, w, g => { g.fillStyle = base; g.fillRect(0, 0, w, w); const r = rnd(seed); for (let i = 0; i < w * 40; i++) { g.fillStyle = `rgba(${r() < .5 ? "0,0,0" : "255,255,255"},${r() * amt})`; g.fillRect(r() * w, r() * w, 2, 2); } }); }
function std(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .6, metalness: 0 }, o)); }
const setLin = (c, hex) => c.setHex(hex);
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent && parent.add(m); return m; }
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent && parent.add(m); return m; }
function sph(r, mat, x = 0, y = 0, z = 0, parent, seg = 24) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * .75)), mat); m.position.set(x, y, z); m.castShadow = true; parent && parent.add(m); return m; }
const lerp = (a, b, k) => a + (b - a) * k;
const angDiff = (a, b) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; return d < -Math.PI ? d + Math.PI * 2 : d; };

const DOOR_X = .6, DOOR_Z = -9.0, MARK = { x: .9, z: -3.0 }, SCREEN_SPOT = { x: -.55, z: -3.75 };
const SCREEN_POS = new THREE.Vector3(-2.55, 1.95, -5.1);
const THEMES = {
  classic: { accent: 0xe7b24c, wall: "#3a1626", wallRough: .95, floor: () => woodTex("#7a4a2a", "40,20,8", 7), floorRough: .38, ambient: 0xffe2c4, ground: 0x2a1408, key: 0xffd9a8, strip: 0xffb35c, backlight: 0xfff1d8, jacket: 0x3a2260 },
  boardroom: { accent: 0x7cc6ea, wall: "#2a3540", wallRough: .5, floor: () => noiseTex("#5b6168", .08, 11, 512), floorRough: .22, ambient: 0xcfe6ff, ground: 0x1a222b, key: 0xeaf4ff, strip: 0x9fdcff, backlight: 0xe8f6ff, jacket: 0x1c2c45 },
  arena: { accent: 0xff5fa8, wall: "#1a0b28", wallRough: .8, floor: () => noiseTex("#0c0710", .05, 5, 512), floorRough: .12, ambient: 0xd9b8ff, ground: 0x12051e, key: 0xffe6f4, strip: 0xff5fa8, backlight: 0xd2fff9, jacket: 0x281247 }
};

function initGL(hooks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  Object.values(ASSETS.tex).forEach(t => { t.anisotropy = maxAniso; });
  let dpr = Math.min(1.75, devicePixelRatio || 1); renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.prepend(renderer.domElement); renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050406); scene.fog = new THREE.Fog(0x050406, 14, 30);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, .05, 60);
  const camBase = new THREE.Vector3(0, 1.3, 3.3); camera.position.copy(camBase);
  const WIDE_LOOK = new THREE.Vector3(.1, 1.2, -4);

  // ----- room -----
  const room = new THREE.Group(); scene.add(room);
  const floorMat = std(0xffffff, { roughness: .38 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -3); floor.receiveShadow = true; room.add(floor);
  const wallMat = std(0xffffff, { roughness: .95 });
  const W = 16, H = 5.2, doorW = 1.7, doorH = 2.75;
  const leftW = (DOOR_X - doorW / 2) + W / 2, rightW = W / 2 - (DOOR_X + doorW / 2);
  box(leftW, H, .3, wallMat, -W / 2 + leftW / 2, H / 2, DOOR_Z - .15, room); box(rightW, H, .3, wallMat, W / 2 - rightW / 2, H / 2, DOOR_Z - .15, room);
  box(doorW, H - doorH, .3, wallMat, DOOR_X, doorH + (H - doorH) / 2, DOOR_Z - .15, room);
  box(.3, H, 14, wallMat, -W / 2, H / 2, -2, room); box(.3, H, 14, wallMat, W / 2, H / 2, -2, room);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), std(0x0b0a0c, { roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -3); room.add(ceil);
  const frameMat = std(0x1c1a1e, { roughness: .4, metalness: .6 });
  box(.12, doorH + .12, .4, frameMat, DOOR_X - doorW / 2 - .06, doorH / 2, DOOR_Z, room); box(.12, doorH + .12, .4, frameMat, DOOR_X + doorW / 2 + .06, doorH / 2, DOOR_Z, room); box(doorW + .36, .14, .4, frameMat, DOOR_X, doorH + .07, DOOR_Z, room);
  const panelMat = std(0x141216, { roughness: .35, metalness: .4 });
  const doorL = box(doorW / 2, doorH, .08, panelMat, DOOR_X - doorW / 4, doorH / 2, DOOR_Z + .12, room);
  const doorR = box(doorW / 2, doorH, .08, panelMat, DOOR_X + doorW / 4, doorH / 2, DOOR_Z + .12, room);
  const seam = box(.012, doorH, .01, new THREE.MeshBasicMaterial({ color: 0x8a7a60 }), DOOR_X, doorH / 2, DOOR_Z + .17, room); seam.castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(doorW + .4, doorH + .4), glowMat); glow.position.set(DOOR_X, doorH / 2, DOOR_Z - 3); room.add(glow);
  box(.1, doorH + .4, 3, std(0x111111), DOOR_X - doorW / 2 - .2, doorH / 2, DOOR_Z - 1.5, room); box(.1, doorH + .4, 3, std(0x111111), DOOR_X + doorW / 2 + .2, doorH / 2, DOOR_Z - 1.5, room);
  const backLight = new THREE.PointLight(0xfff1d8, 0, 16, 2); backLight.position.set(DOOR_X, 1.6, DOOR_Z - 1.2); scene.add(backLight);
  const doorSpill = new THREE.SpotLight(0xfff1d8, 0, 18, .7, .6, 2); doorSpill.position.set(DOOR_X, 2.2, DOOR_Z - 1); doorSpill.target.position.set(DOOR_X, 0, -2); scene.add(doorSpill, doorSpill.target);
  const discMat = std(0x2a2a30, { roughness: .35, metalness: .85 });
  if (ASSETS.tex.metal_diff) { const rp = t => { const c = t.clone(); c.repeat.set(2, 2); c.needsUpdate = true; return c; }; discMat.map = rp(ASSETS.tex.metal_diff); discMat.normalMap = rp(ASSETS.tex.metal_nor_gl); discMat.roughnessMap = rp(ASSETS.tex.metal_rough); discMat.color.setHex(0x55555c); discMat.roughness = 1; }
  cyl(1.15, 1.2, .09, discMat, MARK.x, .045, MARK.z, room, 64);
  const ringMat = std(0xe7b24c, { roughness: .3, metalness: .9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.13, .025, 12, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(MARK.x, .095, MARK.z); room.add(ring);

  // ----- LED screen -----
  const scW = 3.4, scH = 1.95;
  const SCR_K = 1.6; const screenCanvas = document.createElement("canvas"); screenCanvas.width = Math.round(1280 * SCR_K); screenCanvas.height = Math.round(734 * SCR_K);
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = maxAniso; screenTex.generateMipmaps = true; screenTex.minFilter = THREE.LinearMipmapLinearFilter;
  const screenGroup = new THREE.Group(); screenGroup.position.copy(SCREEN_POS); screenGroup.rotation.y = .36; room.add(screenGroup);
  box(scW + .16, scH + .16, .12, std(0x0d0d10, { roughness: .4, metalness: .5 }), 0, 0, -.07, screenGroup);
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screenGroup.add(screenMesh);
  cyl(.04, .04, .9, std(0x1a1a1d, { metalness: .7, roughness: .3 }), 0, -scH / 2 - .45, -.1, screenGroup);
  const screenGlow = new THREE.PointLight(0x6fa8ff, 2.2, 7, 2); screenGlow.position.set(-2.2, 1.9, -4.4); scene.add(screenGlow);

  // ----- desk + chair -----
  const deskMat = std(0xffffff, { roughness: .32 }); deskMat.map = woodTex("#5a3520", "30,12,4", 3);
  box(4.6, .07, 1.0, deskMat, 0, .78, 1.95, scene); box(4.6, .55, .05, deskMat, 0, .5, 1.47, scene);
  const brass = std(0xe7b24c, { roughness: .25, metalness: 1 }); box(4.6, .02, .03, brass, 0, .815, 1.46, scene);
  const leather = std(0x1a1416, { roughness: .55 });
  [-1, 1].forEach(s => { box(.16, .1, .9, leather, s * 1.0, .66, 2.95, scene).rotation.z = s * .04; cyl(.05, .05, .9, leather, s * 1.0, .66, 2.95, scene).rotation.x = Math.PI / 2; });

  // desk items: each is a group; clickable meshes point at their group
  const _bx = new THREE.Box3(); const TOP = .815; const deskItems = new THREE.Group(); scene.add(deskItems); const clickables = [];
  const glassMat = () => new THREE.MeshStandardMaterial({ color: 0xdff0ff, transparent: true, opacity: .25, roughness: .05, side: THREE.DoubleSide });
  const notesCanvas = document.createElement("canvas"); notesCanvas.width = 512; notesCanvas.height = 680;
  const notesTex = new THREE.CanvasTexture(notesCanvas); notesTex.colorSpace = THREE.SRGBColorSpace; notesTex.anisotropy = 8;
  function drawNotes() {
    const g = notesCanvas.getContext("2d"); g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, 512, 680);
    g.strokeStyle = "#a9bfe0"; g.lineWidth = 2; for (let y = 110; y < 680; y += 52) { g.beginPath(); g.moveTo(24, y); g.lineTo(488, y); g.stroke(); }
    g.strokeStyle = "#e39a9a"; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, 680); g.stroke();
    g.fillStyle = "#1f2b4a"; g.font = "600 48px Caveat, cursive"; g.fillText("NVDA", 84, 84);
    S.notes.slice(-10).forEach((n, i) => { g.font = "600 36px Caveat, cursive"; g.fillText(`${n.s}: ${n.big}`, 84, 150 + i * 52); });
    notesTex.needsUpdate = true;
  }
  const DESK = {
    water(g) { const it = new THREE.Group(); it.position.set(.78, TOP, 1.72); g.add(it); const gl = new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .14, 24, 1, true), glassMat()); gl.position.y = .07; it.add(gl); const w = cyl(.04, .035, .08, new THREE.MeshStandardMaterial({ color: 0x9ecbff, transparent: true, opacity: .35, roughness: .1 }), 0, .04, 0, it); w.castShadow = false; tag(it, "sip"); },
    notepad(g) { const it = new THREE.Group(); it.position.set(-.45, TOP, 1.86); it.rotation.y = .12; g.add(it); box(.3, .012, .4, std(0xf3efe6, { roughness: .9 }), 0, .006, 0, it); const page = new THREE.Mesh(new THREE.PlaneGeometry(.28, .37), new THREE.MeshStandardMaterial({ map: notesTex, roughness: .9 })); page.rotation.x = -Math.PI / 2; page.position.y = .0125; it.add(page); const p = cyl(.008, .008, .26, std(0x111111, { metalness: .6, roughness: .3 }), .17, .016, -.02, it, 12); p.rotation.z = Math.PI / 2; p.rotation.y = .4; tag(it, "notes"); drawNotes(); },
    coffee(g) { const it = new THREE.Group(); it.position.set(.52, TOP, 1.78); g.add(it); const mug = std(0xf2ede4, { roughness: .4 }); cyl(.042, .04, .1, mug, 0, .05, 0, it, 24); const h = new THREE.Mesh(new THREE.TorusGeometry(.028, .008, 8, 16), mug); h.position.set(.045, .05, 0); it.add(h); cyl(.038, .038, .004, std(0x3b2314, { roughness: .2 }), 0, .092, 0, it, 24).castShadow = false; tag(it, "sip"); },
    whiskey(g) { const it = new THREE.Group(); it.position.set(-.82, TOP, 1.72); g.add(it); const tb = new THREE.Mesh(new THREE.CylinderGeometry(.045, .042, .085, 8, 1, true), glassMat()); tb.position.y = .043; it.add(tb); cyl(.04, .038, .04, new THREE.MeshStandardMaterial({ color: 0xc8771c, transparent: true, opacity: .75, roughness: .1 }), 0, .022, 0, it, 16).castShadow = false; box(.03, .03, .03, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .45, roughness: .05 }), .01, .045, 0, it).rotation.set(.4, .5, .2); tag(it, "whiskey");
      const bt = new THREE.Group(); bt.position.set(-.98, TOP, 1.86); g.add(bt); const bm = new THREE.MeshStandardMaterial({ color: 0x7a3e10, transparent: true, opacity: .85, roughness: .1 }); cyl(.05, .05, .2, bm, 0, .1, 0, bt, 20); cyl(.05, .016, .05, bm, 0, .225, 0, bt, 20); cyl(.016, .016, .06, bm, 0, .28, 0, bt, 12); cyl(.018, .018, .02, std(0x2a1a0a), 0, .315, 0, bt, 12); cyl(.051, .051, .08, std(0xece2c8, { roughness: .8 }), 0, .09, 0, bt, 20); },
    stressball(g) { const it = new THREE.Group(); it.position.set(.27, TOP, 1.7); g.add(it); sph(.042, std(0xff7a1a, { roughness: .8 }), 0, .042, 0, it, 24); [-1, 1].forEach(s => sph(.006, std(0x1a1a1a), s * .013, .052, .04, it, 8)); tag(it, "squish"); },
    duck(g) { const it = new THREE.Group(); it.position.set(-.12, TOP, 1.74); it.rotation.y = -.5; g.add(it); const y = std(0xffd21f, { roughness: .45 }); sph(.045, y, 0, .035, 0, it, 20).scale.set(1.2, .85, 1); sph(.03, y, .035, .085, 0, it, 20); const beak = new THREE.Mesh(new THREE.ConeGeometry(.012, .03, 12), std(0xff7a00)); beak.rotation.z = -Math.PI / 2; beak.position.set(.07, .082, 0); it.add(beak); [-1, 1].forEach(s => sph(.005, std(0x111111), .055, .095, s * .014, it, 8)); tag(it, "squeak"); },
    plant(g) { const it = new THREE.Group(); it.position.set(.98, TOP, 1.86); g.add(it); cyl(.06, .045, .09, std(0xb5562f, { roughness: .9 }), 0, .045, 0, it, 20); cyl(.055, .055, .01, std(0x3a2a1c), 0, .087, 0, it, 20); const cac = std(0x3f8f4a, { roughness: .7 }); cyl(.03, .03, .16, cac, 0, .17, 0, it, 14); sph(.03, cac, 0, .25, 0, it, 14); cyl(.016, .016, .07, cac, .04, .17, 0, it, 10).rotation.z = -.9; cyl(.016, .016, .05, cac, .065, .2, 0, it, 10); sph(.012, std(0xff6fae), 0, .282, 0, it, 10); },
    calculator(g) { const it = new THREE.Group(); it.position.set(.12, TOP + .008, 1.95); it.rotation.y = -.15; g.add(it); box(.1, .016, .15, std(0x1d1d22, { roughness: .5 }), 0, 0, 0, it); box(.08, .004, .035, new THREE.MeshBasicMaterial({ color: 0xa8c49a }), 0, .009, -.045, it).castShadow = false; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) box(.016, .006, .016, std(q === 3 ? 0xe7b24c : 0x4a4a52), -.03 + q * .02, .01, -.01 + r * .022, it); tag(it, "tick"); }
  };
  function tag(group, kind) { group.userData.kind = kind; group.userData.home = { p: group.position.clone(), r: group.rotation.clone() }; group.traverse(o => { if (o.isMesh) { o.userData.owner = group; clickables.push(o); } }); }
  function setDesk(list) { while (deskItems.children.length) { const c = deskItems.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } clickables.length = 0; list.forEach(id => DESK[id] && DESK[id](deskItems)); deskItems.children.slice().forEach(gp => { _bx.setFromObject(gp); _bx.getSize(_v1); const b = blob(Math.max(_v1.x, _v1.z) * .75); b.position.set(gp.position.x, TOP + .002, gp.position.z); deskItems.add(b); }); deskItems.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } }); if (card) { card.userData.owner = { userData: { kind: "card" } }; clickables.push(card); } clickables.push(screenMesh); screenMesh.userData.owner = { userData: { kind: "screen" } }; }

  // ----- lights -----
  const hemi = new THREE.HemisphereLight(0xffe2c4, 0x2a1408, 1.6); scene.add(hemi);
  const ambL = new THREE.AmbientLight(0xffffff, .2); scene.add(ambL);
  const key = new THREE.SpotLight(0xffd9a8, 0, 24, .42, .5, 2); key.position.set(0, 4.9, -1.2); key.target.position.set(MARK.x, 0, MARK.z);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02; key.shadow.radius = 3; key.shadow.camera.near = 1; key.shadow.camera.far = 12; scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbfd4ff, .7); fill.position.set(-3, 3, 4); scene.add(fill);
  const rim = new THREE.SpotLight(0xffffff, 12, 16, .6, .7, 2); rim.position.set(-.6, 4.5, -6); rim.target.position.set(MARK.x, 1, MARK.z); scene.add(rim, rim.target);
  const deskLamp = new THREE.PointLight(0xffd2a0, 1.1, 3, 2); deskLamp.position.set(0, 1.4, 2.3); scene.add(deskLamp);
  const rig = new THREE.Group(); scene.add(rig); const rigMat = std(0x18171a, { metalness: .8, roughness: .35 });
  box(9, .08, .08, rigMat, 0, 4.6, -1.2, rig); box(9, .08, .08, rigMat, 0, 4.6, -5.5, rig);
  const canLights = []; const canMat = new THREE.MeshBasicMaterial({ color: 0xffe0b0 }); const CAN = new THREE.Color(0xffe0b0).multiplyScalar(3);
  for (let i = 0; i < 7; i++) { const x = -3.6 + i * 1.2; cyl(.11, .14, .22, rigMat, x, 4.45, -1.2, rig, 16); const lens = new THREE.Mesh(new THREE.CircleGeometry(.1, 20), canMat); lens.rotation.x = Math.PI / 2; lens.position.set(x, 4.335, -1.2); rig.add(lens); canLights.push(lens); }
  const themeGroup = new THREE.Group(); scene.add(themeGroup); const strips = [], themeLights = [];

  // ----- Rex: jointed rig (shoulder → elbow → hand, hip → knee → foot) -----
  const rex = new THREE.Group(); scene.add(rex);
  const M = { skin: std(0xc99273, { roughness: .55 }), jacket: std(0x3a2260, { roughness: .72 }), pants: std(0x17131c, { roughness: .8 }), shirt: std(0xefe9e0, { roughness: .8 }), hat: std(0x121014, { roughness: .45 }), hair: std(0x2c2026, { roughness: .9 }), eye: std(0xffffff, { roughness: .3 }), pupil: std(0x15110f, { roughness: .2 }), mouth: std(0x4a1f24, { roughness: .6 }), shoe: std(0x0d0b0d, { roughness: .25, metalness: .2 }), brass: std(0xe7b24c, { roughness: .3, metalness: .9 }) };
  const cardCanvas = document.createElement("canvas"); cardCanvas.width = 256; cardCanvas.height = 360;
  const cardTex = new THREE.CanvasTexture(cardCanvas); cardTex.colorSpace = THREE.SRGBColorSpace; M.card = std(0xffffff, { roughness: .6, map: cardTex });
  const mats = Object.values(M); mats.forEach(m => { m.userData.base = m.color.clone(); });
  function limb(parent, x, y, l1, l2, r1, r2, m1, m2, end) {
    const root = new THREE.Group(); root.position.set(x, y, 0); parent.add(root); cyl(r1, r1 * .9, l1, m1, 0, -l1 / 2, 0, root, 16); sph(r1 * .95, m1, 0, -l1, 0, root, 12);
    const joint = new THREE.Group(); joint.position.y = -l1; root.add(joint); cyl(r2, r2 * .88, l2, m2, 0, -l2 / 2, 0, joint, 16); const tip = new THREE.Group(); tip.position.y = -l2; joint.add(tip); end && end(tip); return { root, joint, tip };
  }
  const legs = [-1, 1].map(s => limb(rex, s * .11, .95, .45, .44, .085, .074, M.pants, M.pants, tip => box(.13, .08, .28, M.shoe, 0, -.02, .06, tip)));
  const torso = new THREE.Group(); torso.position.y = .95; rex.add(torso);
  cyl(.25, .2, .72, M.jacket, 0, .36, 0, torso, 28); cyl(.205, .2, .12, M.jacket, 0, .02, 0, torso, 28);
  box(.16, .5, .02, M.shirt, 0, .44, .215, torso).rotation.x = -.05;
  const bt = new THREE.Group(); bt.position.set(0, .66, .235); torso.add(bt);
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(.045, .09, 4), M.brass); c.rotation.z = s * Math.PI / 2; c.position.x = s * .045; bt.add(c); }); sph(.022, M.brass, 0, 0, .005, bt, 12);
  [.42, .28].forEach(y => sph(.016, M.pants, 0, y, .22, torso, 10));
  sph(.1, M.jacket, -.24, .68, 0, torso, 16); sph(.1, M.jacket, .24, .68, 0, torso, 16);
  // arms[0] = Rex's right (screen side, -x). arms[1] = his left (card hand, +x)
  let cardPivot, card;
  const arms = [-1, 1].map(s => limb(torso, s * .29, .68, .32, .3, .068, .056, M.jacket, M.jacket, tip => { sph(.062, M.skin, 0, -.04, 0, tip, 16); if (s > 0) { cardPivot = new THREE.Group(); cardPivot.position.set(0, -.08, .06); tip.add(cardPivot); card = new THREE.Mesh(new THREE.BoxGeometry(.11, .155, .006), M.card); card.castShadow = true; cardPivot.add(card); cardPivot.rotation.x = -.3; } }));
  cyl(.07, .075, .12, M.skin, 0, .78, 0, torso, 16);
  const head = new THREE.Group(); head.position.y = .98; torso.add(head);
  sph(.17, M.skin, 0, 0, 0, head, 32).scale.set(1, 1.12, 1);
  sph(.04, M.skin, -.168, -.01, 0, head, 12); sph(.04, M.skin, .168, -.01, 0, head, 12);
  sph(.172, M.hair, 0, .015, -.03, head, 24).scale.set(1.02, .9, .92);
  const eyes = new THREE.Group(); eyes.position.set(0, .03, .145); head.add(eyes);
  const pupils = []; [-1, 1].forEach(s => { sph(.028, M.eye, s * .058, 0, 0, eyes, 16); pupils.push(sph(.015, M.pupil, s * .058, 0, .022, eyes, 12)); });
  const brows = [-1, 1].map(s => { const b = box(.06, .012, .015, M.hair, s * .06, .075, .15, head); b.userData.s = s; return b; });
  sph(.026, M.skin, 0, -.025, .17, head, 12).scale.set(1, 1.2, 1);
  [-1, 1].forEach(s => { const t = new THREE.Mesh(new THREE.TorusGeometry(.035, .011, 8, 16, Math.PI), M.hair); t.position.set(s * .036, -.068, .16); t.scale.set(1, .6, 1); if (s < 0) t.rotation.y = Math.PI; head.add(t); });
  const mouth = sph(.032, M.mouth, 0, -.11, .145, head, 16); mouth.scale.set(1.3, .25, .6);
  const hat = new THREE.Group(); hat.position.y = .16; head.add(hat);
  cyl(.24, .24, .018, M.hat, 0, 0, 0, hat, 32); cyl(.14, .15, .27, M.hat, 0, .14, 0, hat, 32); cyl(.152, .152, .045, M.brass, 0, .04, 0, hat, 32); hat.rotation.z = -.06;
  rex.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  rex.position.set(DOOR_X, 0, DOOR_Z - 1.6);

  // ----- Rex as a realistic rigged character: Mixamo "Joe" with Mixamo motion-capture clips -----
  const MODEL = { ready: false };
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  // turn a bone so it points along a world direction (axis-agnostic, so it works on any rig)
  function aimBone(bone, child, dir, w) {
    if (w < .01) return;
    bone.getWorldPosition(_v1); child.getWorldPosition(_v2); _v2.sub(_v1); if (_v2.lengthSq() < 1e-8) return; _v2.normalize();
    _q1.setFromUnitVectors(_v2, dir); bone.getWorldQuaternion(_q2); _q1.multiply(_q2);
    bone.parent.getWorldQuaternion(_q3); _q3.invert().multiply(_q1); bone.quaternion.slerp(_q3, w); bone.updateMatrixWorld(true);
  }
  function rotWorld(bone, axis, ang) {
    if (Math.abs(ang) < 1e-4) return; _q1.setFromAxisAngle(axis, ang); bone.getWorldQuaternion(_q2); _q1.multiply(_q2);
    bone.parent.getWorldQuaternion(_q3); _q3.invert().multiply(_q1); bone.quaternion.copy(_q3); bone.updateMatrixWorld(true);
  }
  // soft contact shadows: a blurred dark disc under anything that touches the ground
  const blobTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(.55, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const blob = r => { const b = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), blobMat); b.rotation.x = -Math.PI / 2; b.renderOrder = 1; return b; };
  const rexBlob = blob(.42); rexBlob.material = blobMat.clone(); scene.add(rexBlob);
  const BLEND = .5;
  const GD = { next: 0, last: "", idleSwap: now() + 20000, layerAt: 0, glance: new THREE.Vector2(), glanceAt: 0, look: new THREE.Vector2() };
  if (ASSETS.glb) new GLTFLoader().parse(ASSETS.glb.slice(0), "", g => {
    try {
      const m = g.scene; m.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(m); const s = 1.8 / Math.max(.01, bb.max.y - bb.min.y); m.scale.multiplyScalar(s); m.position.y = -bb.min.y * s;
      rex.add(m); m.updateMatrixWorld(true);
      const modelMats = [];
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; const mm = o.material; mm.metalness = 0; mm.metalnessMap = null; mm.roughnessMap = null; mm.roughness = /hair|lash/i.test(o.name) ? .6 : .82; mm.envMapIntensity = .55; if (/hair|lash/i.test(o.name)) { mm.alphaTest = .45; mm.transparent = false; mm.side = THREE.DoubleSide; } if (!modelMats.includes(mm)) modelMats.push(mm); } });
      const B = n => m.getObjectByName(n);
      const bn = { hips: B("Hips"), spine: B("Spine2"), neck: B("Neck"), head: B("Head"), uaR: B("RightArm"), laR: B("RightForeArm"), fR: B("RightHand"), uaL: B("LeftArm"), laL: B("LeftForeArm"), fL: B("LeftHand"), footL: B("LeftFoot"), footR: B("RightFoot"), tipL: B("LeftHandMiddle1") };
      if (Object.values(bn).some(b => !b)) throw new Error("rig");
      // keep him on his mark: strip sideways/forward drift from the hips in every clip (the walk is moved by code)
      g.animations.forEach(c => c.tracks.forEach(tr => { if (tr.name === "Hips.position") { const v = tr.values; for (let i = 3; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } } }));
      // the card lives in his left hand
      bn.fL.getWorldPosition(_v1); bn.tipL.getWorldPosition(_v2); _v2.sub(_v1).normalize();
      const cp = new THREE.Group(); const cm = new THREE.Mesh(new THREE.BoxGeometry(.075, .105, .004), M.card); cm.castShadow = true; cp.add(cm);
      cp.position.copy(_v1).addScaledVector(_v2, .1).add(_v3.set(0, -.015, .03)); rex.worldToLocal(cp.position); cp.rotation.set(-Math.PI / 2, 0, 0); rex.add(cp); bn.fL.attach(cp); cp.userData.s0 = cp.scale.clone();
      rex.children.forEach(c => { if (c !== m && c !== cp) c.visible = false; });
      cardPivot = cp; card = cm; cm.userData.owner = { userData: { kind: "card" } }; clickables.push(cm);
      modelMats.forEach(mm => { mm.userData.base = mm.color.clone(); mats.push(mm); });
      const mixer = new THREE.AnimationMixer(m); const A = {}; g.animations.forEach(c => { A[c.name] = mixer.clipAction(c); });
      // upper-body gesture layers (additive), so a nod or shrug rides on top of whatever he is doing
      const UPPER = /^(Spine|Spine1|Spine2|Neck|Head|LeftShoulder|RightShoulder|LeftArm|RightArm|LeftForeArm|RightForeArm)\./;
      const L = {};
      ["Nod", "Shrug"].forEach(n => { const src = A[n] && A[n].getClip(); if (!src) return; const c = src.clone(); c.name = n + "Layer"; c.tracks = c.tracks.filter(t => UPPER.test(t.name) && t.name.endsWith(".quaternion")); THREE.AnimationUtils.makeClipAdditive(c); const a = mixer.clipAction(c); a.blendMode = THREE.AdditiveAnimationBlendMode; a.setLoop(THREE.LoopOnce, 1); L[n] = a; });
      A.Idle.play();
      // walk calibration: measure how far a foot travels per cycle so the clip speed matches ground speed (no sliding)
      const walk = { natural: 1.3, ph: [0, .5], last: 0 };
      if (A.Walk) {
        const clip = A.Walk.getClip(), tm = new THREE.AnimationMixer(m), ta = tm.clipAction(clip); ta.play(); const N = 72; let zmin = 1e9, zmax = -1e9; const zl = [], zr = [];
        for (let i = 0; i < N; i++) { tm.setTime(clip.duration * i / N); m.updateMatrixWorld(true); bn.footL.getWorldPosition(_v1); bn.footR.getWorldPosition(_v2); bn.hips.getWorldPosition(_v3); rex.worldToLocal(_v1); rex.worldToLocal(_v2); rex.worldToLocal(_v3); const a = _v1.z - _v3.z, b = _v2.z - _v3.z; zl.push(a); zr.push(b); zmin = Math.min(zmin, a, b); zmax = Math.max(zmax, a, b); }
        const stride = zmax - zmin; walk.natural = Math.max(.4, 2 * stride / clip.duration);
        const argmax = arr => arr.indexOf(Math.max(...arr)) / N; walk.ph = [argmax(zl), argmax(zr)];
        ta.stop(); tm.uncacheRoot(m);
      }
      const arm = () => ({ u: new THREE.Vector3(0, -1, 0), l: new THREE.Vector3(0, -1, 0), tu: new THREE.Vector3(0, -1, 0), tl: new THREE.Vector3(0, -1, 0), w: new Spring(0, 16, 1) });
      const restQ = ["head", "neck", "uaR", "laR", "uaL", "laL"].map(k => [bn[k], bn[k].quaternion.clone()]);
      Object.assign(MODEL, { ready: true, restQ, m, bn, mixer, A, L, walk, cur: "Idle", oneShot: null, arms: { R: arm(), L: arm() } });
      mixer.addEventListener("finished", e => { if (MODEL.oneShot && e.action === A[MODEL.oneShot.name]) { const done = MODEL.oneShot.done; MODEL.oneShot = null; e.action.fadeOut(BLEND); A[MODEL.cur].reset().fadeIn(BLEND).play(); done && done(); } });
      softenEnv();
    } catch (err) { dbg("model err " + err.message); rex.children.forEach(c => { c.visible = true; }); MODEL.ready = false; }
  }, err => dbg("parse err " + (err && err.message)));
  function baseClip(name) { if (!MODEL.ready || MODEL.cur === name || !MODEL.A[name]) return; const a = MODEL.A[name]; a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(BLEND).play(); MODEL.A[MODEL.cur].fadeOut(BLEND); MODEL.cur = name; }
  function onceClip(name, done) { if (!MODEL.ready || !MODEL.A[name]) { done && done(); return; } const a = MODEL.A[name]; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.fadeIn(BLEND).play(); MODEL.A[MODEL.cur].fadeOut(BLEND); MODEL.oneShot = { name, done }; }
  function layer(name) { const a = MODEL.ready && MODEL.L[name]; if (!a || now() < GD.layerAt) return; GD.layerAt = now() + 3500; a.reset().setEffectiveWeight(1).fadeIn(.3).play(); }
  // gesture director: picks the body clip from what Rex is doing, and never repeats the same talking gesture twice in a row
  function direct(t, walking, talking) {
    const Mo = MODEL; if (Mo.oneShot) return;
    if (walking) { baseClip("Walk"); return; }
    if (talking) { if (!Mo.cur.startsWith("Talk") || t > GD.next) { const opts = ["Talk1", "Talk2", "Talk3"].filter(n => n !== GD.last && Mo.A[n]); const n = opts[Math.floor(Math.random() * opts.length)]; GD.last = n; GD.next = t + 4200 + Math.random() * 2600; baseClip(n); } return; }
    if (st.lk > .5 && Mo.A.Think) { baseClip("Think"); return; }
    if (t > GD.idleSwap) { GD.idleSwap = t + 16000 + Math.random() * 10000; baseClip(Mo.cur === "Idle" && Mo.A.Idle2 ? "Idle2" : "Idle"); return; }
    if (!Mo.cur.startsWith("Idle")) baseClip("Idle");
  }
  const armList = [null, null];
  function updateModel(dt, T, t, walking, talking) {
    const Mo = MODEL; if (!Mo.ready) return;
    direct(t, walking, talking);
    if (Mo.A.Walk) Mo.A.Walk.timeScale = walking ? Math.max(.5, Math.min(1.8, st.speed / Mo.walk.natural)) : 1;
    Mo.restQ.forEach(([b, q]) => b.quaternion.copy(q));
    Mo.mixer.update(dt);
    Mo.restQ.forEach(([b, q]) => q.copy(b.quaternion));
    // footsteps land when each foot reaches the front of its stride in the clip
    if (walking && Mo.A.Walk) { const D = Mo.A.Walk.getClip().duration, ph = (Mo.A.Walk.time % D) / D, lp = Mo.walk.last; for (let i = 0; i < 2; i++) { const p = Mo.walk.ph[i]; if ((lp < p && ph >= p) || (lp > ph && (p > lp || p <= ph))) SFX.step(Math.min(1, st.speed / 1.4) * .9 + .1); } Mo.walk.last = ph; }
    rex.updateMatrixWorld(true);
    const yq = rex.quaternion, R = Mo.arms.R, Lh = Mo.arms.L; let rw = 0, lw = 0;
    if (!walking && !Mo.oneShot) {
      if (st.pointing) { Mo.bn.uaR.getWorldPosition(_v3); R.tu.copy(SCREEN_POS).sub(_v3).normalize(); R.tl.copy(R.tu); rw = 1; }
      if (now() < st.trickUntil) { Lh.tu.set(.25, -.35, .9).normalize().applyQuaternion(yq); Lh.tl.set(.05, .75, .65).normalize().applyQuaternion(yq); lw = 1; }
    }
    armList[0] = R; armList[1] = Lh;
    for (let i = 0; i < 2; i++) {
      const a = armList[i], w = i ? lw : rw, ua = i ? Mo.bn.uaL : Mo.bn.uaR, la = i ? Mo.bn.laL : Mo.bn.laR, f = i ? Mo.bn.fL : Mo.bn.fR;
      a.w.t = w; const ww = Math.max(0, Math.min(1, a.w.step(dt)));
      a.u.lerp(a.tu, Math.min(1, dt * 4)).normalize(); a.l.lerp(a.tl, Math.min(1, dt * 4)).normalize();
      aimBone(ua, la, a.u, ww); aimBone(la, f, a.l, ww);
    }
    // eyes-and-head: he looks at you (or the screen), with small glances, and mood tilts
    const h = Mo.bn.head, right = _v1.set(-1, 0, 0).applyQuaternion(yq), fwd = _v2.set(0, 0, 1).applyQuaternion(yq);
    if (t > GD.glanceAt) { GD.glanceAt = t + 2500 + Math.random() * 3500; GD.glance.set((Math.random() - .5) * .16, (Math.random() - .5) * .07); }
    let yawT = 0, pitchT = 0;
    if (!walking && !Mo.oneShot) {
      const tgt = st.look > .5 ? SCREEN_POS : camera.position; h.getWorldPosition(_v3); _v4.copy(tgt).sub(_v3);
      const bodyYaw = rex.rotation.y; yawT = Math.max(-.7, Math.min(.7, angDiff(bodyYaw, Math.atan2(_v4.x, _v4.z)))); pitchT = Math.max(-.35, Math.min(.35, Math.atan2(_v4.y, Math.hypot(_v4.x, _v4.z))));
      yawT += GD.glance.x * (1 - st.look); pitchT += GD.glance.y * (1 - st.look);
    }
    GD.look.x += (yawT - GD.look.x) * Math.min(1, dt * 3.5); GD.look.y += (pitchT - GD.look.y) * Math.min(1, dt * 3.5);
    rotWorld(Mo.bn.neck, UP, GD.look.x * .35); rotWorld(h, UP, GD.look.x * .45);
    rotWorld(h, right, -GD.look.y * .5 - (.08 * st.mu - .04 * st.mc));
    rotWorld(h, fwd, .1 * st.lk);
  }
  function placeBlob() { const onDisc = Math.hypot(rex.position.x - MARK.x, rex.position.z - MARK.z) < 1.12; rexBlob.position.set(rex.position.x, onDisc ? .093 : .004, rex.position.z); rexBlob.material.opacity = 1 - st.sil; rexBlob.visible = st.sil < .95; }

  const SP = n => new Spring(0, n || 55, .7);
  const J = { a0x: SP(), a0z: SP(), e0: SP(), a1x: SP(), a1z: SP(), e1: SP(), lean: SP(40), tilt: SP(40), pitch: SP(40), yaw: new Spring(0, 30, .85) };
  const st = { sil: 1, walk: null, phase: 0, stepIdx: 0, speed: 0, heading: 0, talkAmp: 0, mouthPulse: 0, blinkAt: now() + 3000, bow: 0,
    pointing: false, mood: "neutral", mc: 0, mu: 0, listen: false, lk: 0, trickUntil: 0, fidget: null, nextFidget: now() + 9000, away: false, look: 0, cardPop: 1 };

  function drawCard(big, small) {
    const g = cardCanvas.getContext("2d"); const w = 256, h = 360; const acc = "#" + THEMES[S.studio].accent.toString(16).padStart(6, "0");
    g.textAlign = "center"; g.fillStyle = "#f7f3ea"; g.fillRect(0, 0, w, h); g.strokeStyle = acc; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#2a1d40"; g.font = "800 " + (big.length > 5 ? 64 : 84) + "px 'Bricolage Grotesque', sans-serif"; g.fillText(big, w / 2, h / 2 + 18);
    g.font = "500 22px 'Lexend', sans-serif"; g.fillStyle = "#5b4a6b"; const words = small.split(" "); let line = "", y = h / 2 + 70;
    words.forEach(wd => { if (g.measureText(line + wd).width > w - 60) { g.fillText(line.trim(), w / 2, y); line = ""; y += 26; } line += wd + " "; }); g.fillText(line.trim(), w / 2, y);
    g.font = "700 20px 'Lexend', sans-serif"; g.fillStyle = acc; g.fillText("NVDA", w / 2, 60); cardTex.needsUpdate = true;
  }
  drawCard("?", "pick a card");

  function applyTheme(name) {
    const T = THEMES[name];
    while (themeGroup.children.length) { const c = themeGroup.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    themeLights.forEach(l => scene.remove(l)); themeLights.length = 0; strips.length = 0;
    if (floorMat.map && floorMat.map.userData.gen) floorMat.map.dispose();
    const real = name !== "arena" && ASSETS.tex.floor_diff;
    if (real) {
      // Poly Haven laminate (CC0): real colour, bump and gloss variation
      const rp = t => { const c = t.clone(); c.repeat.set(5, 5); c.needsUpdate = true; return c; };
      floorMat.map = rp(ASSETS.tex.floor_diff); floorMat.normalMap = rp(ASSETS.tex.floor_nor_gl); floorMat.roughnessMap = rp(ASSETS.tex.floor_rough);
      floorMat.color.setHex(name === "classic" ? 0xb07a52 : 0x7d8590); floorMat.roughness = name === "classic" ? .9 : .6; floorMat.normalScale.set(.8, .8);
    } else {
      floorMat.map = T.floor(); floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping; floorMat.map.repeat.set(6, 6); floorMat.normalMap = null; floorMat.roughnessMap = null; floorMat.color.setHex(0xffffff); floorMat.roughness = T.floorRough;
    }
    // contact shading baked in Blender (Cycles ambient occlusion): walls, desk, screen and stage darken the floor where they meet it
    floorMat.aoMap = ASSETS.tex.floor_ao || null; floorMat.aoMapIntensity = 1;
    floorMat.needsUpdate = true;
    if (wallMat.map) wallMat.map.dispose();
    wallMat.map = noiseTex(T.wall, name === "classic" ? .12 : .05, 3, 256); wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping; wallMat.map.repeat.set(6, 2); wallMat.roughness = T.wallRough; wallMat.needsUpdate = true;
    hemi.color.setHex(T.ambient); hemi.groundColor.setHex(T.ground); key.color.setHex(T.key);
    setLin(ringMat.color, T.accent); setLin(brass.color, T.accent); setLin(M.brass.color, T.accent); M.brass.userData.base = M.brass.color.clone();
    setLin(M.jacket.color, T.jacket); M.jacket.userData.base = M.jacket.color.clone();
    if (MODEL.jacket) { setLin(MODEL.jacket.color, T.jacket); MODEL.jacket.userData.base = MODEL.jacket.color.clone(); }
    backLight.color.setHex(T.backlight); doorSpill.color.setHex(T.backlight);
    if (name === "classic") {
      const slatMat = std(0x4a2a18, { roughness: .45 }); slatMat.map = woodTex("#6a3e22", "30,12,4", 9);
      for (let x = -7.4; x <= 7.4; x += 1.1) { if (Math.abs(x - DOOR_X) < 1.3) continue; box(.22, 4.8, .1, slatMat, x, 2.4, DOOR_Z + .03, themeGroup); }
      for (let x = -6.85; x <= 7.4; x += 2.2) { if (Math.abs(x - DOOR_X) < 1.4) continue; const s = new THREE.Mesh(new THREE.BoxGeometry(.03, 4.2, .02), new THREE.MeshBasicMaterial({ color: T.strip })); s.position.set(x, 2.5, DOOR_Z + .05); themeGroup.add(s); strips.push(s); }
      [-1, 1].forEach(s => { const l = new THREE.PointLight(T.strip, 1.6, 8, 2); l.position.set(s * 4.5, 3, DOOR_Z + 1); scene.add(l); themeLights.push(l); });
      const curtainMat = std(0x5a1424, { roughness: .9 });
      if (ASSETS.tex.velvet_diff) { const rp = t => { const c = t.clone(); c.repeat.set(1, 6); c.needsUpdate = true; return c; }; curtainMat.map = rp(ASSETS.tex.velvet_diff); curtainMat.normalMap = rp(ASSETS.tex.velvet_nor_gl); curtainMat.roughnessMap = rp(ASSETS.tex.velvet_rough); curtainMat.color.setHex(0xb04050); curtainMat.roughness = 1; curtainMat.sheen = 1; }
      [-1, 1].forEach(s => { for (let i = 0; i < 9; i++) cyl(.12, .12, 5, curtainMat, s * (7.6 - i * .02), 2.5, -7.5 + i * .22, themeGroup, 10); });
    } else if (name === "boardroom") {
      const sky = canvasTex(2048, 512, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1626"); gr.addColorStop(1, "#24405e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        const r = rnd(21); for (let x = 0; x < w;) { const bw = 40 + r() * 110, bh = 120 + r() * 330; g.fillStyle = shade("#0b121a", .8 + r() * .4); g.fillRect(x, h - bh, bw, bh); for (let wy = h - bh + 10; wy < h - 6; wy += 14) for (let wx = x + 6; wx < x + bw - 6; wx += 12) if (r() < .45) { g.fillStyle = `rgba(255,${210 + r() * 40},${150 + r() * 60},${.4 + r() * .5})`; g.fillRect(wx, wy, 5, 7); } x += bw + 4 + r() * 10; }
      });
      [[-W / 2 + leftW / 2, leftW, 0], [W / 2 - rightW / 2, rightW, .5]].forEach(([x, w, off]) => { const t = sky.clone(); t.needsUpdate = true; t.offset.x = off; t.repeat.x = .5; const p = new THREE.Mesh(new THREE.PlaneGeometry(w - .2, 3.6), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); p.position.set(x, 2.3, DOOR_Z + .02); themeGroup.add(p); });
      const mul = std(0x1d242c, { metalness: .8, roughness: .3 });
      for (let x = -7.5; x <= 7.5; x += 1.5) { if (Math.abs(x - DOOR_X) < 1.2) continue; box(.06, 3.7, .08, mul, x, 2.3, DOOR_Z + .06, themeGroup); }
      box(W, .08, .1, mul, 0, .5, DOOR_Z + .06, themeGroup); box(W, .08, .1, mul, 0, 4.15, DOOR_Z + .06, themeGroup);
      const l = new THREE.DirectionalLight(0x9fc8ff, 1.1); l.position.set(0, 3, DOOR_Z + 2); scene.add(l); themeLights.push(l);
      const tableMat = std(0x2b3239, { roughness: .2, metalness: .3 }); box(2.2, .06, .7, tableMat, 3.4, .74, -4.4, themeGroup).rotation.y = -.4; cyl(.05, .08, .72, tableMat, 3.4, .37, -4.4, themeGroup);
    } else {
      const cols = [0xff5fa8, 0x4ef0e0];
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(14 - i * 1.6, .04, .04), new THREE.MeshBasicMaterial({ color: cols[i % 2] })); s.position.set(0, .7 + i * .85, DOOR_Z + .05); themeGroup.add(s); strips.push(s); }
      [-1, 1].forEach((s, i) => { const v = new THREE.Mesh(new THREE.BoxGeometry(.05, 4.8, .05), new THREE.MeshBasicMaterial({ color: cols[i] })); v.position.set(s * 7.7, 2.4, -6); themeGroup.add(v); strips.push(v); });
      const fr = new THREE.Mesh(new THREE.TorusGeometry(1.5, .02, 8, 96), new THREE.MeshBasicMaterial({ color: 0x4ef0e0 })); fr.rotation.x = Math.PI / 2; fr.position.set(MARK.x, .02, MARK.z); themeGroup.add(fr);
      [[-4, 0xff5fa8], [4, 0x4ef0e0]].forEach(([x, c]) => { const l = new THREE.PointLight(c, 2.8, 10, 2); l.position.set(x, 2.5, -6); scene.add(l); themeLights.push(l); });
    }
    themeGroup.traverse(o => { if (o.isMesh && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
    strips.forEach(s => { s.userData.c = s.material.color.clone().multiplyScalar(3); }); themeLights.forEach(l => { l.userData.i0 = l.intensity; });
  }

  // ----- screen: charts build, numbers count up, spoken value lights up -----
  const sc = { mode: "idle", visual: null, src: "", revealStart: 0, buildStart: 0, hl: -1 };
  function drawScreen() {
    const g = screenCanvas.getContext("2d"); g.setTransform(SCR_K, 0, 0, SCR_K, 0, 0); const w = 1280, h = 734; const acc = "#" + THEMES[S.studio].accent.toString(16).padStart(6, "0");
    g.textAlign = "left"; g.fillStyle = "#07090d"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.025)"; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    if (sc.mode === "idle" || sc.mode === "standby") {
      g.fillStyle = "#e9f0f7"; g.font = "800 120px 'Bricolage Grotesque', sans-serif"; g.fillText(sc.mode === "standby" ? "STAND BY" : "NEXT PITCH", 60, h / 2 + 30);
      g.fillStyle = acc; g.fillRect(60, h / 2 + 70, 240, 10); return;
    }
    if (sc.mode === "reveal") {
      const p = Math.min(1, (now() - sc.revealStart) / 1600); const name = "NVIDIA"; const n = Math.floor(p * (name.length + .999));
      g.fillStyle = "#ffffff"; g.font = "800 220px 'Bricolage Grotesque', sans-serif"; g.fillText(name.slice(0, n), 60, h / 2 + 60);
      if (p >= 1) { g.fillStyle = acc; g.font = "700 44px 'Lexend', sans-serif"; g.fillText("NASDAQ: NVDA", 64, h - 120); }
      return;
    }
    const v = sc.visual; if (!v) return; const bp = smoother(Math.min(1, (now() - sc.buildStart) / 1100));
    g.fillStyle = "#7e8996"; g.font = "500 26px 'Lexend', sans-serif"; const asof = "AS OF JUL 26, 2026"; g.fillText(asof, w - 56 - g.measureText(asof).width, 64); g.fillText("NVDA", 56, 64);
    g.fillStyle = "#eef3f8"; g.font = "700 50px 'Bricolage Grotesque', sans-serif"; g.fillText(v.title, 56, 140);
    if (v.type === "bars") {
      const max = Math.max(...v.items.map(i => i[1])); const top = 190, bottom = h - 90; const rowH = Math.min(110, (bottom - top) / v.items.length);
      const labW = 420, trackX = 56 + labW, trackW = w - trackX - 220;
      v.items.forEach(([lab, val, hi], i) => {
        const y = top + i * rowH + rowH / 2; const lit = sc.hl === i; const k = smoother(Math.min(1, Math.max(0, bp * 1.4 - i * .12)));
        g.fillStyle = lit ? "#ffffff" : "#c3ccd6"; g.font = (lit ? "700" : "400") + " 32px 'Lexend', sans-serif";
        let L = lab; while (g.measureText(L).width > labW - 20 && L.length > 3) L = L.slice(0, -2) + "…"; g.fillText(L, 56, y + 11);
        g.fillStyle = "#1a1f28"; g.fillRect(trackX, y - 18, trackW, 36);
        if (lit) { g.shadowColor = acc; g.shadowBlur = 28; }
        g.fillStyle = hi || lit ? acc : "#5b6676"; g.fillRect(trackX, y - 18, trackW * val / max * k, 36); g.shadowBlur = 0;
        const shown = val * k; g.fillStyle = "#ffffff"; g.font = "700 36px 'Lexend', sans-serif"; g.fillText(v.unit === "%" ? Math.round(shown) + "%" : fmtB(shown), trackX + trackW + 20, y + 12);
      });
    } else {
      v.items.forEach((t, i) => { const y = 230 + i * 104; const show = bp * v.items.length > i * .8; if (!show) return; const lit = sc.hl === i; if (lit) { g.fillStyle = "rgba(242,153,74,.14)"; g.fillRect(40, y - 52, w - 80, 76); } g.fillStyle = "#f2994a"; g.fillRect(56, y - 34, 44, 44); g.fillStyle = "#1a0f02"; g.font = "800 34px 'Lexend', sans-serif"; g.fillText("!", 71, y); g.fillStyle = lit ? "#ffffff" : "#c9d1da"; g.font = (lit ? "700" : "400") + " 38px 'Lexend', sans-serif"; g.fillText(t, 124, y); });
    }
    g.fillStyle = "#7e8996"; g.font = "400 24px 'Lexend', sans-serif"; g.fillText("SOURCE: " + sc.src.toUpperCase(), 56, h - 36);
  }
  function setScreen(mode, visual, src) {
    sc.mode = mode; if (visual !== undefined) sc.visual = visual; if (src !== undefined) sc.src = src;
    if (mode === "reveal") sc.revealStart = now(); if (mode === "visual") { sc.buildStart = now(); sc.hl = -1; }
    drawScreen(); screenTex.needsUpdate = true;
    const v = sc.visual;
    $("screen-sr").textContent = mode === "visual" && v ? "On screen: " + v.title + ". " + (v.type === "bars" ? v.items.map(i => i[0] + " " + (v.unit === "%" ? i[1] + "%" : fmtB(i[1]))).join(", ") : v.items.join("; ")) : "";
  }
  function highlightFor(sentence) {
    const v = sc.visual; if (!v || sc.mode !== "visual") return; let idx = -1;
    if (v.type === "bars") v.items.forEach(([, val], i) => { const tokn = v.unit === "%" ? val + "%" : val.toFixed(1); if (idx < 0 && sentence.includes(tokn)) idx = i; });
    else { const m = sentence.match(/^(One|Two|Three|Four)\b/); if (m) idx = ["One", "Two", "Three", "Four"].indexOf(m[1]); }
    if (idx !== sc.hl) { sc.hl = idx; drawScreen(); screenTex.needsUpdate = true; }
  }

  const LIT = { act3: { hemi: .5, amb: .06, key: 36, fill: .15, rim: 16, cans: .25, strips: .3, desk: .6 }, show: { hemi: 1.9, amb: .25, key: 28, fill: .7, rim: 12, cans: 1, strips: 1, desk: 1.1 }, dim: { hemi: .12, amb: .03, key: 0, fill: 0, rim: 0, cans: .08, strips: .12, desk: .15 } };
  const lightState = { cans: 1, strips: 1, canCur: 1, stripCur: 1 };
  function lighting(preset, dur) { const p = LIT[preset]; tween(hemi, "intensity", p.hemi, dur); tween(ambL, "intensity", p.amb, dur); tween(key, "intensity", p.key, preset === "show" ? 60 : dur); tween(fill, "intensity", p.fill, dur); tween(rim, "intensity", p.rim, dur); tween(deskLamp, "intensity", p.desk, dur); lightState.cans = p.cans; lightState.strips = p.strips; }

  // ----- camera: you stay in the chair; the director changes where you look and how close -----
  let baseFov = 45;
  const cam = { lx: new Spring(WIDE_LOOK.x, 5, 1), ly: new Spring(WIDE_LOOK.y, 5, 1), lz: new Spring(WIDE_LOOK.z, 5, 1), fov: new Spring(45, 3.2, 1) };
  const shot = { name: "wide", push: 1, pushT: 1, fovAt: 0 }; const ST = [0, 0, 0, 0]; const tgt4 = (a, b, c, d) => { ST[0] = a; ST[1] = b; ST[2] = c; ST[3] = d; return ST; };
  const tmpV = new THREE.Vector3();
  function shotTarget() {
    const hx = rex.position.x, hz = rex.position.z;
    switch (shot.name) {
      case "rex": return tgt4(hx, 1.62, hz, baseFov * .5 * shot.push);
      case "mid": return tgt4(hx * .7 + .1, 1.22, hz + .6, baseFov * .9);
      case "two": return tgt4((hx + SCREEN_POS.x) / 2, 1.7, (hz + SCREEN_POS.z) / 2, baseFov * .82);
      case "screen": return tgt4(SCREEN_POS.x, SCREEN_POS.y, SCREEN_POS.z, baseFov * .6);
      case "listen": return tgt4(hx, 1.55, hz, baseFov * .62);
      case "desk": return tgt4(0, .8, 1.8, baseFov);
      default: return tgt4(WIDE_LOOK.x, WIDE_LOOK.y, WIDE_LOOK.z, baseFov);
    }
  }
  function setShot(name) { if (reduced && name !== "wide") name = name === "screen" ? "two" : "mid"; if (shot.name !== name) shot.fovAt = now() + 250; shot.name = name; }

  // ----- studio reflections and camera polish: light glow, depth blur in close-ups, vignette -----
  const pmrem = new THREE.PMREMGenerator(renderer);
  try { scene.environment = ASSETS.env ? pmrem.fromEquirectangular(ASSETS.env).texture : pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = ASSETS.env ? .45 : 1; } catch (e) {}
  let composer = null, bokeh = null, bloom = null;
  try {
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt); composer.setPixelRatio(dpr);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .32, .5, 1.5); composer.addPass(bloom);
    bokeh = new BokehPass(scene, camera, { focus: 6, aperture: .00002, maxblur: .006 }); bokeh.enabled = false; composer.addPass(bokeh);
    const vg = new ShaderPass(VignetteShader); vg.uniforms.offset.value = .95; vg.uniforms.darkness.value = 1.1; composer.addPass(vg);
    composer.addPass(new OutputPass());
  } catch (e) { composer = null; dbg("composer " + e.message); }
  function softenEnv() { scene.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && !o.material.userData.envSet) { if (!(o.material.envMapIntensity < 1)) o.material.envMapIntensity = o.material.metalness > .5 ? 1 : .5; o.material.userData.envSet = true; } }); }

  function resize() {
    const r = stage.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
    baseFov = camera.aspect >= 1.3 ? 45 : Math.min(80, 2 * Math.atan(Math.tan(30 * Math.PI / 180) / camera.aspect) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();
  let mx = 0, my = 0, mxs = 0, mys = 0;

  // ----- walking: eased start/stop, stride matched to distance, planted steps -----
  function walkTo(x, z, dur, done) {
    const fx = rex.position.x, fz = rex.position.z; const d = Math.hypot(x - fx, z - fz); if (d < .05) { done && done(); return; }
    const nx = -(z - fz) / d, nz = (x - fx) / d, bend = Math.min(.5, d * .14);
    const w = { p0x: fx, p0z: fz, p1x: (fx + x) / 2 + nx * bend, p1z: (fz + z) / 2 + nz * bend, p2x: x, p2z: z, dur: dur || Math.max(900, d * 900), t0: 0, done };
    st.heading = Math.atan2(w.p1x - fx, w.p1z - fz); const turn = Math.abs(angDiff(J.yaw.x, st.heading));
    w.t0 = now() + (turn > .45 && !reduced ? Math.min(650, 220 + turn * 260) : 0); st.walk = w;
  }
  function doors(open, dur = 1100) { if (!open && dur > 200) later(dur * .92, () => SFX.door()); const off = open ? 1.05 : 0; tween(doorL.position, "x", DOOR_X - .425 - off, dur); tween(doorR.position, "x", DOOR_X + .425 + off, dur); seam.visible = !open; }

  // ----- clicks and hover on 3D objects -----
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let hoverAt = 0;
  function pickAt(e) { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(clickables, false)[0]; return hit ? hit.object.userData.owner : null; }
  renderer.domElement.addEventListener("pointermove", e => { const r = stage.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; if (now() - hoverAt > 90) { hoverAt = now(); renderer.domElement.style.cursor = pickAt(e) ? "pointer" : ""; } });
  let sipping = false;
  renderer.domElement.addEventListener("pointerdown", e => {
    const o = pickAt(e); if (!o) return; const kind = o.userData.kind;
    if (kind === "squish") { SFX.squish(); o.scale.set(1.25, .55, 1.25); tween(o.scale, "x", 1, 380, 120); tween(o.scale, "y", 1, 380, 120); tween(o.scale, "z", 1, 380, 120); }
    else if (kind === "squeak") { SFX.squeak(); o.rotation.z = .25; tween(o.rotation, "z", 0, 400, 60); }
    else if (kind === "tick") { SFX.tick(); }
    else if ((kind === "sip" || kind === "whiskey") && !sipping) {
      sipping = true; const h = o.userData.home; SFX.gulp();
      tween(o.position, "y", h.p.y + .36, 520); tween(o.position, "z", h.p.z + .85, 520); tween(o.position, "x", h.p.x * .35, 520); tween(o.rotation, "x", -.9, 520, 250);
      later(1350, () => { tween(o.position, "y", h.p.y, 520); tween(o.position, "z", h.p.z, 520); tween(o.position, "x", h.p.x, 520); tween(o.rotation, "x", 0, 400); later(520, () => { if (kind === "sip" || kind === "whiskey") SFX.glass(); }); later(560, () => sipping = false); });
      hooks.sip && hooks.sip(kind);
    }
    else hooks.click && hooks.click(kind);
  });

  // ----- adaptive quality -----
  let frameAvg = 16, slowFor = 0, fastFor = 0, quality = 2; const fullDpr = dpr;
  function setQuality(q) {
    quality = q; dpr = q >= 2 ? fullDpr : 1; renderer.setPixelRatio(dpr);
    const lo = q === 0; renderer.shadowMap.type = lo ? THREE.PCFShadowMap : THREE.PCFShadowMap; key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize(); frameAvg = 16; slowFor = fastFor = 0;
  }
  function adapt(dt) {
    frameAvg = frameAvg * .95 + dt * 1000 * .05;
    if (frameAvg > 24) { slowFor += dt; fastFor = 0; } else if (frameAvg < 15) { fastFor += dt; slowFor = Math.max(0, slowFor - dt); } else { slowFor = Math.max(0, slowFor - dt * .5); fastFor = 0; }
    if (slowFor > 2.5 && quality > 0) setQuality(quality - 1);
    else if (fastFor > 10 && quality < 2) setQuality(quality + 1);
  }

  // ----- per-frame -----
  let last = now(); const clock0 = now();
  function frame() {
    const t = now(); const dt = Math.min(.05, (t - last) / 1000); last = t; const T = (t - clock0) / 1000; const k = x => Math.min(1, dt * x);
    adapt(dt);
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; if (t < tw.start) continue; if (tw.from === null) tw.from = tw.obj[tw.key]; const p = Math.min(1, (t - tw.start) / tw.dur); tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.fn(p); if (p >= 1) tweens.splice(i, 1); }

    // walking: turn on the spot first, then follow a gentle curve; heading follows the path
    let walking = false, turning = false;
    if (st.walk) {
      const w = st.walk;
      if (t < w.t0) { turning = true; st.speed = 0; }
      else {
        const p = Math.min(1, (t - w.t0) / w.dur); const e = smoother(p), u = 1 - e;
        const nx = u * u * w.p0x + 2 * u * e * w.p1x + e * e * w.p2x, nz = u * u * w.p0z + 2 * u * e * w.p1z + e * e * w.p2z;
        const tx = u * (w.p1x - w.p0x) + e * (w.p2x - w.p1x), tz = u * (w.p1z - w.p0z) + e * (w.p2z - w.p1z); if (tx * tx + tz * tz > 1e-6) st.heading = Math.atan2(tx, tz);
        const moved = Math.hypot(nx - rex.position.x, nz - rex.position.z); rex.position.x = nx; rex.position.z = nz;
        st.speed += (moved / Math.max(dt, .001) - st.speed) * k(12);
        if (!MODEL.ready) { st.phase += moved / .5 * Math.PI; const si = Math.floor(st.phase / Math.PI); if (si !== st.stepIdx) { st.stepIdx = si; SFX.step(Math.min(1, st.speed / 1.4) * .9 + .1); } }
        walking = p < 1;
        if (p >= 1) { const d = w.done; st.walk = null; st.speed = 0; d && d(); }
      }
    }
    const stride = Math.min(1, st.speed / 1.3);

    // camera: critically damped glides, zoom trails the look slightly, damped mouse parallax and a faint handheld drift
    const tg = shotTarget(); cam.lx.t = tg[0]; cam.ly.t = tg[1]; cam.lz.t = tg[2]; if (t > shot.fovAt) cam.fov.t = tg[3]; shot.push += (shot.pushT - shot.push) * k(.35);
    const sway = reduced ? 0 : 1; mxs += (mx - mxs) * k(2.5); mys += (my - mys) * k(2.5);
    const hx = Math.sin(T * .23) * .011 + Math.sin(T * .61 + 1.3) * .005 + Math.sin(T * 1.37 + .4) * .002, hy = Math.sin(T * .31 + 2) * .007 + Math.sin(T * .83 + .7) * .003;
    camera.position.set(camBase.x + sway * (hx + mxs * .1), camBase.y + sway * (hy - mys * .04), camBase.z);
    tmpV.set(cam.lx.step(dt) + sway * hx * .4, cam.ly.step(dt) + sway * hy * .4, cam.lz.step(dt)); camera.lookAt(tmpV);
    const nf = cam.fov.step(dt); if (Math.abs(nf - camera.fov) > .01) { camera.fov = nf; camera.updateProjectionMatrix(); }

    // lights
    lightState.canCur += (lightState.cans - lightState.canCur) * k(3); lightState.stripCur += (lightState.strips - lightState.stripCur) * k(3);
    canMat.color.copy(CAN).multiplyScalar(.15 + .85 * lightState.canCur);
    for (let i = 0; i < strips.length; i++) { const s = strips[i]; const pulse = S.studio === "arena" ? .75 + .25 * Math.sin(T * 2 + i) : 1; s.material.color.copy(s.userData.c).multiplyScalar(Math.max(.05, lightState.stripCur * pulse)); }
    for (let i = 0; i < themeLights.length; i++) themeLights[i].intensity = themeLights[i].userData.i0 * lightState.stripCur;
    for (let i = 0; i < mats.length; i++) { const m = mats[i]; if (m !== M.card) m.color.copy(m.userData.base).multiplyScalar(1 - st.sil * .97); }
    key.target.position.x += (rex.position.x - key.target.position.x) * k(2); key.target.position.z += (rex.position.z - key.target.position.z) * k(2);

    // performance layers
    const talking = Voice.talking; st.talkAmp += ((talking ? 1 : 0) - st.talkAmp) * k(5);
    st.lk += ((st.listen && !talking && !walking ? 1 : 0) - st.lk) * k(3);
    st.mc += ((st.mood === "confident" ? 1 : 0) - st.mc) * k(2.5); st.mu += ((st.mood === "uneasy" ? 1 : 0) - st.mu) * k(2.5);
    if (!talking && !walking && !st.listen && !busy && t > st.nextFidget && st.sil < .1) { st.fidget = { kind: pick(MODEL.ready ? ["glance", "glance"] : ["hat", "glance", "weight"]), until: t + 1500 }; st.nextFidget = t + 8000 + Math.random() * 5000; }
    if (st.fidget && t > st.fidget.until) st.fidget = null;

    // body yaw: walk heading (including the turn before a walk), else blend camera ↔ screen
    const camYaw = Math.atan2(camera.position.x - rex.position.x, camera.position.z - rex.position.z);
    const scrYaw = Math.atan2(SCREEN_POS.x - rex.position.x, SCREEN_POS.z - rex.position.z);
    st.look += (Math.min(1, (st.pointing ? .55 : 0) + (st.fidget && st.fidget.kind === "glance" ? .6 : 0)) - st.look) * k(2.5);
    const wantYaw = walking || turning ? st.heading : camYaw + angDiff(camYaw, scrYaw) * st.look;
    J.yaw.t = J.yaw.x + angDiff(J.yaw.x, wantYaw); rex.rotation.y = J.yaw.step(dt);

    if (!MODEL.ready) proceduralRex(t, T, dt, k, walking, talking, stride);
    if ((sc.mode === "reveal" && t - sc.revealStart < 1700) || (sc.mode === "visual" && t - sc.buildStart < 1300)) { drawScreen(); screenTex.needsUpdate = true; }
    if (cardPivot && cardPivot.userData.s0) cardPivot.scale.copy(cardPivot.userData.s0).multiplyScalar(st.cardPop); else if (cardPivot) cardPivot.scale.set(st.cardPop, st.cardPop, 1);
    updateModel(dt, T, t, walking, talking); placeBlob();
    if (composer && quality > 0) {
      const close = shot.name === "rex" || shot.name === "listen"; bokeh.enabled = quality > 1 && close && !reduced;
      if (bokeh.enabled) { tmpV.set(rex.position.x, 1.55, rex.position.z); bokeh.uniforms.focus.value = camera.position.distanceTo(tmpV); }
      composer.render(dt);
    } else renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; const v = document.getElementById("veil"); if (v) { v.classList.add("gone"); setTimeout(() => v.remove(), 1400); } }
    requestAnimationFrame(frame);
  }
  let firstFrame = false;
  // the original stylised rig, kept as a fallback when the character model is unavailable
  function proceduralRex(t, T, dt, k, walking, talking, stride) {
    let a0x = .05, a0z = -.08, e0 = -.15, a1x = .05, a1z = .08, e1 = -.15;
    if (walking && !reduced) { const sw = Math.sin(st.phase); a0x = -sw * .35 * stride; a1x = sw * .35 * stride; e0 = e1 = -.3; }
    else {
      if (st.talkAmp > .05) { a1x = lerp(a1x, -.45 + Math.sin(T * 1.7) * .22, st.talkAmp); a1z = lerp(a1z, .18, st.talkAmp); e1 = lerp(e1, -1.05 + Math.sin(T * 2.6) * .25, st.talkAmp); a0x = lerp(a0x, -.1 + Math.sin(T * 1.3 + 1) * .08, st.talkAmp); e0 = lerp(e0, -.4, st.talkAmp); }
      if (st.mu > .3 && !st.pointing) { a0x = -.35; a0z = .28; e0 = -1.35; a1x = -.35; a1z = -.28; e1 = -1.35; }
      if (st.lk > .05) { a1x = lerp(a1x, -.4, st.lk); a1z = lerp(a1z, -.32, st.lk); e1 = lerp(e1, -2.35, st.lk); a0x = lerp(a0x, -.3, st.lk); a0z = lerp(a0z, .32, st.lk); e0 = lerp(e0, -1.45, st.lk); }
      if (st.fidget && st.fidget.kind === "hat") { a1x = -2.3; a1z = -.15; e1 = -1.1; }
      if (st.pointing) { a0x = -.75 + Math.sin(T * 2.2) * .05; a0z = -.95; e0 = -.08; }
      if (t < st.trickUntil) { a1x = -1.1; a1z = .15; e1 = -.7; }
    }
    J.a0x.t = a0x; J.a0z.t = a0z; J.e0.t = e0; J.a1x.t = a1x; J.a1z.t = a1z; J.e1.t = e1;
    arms[0].root.rotation.x = J.a0x.step(dt); arms[0].root.rotation.z = J.a0z.step(dt); arms[0].joint.rotation.x = J.e0.step(dt);
    arms[1].root.rotation.x = J.a1x.step(dt); arms[1].root.rotation.z = J.a1z.step(dt); arms[1].joint.rotation.x = J.e1.step(dt);
    for (let i = 0; i < legs.length; i++) { const l = legs[i]; const ph = st.phase + (i ? Math.PI : 0); const sw = walking && !reduced ? Math.sin(ph) * .42 * stride : 0; const kn = walking && !reduced ? Math.max(0, -Math.cos(ph)) * .65 * stride : 0; l.root.rotation.x += (sw - l.root.rotation.x) * k(14); l.joint.rotation.x += (kn - l.joint.rotation.x) * k(14); l.tip.rotation.x = -(l.root.rotation.x + l.joint.rotation.x); }
    torso.position.y = .95 + (walking ? Math.abs(Math.cos(st.phase)) * .03 * stride : Math.sin(T * 1.6) * .006);
    const weight = st.fidget && st.fidget.kind === "weight" ? .05 : 0;
    J.lean.t = st.bow + .1 * st.lk + .05 * st.mu + (walking ? .05 * stride : 0); torso.rotation.x = J.lean.step(dt);
    J.tilt.t = weight + (walking ? Math.sin(st.phase) * .025 * stride : 0); torso.rotation.z = J.tilt.step(dt);
    J.pitch.t = .1 * st.mu - .04 * st.mc + Math.sin(T * 2.3) * .03 * st.talkAmp; head.rotation.x = J.pitch.step(dt);
    head.rotation.y = Math.sin(T * .7) * .07 * st.talkAmp - .25 * st.look * (st.pointing ? -1 : 0);
    head.rotation.z += ((.13 * st.lk) - head.rotation.z) * k(4);
    for (let i = 0; i < brows.length; i++) { const b = brows[i], s = b.userData.s; b.rotation.z = s * (-.15 * (1 - st.mu) + .3 * st.mu); b.position.y = .075 + .01 * st.mc + .006 * st.mu + .008 * st.lk; }
    // mouth: eased toward a target that follows speech boundaries, never snapping
    st.mouthPulse = Math.max(0, st.mouthPulse - dt * 4);
    const flap = talking ? (st.mouthPulse > 0 ? .35 + st.mouthPulse * .8 : .3 + .45 * Math.abs(Math.sin(T * 11) * .7 + Math.sin(T * 19) * .3)) : .22;
    mouth.scale.y += (flap - mouth.scale.y) * k(14); mouth.scale.x = 1.3 + .25 * st.mc - .25 * st.mu; mouth.position.y = -.11 + .006 * st.mc - .004 * st.mu;
    for (let i = 0; i < pupils.length; i++) pupils[i].position.y = -.004 * st.mu;
    if (t > st.blinkAt) { const bp = (t - st.blinkAt) / 140; eyes.scale.y = bp < 1 ? Math.max(.1, Math.abs(1 - bp * 2)) : 1; if (bp >= 1) st.blinkAt = t + 2500 + Math.random() * 3000; }
  }
  applyTheme(S.studio); softenEnv(); setScreen("idle", null, ""); lighting("show", 10); requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawScreen(); screenTex.needsUpdate = true; drawCard("?", "pick a card"); drawNotes(); });

  return {
    applyTheme(n) { applyTheme(n); softenEnv(); drawScreen(); screenTex.needsUpdate = true; },
    act(n) { lighting(n === 3 ? "act3" : "show", 900); },
    setDesk(l) { setDesk(l); softenEnv(); }, drawNotes, setScreen, highlightFor, setShot,
    screenImage() { return screenCanvas.toDataURL("image/png"); },
    word(n) { st.mouthPulse = Math.min(.9, .4 + n * .06); },
    mood(m) { if (m !== st.mood && MODEL.ready && Voice.talking) { if (m === "uneasy" && Math.random() < .6) layer("Shrug"); else if (m === "confident" && Math.random() < .3) layer("Nod"); } st.mood = m; },
    push(on) { shot.pushT = on ? .86 : 1; },
    listen(on) { st.listen = on; if (!busy && !Voice.talking) setShot(on ? "listen" : "mid"); },
    interrupt() { st.trickUntil = 0; },
    perform(item) {
      if (item.card) { drawCard(item.card[0], item.card[1]); st.trickUntil = now() + 1900; SFX.flick(); const ry = cardPivot.rotation.y; tween(cardPivot.rotation, "y", ry + Math.PI * 2, 700, 250, backOut); tween(st, "cardPop", 2.2, 380, 200, backOut); tween(st, "cardPop", 1, 450, 1700); }
      if (item.visual) {
        setShot("screen"); later(2100, () => setShot(st.pointing || st.walk ? "two" : "rex"));
        if (reduced) { rex.position.set(SCREEN_SPOT.x, 0, SCREEN_SPOT.z); st.pointing = true; st.away = true; }
        else { st.away = true; later(item.card ? 1200 : 0, () => walkTo(SCREEN_SPOT.x, SCREEN_SPOT.z, 1500, () => { st.pointing = true; })); }
      } else setShot("rex");
    },
    finishAnswer() { shot.pushT = 1; later(1400, () => { if (Voice.talking) return; st.pointing = false; st.mood = "neutral"; setShot("mid"); if (st.away) { st.away = false; walkTo(MARK.x, MARK.z, 1500); } }); },
    entrance(onReady) {
      clearLater(); tweens.length = 0; st.pointing = false; st.away = false; st.mood = "neutral"; st.walk = null; setShot("wide");
      rex.position.set(DOOR_X, 0, DOOR_Z - 1.6); J.yaw.x = J.yaw.t = 0; st.sil = 1; st.bow = 0; doors(false, 1);
      backLight.intensity = 0; doorSpill.intensity = 0; glowMat.color.setScalar(0);
      if (reduced) { rex.position.set(MARK.x, 0, MARK.z); st.sil = 0; lighting("show", 10); setScreen("reveal"); later(300, onReady); return; }
      lighting("dim", 900); setScreen("standby"); SFX.drumroll(3.4);
      later(1200, () => { tween(backLight, "intensity", 18, 600); tween(doorSpill, "intensity", 30, 600); glowMat.color.setHex(THEMES[S.studio].backlight).multiplyScalar(3); SFX.whoosh(); doors(true, 1300); });
      later(2200, () => walkTo(DOOR_X, DOOR_Z + .2, 1400));
      later(3550, () => { SFX.crash(); SFX.clunk(); key.intensity = LIT.show.key * 1.3; tween(key, "intensity", LIT.show.key, 900); tween(st, "sil", 0, 260); setScreen("reveal"); });
      later(3750, () => { lighting("show", 1400); walkTo(MARK.x, MARK.z, 2700, () => { if (MODEL.ready) onceClip("Bow"); }); });
      later(4600, () => { doors(false, 1200); tween(backLight, "intensity", 0, 1200); tween(doorSpill, "intensity", 0, 1200); later(1200, () => glowMat.color.setScalar(0)); });
      later(5600, () => setShot("mid"));
      later(MODEL.ready ? 8000 : 6600, onReady);
    },
    place() { rex.position.set(MARK.x, 0, MARK.z); st.sil = 0; setShot("mid"); },
    hide() { clearLater(); tweens.length = 0; st.walk = null; rex.position.set(DOOR_X, 0, DOOR_Z - 1.6); st.sil = 1; st.pointing = false; st.away = false; st.mood = "neutral"; doors(false, 1); lighting("show", 10); setShot("wide"); },
    exit(bow, onGone) {
      clearLater(); st.pointing = false; st.listen = false; st.mood = "neutral"; setShot("wide");
      const go = () => { glowMat.color.setHex(THEMES[S.studio].backlight).multiplyScalar(3); tween(backLight, "intensity", 12, 500); doors(true, 900); walkTo(DOOR_X, DOOR_Z - 1.6, 3200, () => { doors(false, 900); tween(backLight, "intensity", 0, 900); later(900, () => glowMat.color.setScalar(0)); onGone && onGone(); }); };
      if (MODEL.ready && !reduced) { let went = false; const g2 = () => { if (!went) { went = true; go(); } }; st.mood = bow ? "confident" : "neutral"; onceClip(bow ? "Victory" : "Defeat", () => later(250, g2)); later(5200, g2); }
      else if (bow && !reduced) { st.mood = "confident"; tween(st, "bow", .45, 400); later(700, () => tween(st, "bow", 0, 400)); later(1300, go); } else go();
    }
  };
}

// ================= UI plumbing =================
const PANELS = ["m-decide", "m-transcript", "m-info", "m-settings", "m-notes", "m-chart"];
function openPanel(id) { PANELS.forEach(p => { if (p !== id) { $(p).hidden = true; $(p).classList.remove("closing"); } }); $(id).classList.remove("closing"); $(id).hidden = false; const f = $(id).querySelector(".close, input:not([type=checkbox]), button.btn"); f && f.focus(); }
function closePanels() { if (!$("m-decide").hidden && !S.decided) { SFX.tension(false); R && R.act(2); } PANELS.forEach(id => { const el = $(id); if (el.hidden || el.classList.contains("closing")) return; el.classList.add("closing"); setTimeout(() => { el.hidden = true; el.classList.remove("closing"); }, 180); }); }
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closePanels));
document.querySelectorAll(".scrim").forEach(s => s.addEventListener("click", e => { if (e.target === s && PANELS.includes(s.id)) closePanels(); }));
let toastT = null;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800); }
const pop = document.createElement("div"); pop.className = "panel"; pop.style.cssText = "position:fixed;z-index:30;width:auto;max-width:300px;padding:12px 14px;gap:4px"; pop.hidden = true; pop.setAttribute("role", "tooltip"); document.body.appendChild(pop);
addEventListener("keydown", e => { if (e.key === "Escape") { closePanels(); pop.hidden = true; } });
document.addEventListener("click", e => {
  const t = e.target.closest(".term");
  if (t) { pop.innerHTML = `<b style="font-family:var(--display)">${esc(t.dataset.term)}</b><span style="color:var(--muted)">${esc(GLOSSARY[t.dataset.term.toLowerCase()] || "")}</span>`; pop.hidden = false; const r = t.getBoundingClientRect(); const w = Math.min(300, innerWidth - 32); pop.style.left = Math.max(16, Math.min(r.left, innerWidth - w - 16)) + "px"; pop.style.top = Math.max(16, r.top - 8 - pop.offsetHeight) + "px"; return; }
  if (!e.target.closest("[role=tooltip]")) pop.hidden = true;
});
function notesHTML() { return S.notes.length ? S.notes.map(n => `<div><span>${esc(n.s)}</span><b>${esc(n.big)}</b></div>`).join("") : `<div><span>Nothing yet. Ask Rex a question.</span></div>`; }

// ================= 3D init =================
try {
  R = initGL({
    click(kind) {
      if (kind === "notes") { $("notes-list").innerHTML = notesHTML(); openPanel("m-notes"); }
      else if (kind === "screen") { $("chart-img").src = R.screenImage(); $("chart-img").alt = $("screen-sr").textContent || "Studio screen"; openPanel("m-chart"); }
      else if (kind === "card" && current && current.item.card && !busy) { const [b, s] = current.item.card; speakLines([`${b}. ${s.charAt(0).toUpperCase() + s.slice(1)}.`], null); }
    },
    sip(kind) { if (kind === "whiskey" && !Voice.talking && !busy && $("bottom").hidden === false) later2(900, () => speakLines([pick(["Liquid courage. Bold move, shark.", "Easy now. I need you sharp.", "Pour one for the tariffs."])], null)); }
  });
} catch (e) { R = null; const m = document.createElement("div"); m.className = "glmsg"; m.textContent = "The 3D studio needs WebGL, which this browser has turned off."; stage.prepend(m); }
function later2(ms, f) { setTimeout(f, ms); }

// ================= FLOW =================
let current = null, interrupted = false, pending = null, worryAsked = false;
function speakLines(raw, item, onDone) {
  interrupted = false;
  const plainS = raw.map(plain);
  Voice.say(plainS, {
    onSentence(i) {
      Captions.start(raw[i]);
      if (R) {
        R.mood(UNEASY.test(plainS[i]) || (item && item.risk && i > 0) ? "uneasy" : "confident");
        R.highlightFor(plainS[i]); R.push(/\d/.test(plainS[i]));
      }
      $("tx-body").querySelectorAll(".sent").forEach(s => s.classList.toggle("now", Number(s.dataset.i) === i));
    },
    onWord(i, n) { Captions.word(); R && R.word(n); },
    onDone() { Captions.all(); setTimeout(() => { if (!Voice.talking) Captions.clear(); }, 2200); R && R.finishAnswer(); onDone && onDone(); }
  });
}
function present(item, typed, simple, reaction, onDone) {
  const text = simple ? item.simple : (item.a || item.text);
  const raw = splitSentences(text); if (reaction) raw.unshift(reaction);
  current = { item, raw };
  $("tx-title").textContent = item.q; $("tx-body").innerHTML = raw.map((p, i) => `<span class="sent" data-i="${i}">${tokenize(p).map(renderTok).join(" ")}</span>`).join(" ");
  $("tx-src").innerHTML = item.src ? "Source: " + item.src.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(" · ") : "";
  if (R && item.visual) R.setScreen("visual", item.visual, item.src[0].label);
  R && R.perform(item);
  if (item.card && item.id !== "hook") addNote(item);
  speakLines(raw, item, onDone);
}
function sayLine(line) { current = { item: { q: "Rex", a: line }, raw: [line] }; $("tx-title").textContent = "Rex"; $("tx-body").textContent = line; $("tx-src").textContent = ""; R && R.setShot("rex"); speakLines([line], null); }
function addNote(q) { if (S.notes.some(n => n.id === q.id)) return; S.notes.push({ id: q.id, s: q.s, big: q.note || q.card[0] }); save(); R && R.drawNotes(); }
function reactionFor(typed) { if (CHALLENGE.test(typed)) return pick(REACT.challenge); if (POSITIVE.test(typed)) return pick(REACT.positive); return Math.random() < .45 ? pick(REACT.neutral) : null; }
$("btn-replay").addEventListener("click", () => { if (!current || busy) return; if (current.item.visual && R) { R.setScreen("visual", current.item.visual, current.item.src[0].label); R.perform(current.item); } speakLines(current.raw, current.item); });
$("btn-transcript").addEventListener("click", () => { if (current) openPanel("m-transcript"); });

// ask box: rotating suggestions, listen pose, interrupt
const SUGGEST = () => PITCH.questions.filter(q => !S.asked.includes(q.id)).map(q => q.q).concat(["Explain that simpler", "What is gross margin?"]);
let sugI = 0; setInterval(() => { const inp = $("ask-input"); if (document.activeElement === inp && inp.value) return; const list = SUGGEST(); sugI = (sugI + 1) % list.length; inp.placeholder = list[sugI]; }, 3800);
$("ask-input").addEventListener("focus", () => R && R.listen(true));
$("ask-input").addEventListener("blur", () => R && R.listen(false));
$("ask-input").addEventListener("input", () => {
  if (Voice.talking && !interrupted && !busy && $("ask-input").value.length === 1) { interrupted = true; Voice.stop(); Captions.clear(); R && R.interrupt(); setTimeout(() => { Voice.say(["Go ahead, shark."], { onSentence() { Captions.start("Go ahead, shark."); }, onDone() { setTimeout(() => Captions.clear(), 1200); } }); R && R.listen(true); }, 120); }
});
$("ask-form").addEventListener("submit", e => { e.preventDefault(); ask($("ask-input").value.trim()); });
// Act 2 opens with Rex asking you something; mid-grilling he flips it back on you
function act2() { if (busy || S.decided || S.skipped) return; SFX.stinger("act2"); R && R.act(2); later2(800, () => { if (busy) return; pending = "goodbad"; sayLine("So, shark. Good news or bad news first?"); }); }
function maybeWorry() { if (worryAsked || S.asked.length < 3) return; worryAsked = true; later2(1300, () => { if (Voice.talking || busy || S.decided) return; pending = "worry"; sayLine("Let me flip it. What worries you most, shark? The customers, the debt, or China?"); }); }
function ask(typed) {
  if (busy) return; if (!typed) { $("ask-input").focus(); return; }
  $("ask-input").value = ""; R && R.listen(false);
  const p = pending; pending = null;
  if (p === "goodbad") {
    if (/\b(bad|worst|negative|downside|risks?|ugly)\b/i.test(typed)) { const q = PITCH.questions.find(x => x.id === "risk"); mark(q); present(q, typed, false, "Bad news first. Brave.", maybeWorry); return; }
    if (/\b(good|best|positive|upside|great)\b/i.test(typed)) { const q = PITCH.questions.find(x => x.id === (S.asked.includes("growth") ? "profit" : "growth")); mark(q); present(q, typed, false, "Good news it is.", maybeWorry); return; }
  }
  if (ADVICE.test(typed)) { sayLine("I can't tell you whether to invest, shark. That's your call, and tonight it's play money. I can show you the numbers and the risks so you can decide."); return; }
  const q = matchQuestion(typed); const mentionsCo = /\b(you|your|nvidia|nvda|company|they|their)\b/i.test(typed); const term = glossaryHit(typed);
  if (term && (!q || !mentionsCo) && !SIMPLER.test(typed)) { sayLine(`${term.charAt(0).toUpperCase() + term.slice(1)}. ${GLOSSARY[term]}`); return; }
  if (SIMPLER.test(typed)) { const target = q || (current && current.item.simple ? current.item : null); if (target && target.simple) { mark(target); present(target, typed, true); return; } }
  if (q) { mark(q); present(q, typed, false, reactionFor(typed), maybeWorry); return; }
  sayLine("That one's outside my act tonight. Ask me what NVIDIA sells, how fast it's growing, its profits, its debt, where the money goes, who the customers are, its cash flow, or what could go wrong.");
}
function mark(q) { if (q.id && !S.asked.includes(q.id)) { S.asked.push(q.id); save(); } updateDecide(); }
function updateDecide() { $("btn-decide").classList.toggle("locked", !S.asked.includes("risk")); }

// microphone (browser speech recognition; free)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  $("btn-mic").hidden = false; let rec = null;
  $("btn-mic").addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    if (busy) return; Voice.stop(); Captions.clear();
    rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.maxAlternatives = 1;
    $("btn-mic").classList.add("on"); R && R.listen(true);
    rec.onresult = e => { const r = e.results[e.results.length - 1]; $("ask-input").value = r[0].transcript; if (r.isFinal) { const t = r[0].transcript; rec.stop(); ask(t.trim()); } };
    rec.onerror = ev => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") toast("Microphone blocked. Type your question instead."); };
    rec.onend = () => { rec = null; $("btn-mic").classList.remove("on"); R && R.listen(false); };
    try { rec.start(); } catch (err) { rec = null; $("btn-mic").classList.remove("on"); }
  });
}

// decide
$("btn-decide").addEventListener("click", () => {
  if (busy) return;
  if (!S.asked.includes("risk")) { toast("Ask what could go wrong first."); $("ask-input").focus(); return; }
  $("covered").innerHTML = PITCH.questions.map(q => `<span class="${S.asked.includes(q.id) ? "yes" : ""}">${q.s}</span>`).join("");
  $("decide-notes").innerHTML = notesHTML(); $("avail").textContent = fmtUSD(START - committed()) + " available";
  $("offer-msg").textContent = ""; Voice.stop(); Captions.clear(); openPanel("m-decide"); R && R.act(3); R && R.setShot("rex"); SFX.stinger("verdict"); SFX.tension(true);
});
document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => { $("offer-amount").value = Number(c.dataset.amt).toLocaleString("en-US"); }));
$("offer-form").addEventListener("submit", e => {
  e.preventDefault(); const msg = $("offer-msg");
  const amt = Number(($("offer-amount").value || "").replace(/[^\d.]/g, "")); const avail = START - committed();
  if (!amt || amt <= 0) { msg.textContent = "Enter an amount, for example 250,000."; return; }
  if (amt > avail) { msg.textContent = `You have ${fmtUSD(avail)} left.`; return; }
  S.offers.push({ ticker: PITCH.ticker, amount: Math.round(amt), reason: $("offer-reason").value.trim() });
  S.decided = "in"; save(); $("offer-amount").value = ""; $("offer-reason").value = "";
  wrapUp(`You're in on NVIDIA for ${fmtUSD(amt)} of play money.`, true);
});
$("btn-out").addEventListener("click", () => { S.decided = "out"; save(); wrapUp("You're out on NVIDIA.", false); });
function wrapUp(text, bow) {
  SFX.tension(false); closePanels(); busy = true; R && R.act(2); const line = bow ? "A pleasure doing business, shark." : "Fair enough. The show goes on.";
  if (bow) { SFX.stinger("deal"); SFX.applause(2.8); } else SFX.stinger("nodeal");
  speakLines([line], null);
  const done = () => { busy = false; showDone(text); };
  R ? R.exit(bow, done) : setTimeout(done, 1500);
}
function showDone(text) {
  $("done-title").textContent = S.skipped ? "You skipped Rex" : "That's the show";
  $("done-text").textContent = text;
  $("done-pos").innerHTML = S.offers.map(o => `<div class="pos"><span>${o.ticker}</span><b>${fmtUSD(o.amount)}</b></div>`).join("");
  $("m-done").hidden = false; $("bottom").hidden = true; Captions.clear();
}
$("btn-skip").addEventListener("click", () => {
  if (busy) return; S.skipped = true; save(); Voice.stop(); Captions.clear(); busy = true; closePanels();
  const done = () => { busy = false; showDone("Skipped pitchers are gone until you run it again."); };
  R ? R.exit(false, done) : done();
});
function reset() {
  const keep = { desk: S.desk, captions: S.captions, gate: S.gate, studio: S.studio, voice: S.voice, sfx: S.sfx, voiceURI: S.voiceURI, offers: S.offers };
  S = Object.assign(blank(), keep); save(); Voice.stop(); Captions.clear(); clearLater(); busy = false; current = null; pending = null; worryAsked = false; SFX.tension(false); closePanels();
  $("m-done").hidden = true; $("bottom").hidden = true; $("btn-start").hidden = false;
  if (R) { R.hide(); R.setScreen("idle", null, ""); R.drawNotes(); }
  updateDecide();
}
$("btn-reset").addEventListener("click", reset); $("btn-reset-2").addEventListener("click", reset);
$("btn-start").addEventListener("click", () => {
  audio(); ambience(S.sfx); try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
  S.started = true; save(); busy = true; $("btn-start").hidden = true;
  const go = () => { busy = false; $("bottom").hidden = false; present(PITCH.hook, null, false, null, () => later2(500, act2)); };
  R ? R.entrance(go) : go();
});

// settings
function setStudio(name) { S.studio = name; save(); document.documentElement.dataset.studio = name; document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.studio === name))); R && R.applyTheme(name); }
document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => setStudio(b.dataset.studio)));
$("cap-on").addEventListener("change", e => { S.captions = e.target.checked; save(); if (!S.captions) Captions.clear(); });
$("voice-on").addEventListener("change", e => { S.voice = e.target.checked; save(); if (!S.voice) Voice.stop(); });
$("sfx-on").addEventListener("change", e => { S.sfx = e.target.checked; save(); ambience(S.sfx && S.started); });
$("voice-pick").addEventListener("change", e => { Voice.pick(e.target.value); Voice.say(["Rex Voltaire, at your service."]); });
$("voice-test").addEventListener("click", () => Voice.say(["Good evening, shark. This is how I'll sound for every answer tonight."]));
const deskBoxes = [...document.querySelectorAll("#deskgrid input")];
deskBoxes.forEach(b => { b.checked = S.desk.includes(b.value); b.addEventListener("change", () => { S.desk = deskBoxes.filter(x => x.checked).map(x => x.value); save(); R && R.setDesk(S.desk); }); });
$("open-info").addEventListener("click", () => openPanel("m-info"));
$("open-settings").addEventListener("click", () => openPanel("m-settings"));
$("gate-age").addEventListener("change", e => { $("gate-enter").disabled = !e.target.checked; });
$("gate-enter").addEventListener("click", () => { S.gate = true; save(); $("m-gate").hidden = true; $("btn-start").focus(); });

// init
$("cap-on").checked = S.captions; $("voice-on").checked = S.voice; $("sfx-on").checked = S.sfx; $("m-gate").hidden = !!S.gate;
setStudio(S.studio); R && R.setDesk(S.desk); updateDecide();
if (S.started && !S.skipped && !S.decided) { $("btn-start").hidden = true; $("bottom").hidden = false; R && R.place(); R && R.setScreen("reveal"); }
else if (S.decided || S.skipped) { S.started = false; S.skipped = false; S.decided = null; S.asked = []; S.notes = []; save(); updateDecide(); }
addEventListener("pointerdown", () => { if (S.started && S.sfx) { audio(); ambience(true); } }, { once: true });
Voice.init();
})();
