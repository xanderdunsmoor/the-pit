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
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { interpret } from "./matcher.js";
import { VERIFIED, SRC_Q, SRC_K, GLOSSARY, PITCH, REACT, CHALLENGE, POSITIVE, LINES, glossaryLine, cardLine, splitSentences, plain, forSpeech, lineId } from "./content.js";

(async () => {
'use strict';
// ================= PRELOAD: everything loads behind a veil, then the room fades in =================
const SFX_FILES = { step_wood: ["footstep_wood_000", "footstep_wood_001", "footstep_wood_002", "footstep_wood_003", "footstep_wood_004"], step_concrete: ["footstep_concrete_000", "footstep_concrete_001", "footstep_concrete_002", "footstep_concrete_003", "footstep_concrete_004"], squish: ["impactSoft_medium_000", "impactSoft_medium_001", "impactSoft_medium_002"], glass: ["impactGlass_light_000", "impactGlass_light_001", "impactGlass_light_002"], clunk: ["impactMetal_heavy_000"], door: ["impactPlank_medium_000", "impactWood_heavy_000"], tick: ["impactWood_light_000", "impactWood_light_001", "impactWood_light_002"], bell: ["impactBell_heavy_000"] };
const TEX_FILES = ["floor_diff", "floor_nor_gl", "floor_rough", "velvet_diff", "velvet_nor_gl", "velvet_rough", "metal_diff", "metal_nor_gl", "metal_rough", "floor_ao", "walnut_diff", "walnut_nor_gl", "walnut_rough", "veneer_diff", "veneer_nor_gl", "veneer_rough", "parquet_diff", "parquet_nor_gl", "parquet_rough", "leather_diff", "leather_nor_gl", "leather_rough"];
const ASSETS = { glb: null, room: null, investors: {}, sfx: {}, tex: {}, lm: {}, lmScale: {}, env: null, voice: null, voiceRaw: {} };
const veilBar = document.getElementById("veil-bar");
async function preload() {
  const jobs = []; let done = 0; const tick = () => { done++; if (veilBar) veilBar.style.transform = `scaleX(${done / jobs.length})`; };
  const add = p => { jobs.push(p.catch(() => null).finally(tick)); };
  add(fetch("models/rex.json").then(r => r.ok ? r.json() : null).then(j => { if (!j) return; const b = atob(j.glb); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); ASSETS.glb = u.buffer; }));
  add(fetch("models/boardroom.json").then(r => r.ok ? r.json() : null).then(j => { if (!j) return; const b = atob(j.glb); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); ASSETS.room = u.buffer; }));
  add(fetch("tex/lightmaps.json").then(r => r.ok ? r.json() : null).then(j => { if (j) Object.entries(j).forEach(([k, v]) => { ASSETS.lmScale[k] = v.scale; }); }));
  ["Floor", "Walls", "Ceiling"].forEach(n => add(new THREE.TextureLoader().loadAsync(`tex/lm_${n}.png`).then(t => { ASSETS.lm[n] = t; })));
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
  add(fetch("voice/index.json").then(r => r.ok ? r.json() : null).then(j => { if (!j) return; ASSETS.voice = j; ASSETS.voiceRaw = {}; return Promise.all(Object.keys(j.lines).map(id => fetch(`voice/${id}.mp3`).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) ASSETS.voiceRaw[id] = b; }))); }));
  if (document.fonts && document.fonts.load) ["800 40px 'Bricolage Grotesque'", "700 20px 'Bricolage Grotesque'", "400 20px Lexend", "500 20px Lexend", "700 20px Lexend", "600 20px Caveat"].forEach(f => add(document.fonts.load(f)));
  await Promise.all(jobs);
}
await preload();
const DBG = []; const dbg = m => { DBG.push(String(m)); if (location.hash === '#debug') { let d = document.getElementById('dbg'); if (!d) { d = document.createElement('pre'); d.id = 'dbg'; d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:60vw;white-space:pre-wrap;background:#000c;color:#0f0;font:11px monospace;padding:6px;pointer-events:none'; document.body.appendChild(d); } d.textContent = DBG.join('\n'); } };
addEventListener('error', e => dbg('ERR ' + e.message));
// ================= STATE =================
const KEY = "thepit.proto.v4", START = 1000000;
const blank = () => ({ desk: ["water", "notepad"], captions: false, gate: false, studio: "classic", voice: true, sfx: true, voiceURI: "", asked: [], notes: [], offers: [], done: [], skipped: false, decided: null, started: false });
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
let AC = null, noiseBuf = null, bus = null, amb = null, verb = null, voiceIn = null, voicePan = null;
function audio() { return S.sfx ? ctx() : null; }
function ctx() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const ir = AC.createBuffer(2, AC.sampleRate * 1.4, AC.sampleRate); for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3); }
      verb = AC.createConvolver(); verb.buffer = ir; const send = AC.createGain(); send.gain.value = .28; verb.connect(AC.destination);
      bus = AC.createGain(); bus.connect(AC.destination); bus.connect(send).connect(verb);
      // Rex's voice comes from where he stands, with a touch of the studio's echo
      voicePan = AC.createPanner(); voicePan.panningModel = "HRTF"; voicePan.distanceModel = "inverse"; voicePan.refDistance = 3.2; voicePan.rolloffFactor = .7;
      voiceIn = AC.createGain(); voiceIn.gain.value = 1.15; const vsend = AC.createGain(); vsend.gain.value = .13;
      voiceIn.connect(voicePan); voicePan.connect(AC.destination); voicePan.connect(vsend).connect(verb);
      loadSamples(); decodeVoice();
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
// a restrained music bed, synthesised in the browser (no licensing): warm, slow chords far under the voice
const Music = {
  g: null, on: false, level: 1, timer: null,
  start() {
    const a = audio(); if (!a || this.on) return; this.on = true;
    const out = a.createGain(); out.gain.value = 0; const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 820; lp.Q.value = .4;
    const lfo = a.createOscillator(); lfo.frequency.value = .05; const lg = a.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start();
    lp.connect(out); out.connect(a.destination); out.connect(verb); this.g = out;
    const CH = [[146.8, 220, 277.2, 329.6], [123.5, 185, 246.9, 293.7], [98, 146.8, 246.9, 293.7], [110, 164.8, 220, 277.2]]; let i = 0;
    const play = () => { if (!this.on) return; const t = a.currentTime; CH[i++ % CH.length].forEach((f, k) => { [0, 1].forEach(d => { const o = a.createOscillator(); o.type = k ? "triangle" : "sine"; o.frequency.value = f * (d ? 1.003 : .997); const gg = a.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.05 / (k + 1.5), t + 3); gg.gain.linearRampToValueAtTime(0, t + 10.5); o.connect(gg).connect(lp); o.start(t); o.stop(t + 11); }); }); this.timer = setTimeout(play, 8000); };
    play(); this.duck(this.level, 4);
  },
  duck(level, secs = 1.5) { this.level = level; if (this.g && AC) this.g.gain.setTargetAtTime(.32 * level, AC.currentTime, secs / 3); },
  stop() { this.on = false; clearTimeout(this.timer); if (this.g && AC) this.g.gain.setTargetAtTime(0, AC.currentTime, .5); }
};
const SFX = {
  arrive() { const a = audio(); if (!a) return; const t = a.currentTime + .01; tone(t, { f0: 70, f1: 46, gain: .22, decay: .7 }); },
  confirm() { playS("bell", .22, 1.25); const a = audio(); if (!a) return; this.chord(a.currentTime + .02, [261.6, 392, 523.3], 1.6, .018, 2200); },
  pass() { const a = audio(); if (!a) return; this.chord(a.currentTime + .02, [110, 164.8], 1.4, .02, 600); },
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
// Rex's studio voice: every line pre-rendered with an open-source neural voice (Kokoro), played through the room.
// Browser speech remains as a fallback and as an option in settings.
const NEURAL = { voiceURI: "neural", name: "Rex (studio voice)", lang: "en-US", neural: true };
const VBUF = {};
const VORDER = [], VPEND = {};
function ensureVoice(id) {
  if (VBUF[id] || VPEND[id] || !AC || !ASSETS.voiceRaw[id]) return;
  VPEND[id] = true;
  try { AC.decodeAudioData(ASSETS.voiceRaw[id].slice(0), b => { VBUF[id] = b; delete VPEND[id]; VORDER.push(id); while (VORDER.length > 24) delete VBUF[VORDER.shift()]; }, () => { delete VPEND[id]; }); } catch (e) { delete VPEND[id]; }
}
function decodeVoice() {}
const MOUTH = { open: 0, wide: 0, round: 0, press: 0, frames: null, t0: 0 };
const Voice = {
  list: [], chosen: null, talking: false, token: 0, safety: null, fake: null, timers: [], srcs: [],
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
    const synth = window.speechSynthesis; let sys = [];
    if (synth) {
      const get = () => synth.getVoices().filter(v => /^en/i.test(v.lang));
      if (!get().length) await new Promise(r => { let d = false; const fin = () => { if (!d) { d = true; r(); } }; synth.onvoiceschanged = fin; setTimeout(fin, 2000); });
      sys = get().sort((a, b) => this.score(b) - this.score(a)).slice(0, 7);
    }
    this.list = (ASSETS.voice ? [NEURAL] : []).concat(sys);
    this.chosen = this.list.find(v => v.voiceURI === S.voiceURI) || this.list[0] || null;
    if (this.chosen && S.voiceURI !== this.chosen.voiceURI) { S.voiceURI = this.chosen.voiceURI; save(); }
    this.ui();
  },
  ui() {
    const sel = $("voice-pick");
    if (!this.list.length) { sel.innerHTML = "<option>No voices on this device</option>"; sel.disabled = true; $("voice-test").disabled = true; $("voice-note").textContent = "This browser has no speech voices. Turn captions on to read Rex."; return; }
    sel.innerHTML = this.list.map(v => `<option value="${esc(v.voiceURI)}">${esc(v.name)}${v.neural ? " ★" : ""}</option>`).join("");
    sel.value = this.chosen.voiceURI; $("voice-note").textContent = "";
  },
  pick(uri) { this.chosen = this.list.find(v => v.voiceURI === uri) || this.chosen; S.voiceURI = this.chosen ? this.chosen.voiceURI : ""; save(); },
  forSpeech,
  stop() { this.token++; clearTimeout(this.safety); clearTimeout(this.fake); this.timers.forEach(clearTimeout); this.timers = []; this.srcs.forEach(x => { try { x.stop(); } catch (e) {} }); this.srcs = []; MOUTH.frames = null; try { speechSynthesis.cancel(); } catch (e) {} this.talking = false; },
  // where Rex is, for positioned sound (called every frame)
  place(x, y, z, cam) {
    if (!voicePan) return; const t = AC.currentTime;
    voicePan.positionX.setTargetAtTime(x, t, .05); voicePan.positionY.setTargetAtTime(y, t, .05); voicePan.positionZ.setTargetAtTime(z, t, .05);
    const L = AC.listener; if (L.positionX) { L.positionX.value = cam.position.x; L.positionY.value = cam.position.y; L.positionZ.value = cam.position.z; cam.getWorldDirection(_fw); L.forwardX.value = _fw.x; L.forwardY.value = _fw.y; L.forwardZ.value = _fw.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  },
  // mouth shape right now, from the pre-computed loudness/brightness of the clip that is playing
  sample() {
    const decay = () => { MOUTH.open *= .8; MOUTH.wide *= .8; MOUTH.round *= .8; MOUTH.press *= .8; return MOUTH; };
    if (!MOUTH.frames || !AC) return decay();
    // per-sound mouth shapes, timed from the voice model's own durations (open, wide, round, pressed)
    const C = ASSETS.voice.channels || 2, f = Math.floor((AC.currentTime - MOUTH.t0) * ASSETS.voice.fps), fr = MOUTH.frames;
    if (f < 0 || f * C + C - 1 >= fr.length) return decay();
    MOUTH.open = fr[f * C] / 255; MOUTH.wide = fr[f * C + 1] / 255;
    if (C >= 4) { MOUTH.round = fr[f * C + 2] / 255; MOUTH.press = fr[f * C + 3] / 255; } else { MOUTH.round = MOUTH.open * (1 - MOUTH.wide); MOUTH.press = 0; }
    return MOUTH;
  },
  clipsFor(sentences) { if (!ASSETS.voice || !this.chosen || !this.chosen.neural) return null; const ids = sentences.map(t => lineId(t)); return ids.every(id => ASSETS.voice.lines[id]) ? ids : null; },
  // cb: { onSentence(i), onWord(i,len), onDone() }
  say(sentences, cb = {}) {
    this.stop(); const tok = this.token; const synth = window.speechSynthesis;
    const finish = () => { if (tok !== this.token) return; clearTimeout(this.safety); this.talking = false; MOUTH.frames = null; cb.onDone && cb.onDone(); };
    const ids = S.voice ? this.clipsFor(sentences) : null;
    if (ids && ctx()) {
      ids.forEach(ensureVoice);
      // natural pacing: a short breath between sentences, a longer one after a question
      let i = 0; const next = () => {
        if (tok !== this.token) return; if (i >= ids.length) { finish(); return; }
        const idx = i++, id = ids[idx], meta = ASSETS.voice.lines[id], buf = VBUF[id];
        if (!buf) { this.timers.push(setTimeout(() => { i--; next(); }, 60)); return; }
        const src = AC.createBufferSource(); src.buffer = buf; src.connect(voiceIn); const t0 = AC.currentTime + .03; src.start(t0); this.srcs = [src];
        this.talking = true; MOUTH.t0 = t0; MOUTH.frames = Uint8Array.from(atob(meta.m), c => c.charCodeAt(0));
        cb.onSentence && cb.onSentence(idx);
        const words = sentences[idx].split(/\s+/); const total = words.reduce((t, w) => t + w.length + 2, 0); let acc = 0;
        words.forEach(w => { const at = acc / total * meta.d * 1000; acc += w.length + 2; this.timers.push(setTimeout(() => { if (tok === this.token) cb.onWord && cb.onWord(idx, w.length); }, at + 30)); });
        src.onended = () => { if (tok !== this.token) return; MOUTH.frames = null; const gap = /\?$/.test(sentences[idx]) ? 420 : 200 + Math.random() * 120; this.timers.push(setTimeout(next, idx === ids.length - 1 ? 0 : gap)); };
      };
      next(); this.safety = setTimeout(finish, ids.reduce((t, id) => t + ASSETS.voice.lines[id].d, 0) * 1000 + ids.length * 600 + 5000);
      return;
    }
    const sysVoice = this.chosen && this.chosen.neural ? this.list.find(v => !v.neural) : this.chosen;
    if (!(S.voice && synth && sysVoice)) {
      let i = 0; const next = () => { if (tok !== this.token) return; if (i >= sentences.length) { finish(); return; } const idx = i++; this.talking = true; cb.onSentence && cb.onSentence(idx); this.fake = setTimeout(next, Math.max(1500, sentences[idx].split(/\s+/).length * 340)); };
      next(); return;
    }
    let total = 0;
    // Chrome can drop an utterance queued right after cancel(); give it a beat first
    this.fake = setTimeout(() => { if (tok !== this.token) return; sentences.forEach((text, idx) => {
      const u = new SpeechSynthesisUtterance(this.forSpeech(text)); u.voice = sysVoice; u.lang = sysVoice.lang; u.rate = .98; u.pitch = .92;
      u.onstart = () => { if (tok !== this.token) return; this.talking = true; cb.onSentence && cb.onSentence(idx); };
      u.onboundary = e => { if (tok !== this.token) return; if (!e.name || e.name === "word") cb.onWord && cb.onWord(idx, e.charLength || 4); };
      if (idx === sentences.length - 1) { u.onend = finish; u.onerror = finish; }
      (this._keep = this._keep || []).push(u); synth.speak(u);
    }); this._keep = this._keep.slice(-20); }, 70);
    sentences.forEach(text => { total += text.split(/\s+/).length; });
    this.safety = setTimeout(finish, total * 600 + 6000);
  }
};
const _fw = new THREE.Vector3();

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

// boardroom layout (metres): you sit at the head of the table; the screen is on the back wall; Rex enters through a door in the left wall
const DOOR_X = -4.0, DOOR_Z = -3.7, OFF = { x: -5.3, z: -3.7 }, INSIDE = { x: -3.4, z: -3.7 };
const MARK = { x: 1.35, z: -3.2 }, SCREEN_SPOT = { x: 2.3, z: -4.75 };
const SCREEN_POS = new THREE.Vector3(0, 1.8, -5.52);
const THEMES = {
  classic: { accent: 0xe7b24c, wall: "#3a1626", wallRough: .95, floor: () => woodTex("#7a4a2a", "40,20,8", 7), floorRough: .38, ambient: 0xffe2c4, ground: 0x2a1408, key: 0xffd9a8, strip: 0xffb35c, backlight: 0xfff1d8, jacket: 0x3a2260 },
  boardroom: { accent: 0x7cc6ea, wall: "#2a3540", wallRough: .5, floor: () => noiseTex("#5b6168", .08, 11, 512), floorRough: .22, ambient: 0xcfe6ff, ground: 0x1a222b, key: 0xeaf4ff, strip: 0x9fdcff, backlight: 0xe8f6ff, jacket: 0x1c2c45 },
  arena: { accent: 0xff5fa8, wall: "#1a0b28", wallRough: .8, floor: () => noiseTex("#0c0710", .05, 5, 512), floorRough: .12, ambient: 0xd9b8ff, ground: 0x12051e, key: 0xffe6f4, strip: 0xff5fa8, backlight: 0xd2fff9, jacket: 0x281247 }
};

function initGL(hooks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  Object.values(ASSETS.tex).forEach(t => { t.anisotropy = maxAniso; });
  let dpr = Math.min(1.5, devicePixelRatio || 1); renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.prepend(renderer.domElement); renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050406); scene.fog = new THREE.Fog(0x050406, 14, 30);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, .05, 60);
  const camBase = new THREE.Vector3(0, 1.28, 3.05); camera.position.copy(camBase);
  const WIDE_LOOK = new THREE.Vector3(.35, 1.45, -4.6);

  // ----- room: the boardroom, modelled and lit in Blender (tools/blender/build_boardroom.py); its lighting is baked into lightmaps -----
  const room = new THREE.Group(); scene.add(room);
  const baked = []; const TX = ASSETS.tex;
  const tiled = (t, rep = 1) => { if (!t) return null; const c = t.clone(); c.flipY = false; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rep, rep); c.anisotropy = maxAniso; c.needsUpdate = true; return c; };
  const lmTex = n => { const t = ASSETS.lm[n]; if (!t) return null; t.flipY = false; t.channel = 2; /* TEXCOORD_2 = the bake UVs */ t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; };
  function bakedMat(hex, map, lm, gain = 1) { if (map) map.channel = 1;   // TEXCOORD_1 = world-scale tiling UVs
    const m = new THREE.MeshBasicMaterial({ color: hex, map: map || null, lightMap: lmTex(lm), lightMapIntensity: (ASSETS.lmScale[lm] || 1) * Math.PI * gain }); m.userData.base = m.color.clone(); baked.push(m); return m; }
  // world-scale UVs for live furniture so wood grain and leather keep their real size
  function boxUV(mesh, size) { const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2); mesh.updateMatrixWorld(true); const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld); n.fromBufferAttribute(N, i).applyMatrix3(nm); const ax = Math.abs(n.x) > Math.abs(n.y) ? (Math.abs(n.x) > Math.abs(n.z) ? 0 : 2) : (Math.abs(n.y) > Math.abs(n.z) ? 1 : 2); const [a, b] = ax === 0 ? [v.z, v.y] : ax === 1 ? [v.x, v.z] : [v.x, v.y]; uv[i * 2] = a / size; uv[i * 2 + 1] = b / size; }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); }
  const M_LIVE = {
    walnut: new THREE.MeshPhysicalMaterial({ color: 0xa87452, map: tiled(TX.walnut_diff), normalMap: tiled(TX.walnut_nor_gl), roughnessMap: tiled(TX.walnut_rough), roughness: .66, clearcoat: .14, clearcoatRoughness: .3, specularIntensity: .35, envMapIntensity: .6 }),
    lacquer: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: .28, metalness: 0, envMapIntensity: .8 }),
    leather: new THREE.MeshPhysicalMaterial({ specularIntensity: .6, sheen: .3, sheenColor: new THREE.Color(0x8a5a48), sheenRoughness: .5, color: 0x4a1d1a, map: tiled(TX.leather_diff, 1), normalMap: tiled(TX.leather_nor_gl, 1), roughnessMap: tiled(TX.leather_rough, 1), roughness: .8, envMapIntensity: .3 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb8925a, metalness: 1, roughness: .28, envMapIntensity: 1.1 })
  };
  if (ASSETS.room) new GLTFLoader().parse(ASSETS.room.slice(0), "", g => {
    const r = g.scene; room.add(r); r.updateMatrixWorld(true);
    r.traverse(o => { if (!o.isMesh) return; let top = o; while (top.parent && top.parent !== r) top = top.parent; const obj = top.name, mn = o.material.name;
      if (/^Floor/.test(obj)) o.material = mn === "Rug" ? bakedMat(0x9a4a48, tiled(TX.velvet_diff), "Floor", .8) : bakedMat(0x7a5a44, tiled(TX.parquet_diff), "Floor", .85);
      else if (/^Walls/.test(obj)) o.material = mn === "Brass" ? bakedMat(0xd8b06c, null, "Walls", 1.0) : mn === "Lacquer" ? bakedMat(0x161515, null, "Walls", 1.0) : bakedMat(0x6a4d3e, tiled(TX.walnut_diff), "Walls", 1.0);
      else if (/^Ceiling/.test(obj)) o.material = bakedMat(0x4a4540, null, "Ceiling", 1.0);
      else if (/^Cove/.test(obj)) { o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .72, .42).multiplyScalar(3.2) }); o.material.userData.base = o.material.color.clone(); baked.push(o.material); }
      else { o.material = /^TableTop/.test(obj) ? M_LIVE.walnut : mn === "Leather" ? M_LIVE.leather : mn === "Brass" ? M_LIVE.brass : M_LIVE.lacquer; boxUV(o, /^TableTop/.test(obj) ? 2.4 : .6); o.castShadow = true; o.receiveShadow = true; }
    });
    softenEnv(); later(400, captureRoomEnv);
  }, e => dbg("room " + (e && e.message)));
  /* reflections come from the room itself (walnut, brass, warm pendants), not a borrowed photo studio: one 256px capture at load */
  function captureRoomEnv() {
    try {
      const crt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType }); const cc = new THREE.CubeCamera(.05, 30, crt); cc.position.set(0, 1.45, .45);
      const hide = [rex, ...investors.map(i => i.holder)].filter(o => o.visible); hide.forEach(o => o.visible = false);
      for (let i = 0; i < baked.length; i++) baked[i].color.copy(baked[i].userData.base);
      cc.update(renderer, scene); hide.forEach(o => o.visible = true);
      const old = scene.environment; scene.environment = pmrem.fromCubemap(crt.texture).texture; scene.environmentIntensity = 1.1; crt.dispose(); if (old && old !== scene.environment) old.dispose();
    } catch (e) { dbg("env " + e.message); }
  }
  /* a framed abstract print on the right wall, lit by its own picture light (painted into the image, no real-time light) */
  { const aw = 1.15, ah = .82, art = canvasTex(920, 656, (g, w, h) => {
      g.fillStyle = "#cdbfa8"; g.fillRect(0, 0, w, h); const r = rnd(41);
      const blobs = [["#1d2a3f", .38], ["#7a2e2a", .22], ["#b58a4a", .18], ["#3d4a3c", .12], ["#2a2224", .2]];
      for (let i = 0; i < 70; i++) { const [c, a] = blobs[Math.floor(r() * blobs.length)]; g.globalAlpha = a * (.4 + r() * .6); g.fillStyle = c; g.beginPath(); const x = w * (.15 + r() * .7), y = h * (.12 + r() * .76), rw = 30 + r() * 170, rh = 12 + r() * 60; g.ellipse(x, y, rw, rh, (r() - .5) * .7, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1; const lt = g.createLinearGradient(0, 0, 0, h); lt.addColorStop(0, "rgba(255,230,190,.10)"); lt.addColorStop(.45, "rgba(0,0,0,0)"); lt.addColorStop(1, "rgba(0,0,0,.45)"); g.fillStyle = lt; g.fillRect(0, 0, w, h); });
    const ag = new THREE.Group(); ag.position.set(3.93, 1.62, -2.3); ag.rotation.y = -Math.PI / 2; room.add(ag);
    const fr = std(0x1a1512, { roughness: .4 }); box(aw + .1, ah + .1, .04, fr, 0, 0, -.02, ag);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(aw, ah), new THREE.MeshBasicMaterial({ map: art, color: new THREE.Color(.3, .27, .24) })); mat.position.z = .002; ag.add(mat); mat.material.userData.base = mat.material.color.clone(); baked.push(mat.material);
    const bar = box(.5, .025, .05, M_LIVE.brass, 0, ah / 2 + .1, .06, ag); bar.castShadow = false; }
  // brass-and-glass pendants over the table: the warm points of light in the references
  const pendants = new THREE.Group(); scene.add(pendants); const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .78, .5).multiplyScalar(4) }); bulbMat.userData.base = bulbMat.color.clone(); baked.push(bulbMat);
  const globeMat = new THREE.MeshPhysicalMaterial({ color: 0xfff4e6, roughness: .08, metalness: 0, transparent: true, opacity: .22, envMapIntensity: 1.2, depthWrite: false });
  for (const z of [-1.0, .45, 1.9]) { const gp = new THREE.Group(); gp.position.set(0, 2.55, z); pendants.add(gp); gp.add(new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 24), globeMat)); gp.add(new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), bulbMat)); const rod = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .85, 8), M_LIVE.brass); rod.position.y = .6; gp.add(rod); const cap = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .05, 16), M_LIVE.brass); cap.position.y = .18; gp.add(cap); }
  const pendantLight = new THREE.PointLight(0xffcf98, 1.6, 6, 2); pendantLight.position.set(0, 2.3, .45); scene.add(pendantLight);
  // door into the room (left wall) and the lit corridor behind it for the entrance
  const doorW = 1.2, doorH = 2.45; const panelMat = std(0x0e0d0d, { roughness: .32, metalness: .2 });
  const doorL = box(.07, doorH, doorW / 2, panelMat, DOOR_X + .04, doorH / 2, DOOR_Z - doorW / 4, room);
  const doorR = box(.07, doorH, doorW / 2, panelMat, DOOR_X + .04, doorH / 2, DOOR_Z + doorW / 4, room);
  const seam = box(.01, doorH, .012, new THREE.MeshBasicMaterial({ color: 0x8a7a60 }), DOOR_X + .08, doorH / 2, DOOR_Z, room); seam.castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), glowMat); glow.rotation.y = Math.PI / 2; glow.position.set(DOOR_X - 1.32, 1.6, DOOR_Z); room.add(glow);
  const backLight = new THREE.PointLight(0xfff1d8, 0, 16, 2); backLight.position.set(DOOR_X - .8, 1.6, DOOR_Z); scene.add(backLight);
  const doorSpill = new THREE.SpotLight(0xfff1d8, 0, 18, .7, .6, 2); doorSpill.position.set(DOOR_X - .6, 2.3, DOOR_Z); doorSpill.target.position.set(-1.2, 0, DOOR_Z); scene.add(doorSpill, doorSpill.target);

  // ----- LED screen -----
  const scW = 3.7, scH = 2.06;
  const SCR_K = 1.6; const screenCanvas = document.createElement("canvas"); screenCanvas.width = Math.round(1280 * SCR_K); screenCanvas.height = Math.round(734 * SCR_K);
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = maxAniso; screenTex.generateMipmaps = true; screenTex.minFilter = THREE.LinearMipmapLinearFilter;
  const screenGroup = new THREE.Group(); screenGroup.position.copy(SCREEN_POS); room.add(screenGroup);
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screenGroup.add(screenMesh);
  const screenGlow = new THREE.PointLight(0x6fa8ff, 2.2, 7, 2); screenGlow.position.copy(SCREEN_POS).add(new THREE.Vector3(0, 0, -.12)); scene.add(screenGlow);
  // the screen is a real light source: a panel light the size of the screen falls on Rex and the floor
  RectAreaLightUniformsLib.init();
  window.__pit = {};
  const screenLight = new THREE.RectAreaLight(0xbcd2ff, 0, scW, scH); screenLight.position.set(0, 0, .02); screenLight.rotation.y = Math.PI; screenGroup.add(screenLight); window.__pit.screenLight = screenLight;
  // LED pixel grid up close, glass reflections on top
  const ledTex = canvasTex(8, 8, g => { g.fillStyle = "#fff"; g.fillRect(0, 0, 8, 8); g.fillStyle = "#8a8a8a"; g.fillRect(0, 6, 8, 2); g.fillRect(6, 0, 2, 8); }); ledTex.colorSpace = THREE.NoColorSpace; ledTex.wrapS = ledTex.wrapT = THREE.RepeatWrapping; ledTex.repeat.set(560, 320);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), new THREE.MeshBasicMaterial({ map: ledTex, blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false })); led.position.z = .002; screenGroup.add(led);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .04, metalness: 0, transparent: true, opacity: .16, envMapIntensity: 1.4, depthWrite: false })); glass.position.z = .004; screenGroup.add(glass);
  const glowTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(SCREEN_POS.x, .006, SCREEN_POS.z + 1.1); room.add(floorGlow);
  const screenLevel = { cur: 0, t: .35 };

  const brass = M_LIVE.brass;

  // desk items: each is a group; clickable meshes point at their group
  const _bx = new THREE.Box3(); const TOP = .76; const deskItems = new THREE.Group(); scene.add(deskItems); const clickables = [];
  const SEATED = [["louise", -1.0, .05, 1], ["josh", 1.0, 1.25, -1], ["martha", -1.0, -1.15, 1]];
  /* table dressing: a closed leather folder, pen and water glass at each investor's place, a carafe mid-table. Lived-in, not staged-empty. */
  { const props = new THREE.Group(); scene.add(props);
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .08, roughness: .04, metalness: 0, clearcoat: .6, clearcoatRoughness: .03, envMapIntensity: .9, depthWrite: false, side: THREE.DoubleSide });
    const waterM = new THREE.MeshPhysicalMaterial({ color: 0xbfd2d6, transparent: true, opacity: .12, roughness: .02, metalness: 0, envMapIntensity: 1.2, depthWrite: false });
    const penM = std(0x101012, { roughness: .3 });
    const glass = (x, z, h = .11, r = .033) => { const g = cyl(r, r * .88, h, glassM, x, TOP + h / 2, z, props, 20); g.castShadow = false; g.renderOrder = 2; const w = cyl(r * .9, r * .8, h * .55, waterM, x, TOP + h * .28, z, props, 20); w.castShadow = false; w.renderOrder = 2; };
    SEATED.forEach(([n, x, z, face], i) => { const px = x + face * .48, side = -face;
      const f = box(.24, .012, .32, M_LIVE.leather, px, TOP + .006, z - .02, props); f.rotation.y = (i - 1) * .06;
      const pen = cyl(.0045, .0045, .14, penM, px + side * -.15, TOP + .005, z - .02, props, 8); pen.rotation.set(Math.PI / 2, 0, .25 * side);
      glass(px + side * -.02, z + .24); });
    const car = cyl(.045, .06, .22, glassM, -.05, TOP + .11, .5, props, 24); car.castShadow = false; car.renderOrder = 2;
    const cw = cyl(.05, .055, .13, waterM, -.05, TOP + .065, .5, props, 24); cw.castShadow = false; cw.renderOrder = 2; }
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
    water(g) { const it = new THREE.Group(); it.position.set(0.468, TOP, 1.72); g.add(it); const gl = new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .14, 24, 1, true), glassMat()); gl.position.y = .07; it.add(gl); const w = cyl(.04, .035, .08, new THREE.MeshStandardMaterial({ color: 0x9ecbff, transparent: true, opacity: .35, roughness: .1 }), 0, .04, 0, it); w.castShadow = false; tag(it, "sip"); },
    notepad(g) { const it = new THREE.Group(); it.position.set(-0.27, TOP, 1.86); it.rotation.y = .12; g.add(it); box(.3, .012, .4, std(0xf3efe6, { roughness: .9 }), 0, .006, 0, it); const page = new THREE.Mesh(new THREE.PlaneGeometry(.28, .37), new THREE.MeshStandardMaterial({ map: notesTex, roughness: .9 })); page.rotation.x = -Math.PI / 2; page.position.y = .0125; it.add(page); const p = cyl(.008, .008, .26, std(0x111111, { metalness: .6, roughness: .3 }), .17, .016, -.02, it, 12); p.rotation.z = Math.PI / 2; p.rotation.y = .4; tag(it, "notes"); drawNotes(); },
    coffee(g) { const it = new THREE.Group(); it.position.set(0.312, TOP, 1.78); g.add(it); const mug = std(0xf2ede4, { roughness: .4 }); cyl(.042, .04, .1, mug, 0, .05, 0, it, 24); const h = new THREE.Mesh(new THREE.TorusGeometry(.028, .008, 8, 16), mug); h.position.set(.045, .05, 0); it.add(h); cyl(.038, .038, .004, std(0x3b2314, { roughness: .2 }), 0, .092, 0, it, 24).castShadow = false; tag(it, "sip"); },
    whiskey(g) { const it = new THREE.Group(); it.position.set(-0.492, TOP, 1.72); g.add(it); const tb = new THREE.Mesh(new THREE.CylinderGeometry(.045, .042, .085, 8, 1, true), glassMat()); tb.position.y = .043; it.add(tb); cyl(.04, .038, .04, new THREE.MeshStandardMaterial({ color: 0xc8771c, transparent: true, opacity: .75, roughness: .1 }), 0, .022, 0, it, 16).castShadow = false; box(.03, .03, .03, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .45, roughness: .05 }), .01, .045, 0, it).rotation.set(.4, .5, .2); tag(it, "whiskey");
      const bt = new THREE.Group(); bt.position.set(-0.588, TOP, 1.86); g.add(bt); const bm = new THREE.MeshStandardMaterial({ color: 0x7a3e10, transparent: true, opacity: .85, roughness: .1 }); cyl(.05, .05, .2, bm, 0, .1, 0, bt, 20); cyl(.05, .016, .05, bm, 0, .225, 0, bt, 20); cyl(.016, .016, .06, bm, 0, .28, 0, bt, 12); cyl(.018, .018, .02, std(0x2a1a0a), 0, .315, 0, bt, 12); cyl(.051, .051, .08, std(0xece2c8, { roughness: .8 }), 0, .09, 0, bt, 20); },
    stressball(g) { const it = new THREE.Group(); it.position.set(0.162, TOP, 1.7); g.add(it); sph(.042, std(0xff7a1a, { roughness: .8 }), 0, .042, 0, it, 24); [-1, 1].forEach(s => sph(.006, std(0x1a1a1a), s * .013, .052, .04, it, 8)); tag(it, "squish"); },
    duck(g) { const it = new THREE.Group(); it.position.set(-0.072, TOP, 1.74); it.rotation.y = -.5; g.add(it); const y = std(0xffd21f, { roughness: .45 }); sph(.045, y, 0, .035, 0, it, 20).scale.set(1.2, .85, 1); sph(.03, y, .035, .085, 0, it, 20); const beak = new THREE.Mesh(new THREE.ConeGeometry(.012, .03, 12), std(0xff7a00)); beak.rotation.z = -Math.PI / 2; beak.position.set(.07, .082, 0); it.add(beak); [-1, 1].forEach(s => sph(.005, std(0x111111), .055, .095, s * .014, it, 8)); tag(it, "squeak"); },
    plant(g) { const it = new THREE.Group(); it.position.set(0.588, TOP, 1.86); g.add(it); cyl(.06, .045, .09, std(0xb5562f, { roughness: .9 }), 0, .045, 0, it, 20); cyl(.055, .055, .01, std(0x3a2a1c), 0, .087, 0, it, 20); const cac = std(0x3f8f4a, { roughness: .7 }); cyl(.03, .03, .16, cac, 0, .17, 0, it, 14); sph(.03, cac, 0, .25, 0, it, 14); cyl(.016, .016, .07, cac, .04, .17, 0, it, 10).rotation.z = -.9; cyl(.016, .016, .05, cac, .065, .2, 0, it, 10); sph(.012, std(0xff6fae), 0, .282, 0, it, 10); },
    calculator(g) { const it = new THREE.Group(); it.position.set(0.043, TOP + .008, 1.95); it.rotation.y = -.15; g.add(it); box(.1, .016, .15, std(0x1d1d22, { roughness: .5 }), 0, 0, 0, it); box(.08, .004, .035, new THREE.MeshBasicMaterial({ color: 0xa8c49a }), 0, .009, -.045, it).castShadow = false; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) box(.016, .006, .016, std(q === 3 ? 0xe7b24c : 0x4a4a52), -.03 + q * .02, .01, -.01 + r * .022, it); tag(it, "tick"); }
  };
  function tag(group, kind) { group.userData.kind = kind; group.userData.home = { p: group.position.clone(), r: group.rotation.clone() }; group.traverse(o => { if (o.isMesh) { o.userData.owner = group; clickables.push(o); } }); }
  function setDesk(list) { while (deskItems.children.length) { const c = deskItems.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } clickables.length = 0; list.forEach(id => DESK[id] && DESK[id](deskItems)); deskItems.children.slice().forEach(gp => { _bx.setFromObject(gp); _bx.getSize(_v1); const b = blob(Math.max(_v1.x, _v1.z) * .75); b.position.set(gp.position.x, TOP + .002, gp.position.z); deskItems.add(b); }); deskItems.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } }); if (card) { card.userData.owner = { userData: { kind: "card" } }; clickables.push(card); } clickables.push(screenMesh); screenMesh.userData.owner = { userData: { kind: "screen" } }; }

  // ----- lights -----
  const hemi = new THREE.HemisphereLight(0xffe2c4, 0x1a0f08, 1.0); scene.add(hemi);
  const ambL = new THREE.AmbientLight(0xffffff, .2); scene.add(ambL);
  const key = new THREE.SpotLight(0xffd9a8, 0, 24, .42, .5, 2); key.position.set(.5, 3.32, -1.2); key.target.position.set(MARK.x, 0, MARK.z); key.angle = .55;
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02; key.shadow.radius = 3; key.shadow.camera.near = 1; key.shadow.camera.far = 12; scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xffe6cc, .55); fill.position.set(-1, 2.5, 4); scene.add(fill);
  const rim = new THREE.SpotLight(0xe4ecff, 20, 16, .5, .8, 2); rim.position.set(.9, 3.3, -5.3); rim.target.position.set(MARK.x, 1.3, MARK.z); scene.add(rim, rim.target);
  Object.assign(window.__pit, { scene, M_LIVE, key, rim, fill, hemi, ambL, renderer });
  const deskLamp = new THREE.PointLight(0xffd2a0, 1.1, 3, 2); deskLamp.position.set(0, 1.5, 2.6); scene.add(deskLamp);
  const canLights = []; const canMat = new THREE.MeshBasicMaterial({ color: 0 }); const CAN = new THREE.Color(0);
  const themeGroup = new THREE.Group(); scene.add(themeGroup); const strips = [], themeLights = [];
  // studio haze: soft light shafts under each ceiling can and a few drifting dust specks catching the light
  const beamTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(.5, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
  // soft volumetric look: brightest where you look straight through the beam, fading to nothing at its edges and toward the floor
  const beamMat = new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Color(0x5a4a38) }, opacity: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); vY = uv.y; gl_Position = projectionMatrix * viewMatrix * wp; }",
    fragmentShader: "uniform vec3 color; uniform float opacity; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.5); float a = f * pow(vY, 1.4) * opacity * 2.4; gl_FragColor = vec4(color * a, 1.0); }" });
  beamTex.dispose();
  const beams = new THREE.Group(); scene.add(beams);
  for (let i = 0; i < 7; i++) { const x = -3.6 + i * 1.2; const cone = new THREE.Mesh(new THREE.CylinderGeometry(.1, .95, 4.2, 24, 1, true), beamMat); cone.position.set(x, 4.33 - 2.1, -1.2); beams.add(cone); }
  const keyBeam = new THREE.Mesh(new THREE.CylinderGeometry(.08, 1.25, 4.8, 28, 1, true), beamMat.clone()); keyBeam.material.uniforms.color.value.setHex(0x6a5a44); beams.add(keyBeam);
  const dustN = 260, dustPos = new Float32Array(dustN * 3), dustSeed = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = -4 + Math.random() * 8; dustPos[i * 3 + 1] = .4 + Math.random() * 4; dustPos[i * 3 + 2] = -4.5 + Math.random() * 4.5; dustSeed[i] = Math.random() * 100; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustTex = canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dustTex, size: .012, color: 0xb8a68a, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); scene.add(dust); beams.visible = false; dust.visible = false;   // studio haze belongs to the old stage, not the boardroom

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
  rex.position.set(OFF.x, 0, OFF.z);

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
  const poreTex = (() => { const n = 256, d = new Uint8Array(n * n * 4), h = new Float32Array(n * n), r = rnd(7);
    for (let i = 0; i < 2600; i++) { const cx = r() * n, cy = r() * n, rad = 1 + r() * 1.6; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const q = Math.hypot(x, y) / rad; if (q < 1) { const X = (Math.floor(cx) + x + n) % n, Y = (Math.floor(cy) + y + n) % n; h[Y * n + X] -= (1 - q * q); } } }
    for (let i = 0; i < n * n; i++) h[i] += (r() - .5) * .25;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const H = (a, b) => h[((b + n) % n) * n + (a + n) % n]; const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1), o = (y * n + x) * 4; d[o] = 128 + Math.max(-127, Math.min(127, dx * 60)); d[o + 1] = 128 + Math.max(-127, Math.min(127, dy * 60)); d[o + 2] = 128 + Math.max(-127, Math.min(127, -H(x, y) * 70)); d[o + 3] = 255; }
    const t = new THREE.DataTexture(d, n, n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true; return t; })();
  const blobTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(.55, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const blob = r => { const b = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), blobMat); b.rotation.x = -Math.PI / 2; b.renderOrder = 1; return b; };
  const rexBlob = blob(.42); rexBlob.material = blobMat.clone(); scene.add(rexBlob);
  /* tight dark contact under each shoe: what makes a figure feel planted on the floor */
  const footMat = blobMat.clone(); footMat.opacity = .95; const footBlobs = [0, 1].map(() => { const b = new THREE.Mesh(new THREE.PlaneGeometry(.17, .3), footMat); b.rotation.x = -Math.PI / 2; b.renderOrder = 1; scene.add(b); return b; });
  const BLEND = .5;
  const GD = { beatAt: 0, prevOpen: 0, acked: false, next: 0, last: "", idleSwap: now() + 20000, layerAt: 0, glance: new THREE.Vector2(), glanceAt: 0, look: new THREE.Vector2() };
  if (ASSETS.glb) new GLTFLoader().parse(ASSETS.glb.slice(0), "", g => {
    try {
      const m = g.scene; m.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(m); const s = 1.8 / Math.max(.01, bb.max.y - bb.min.y); m.scale.multiplyScalar(s); m.position.y = -bb.min.y * s;
      rex.add(m); m.updateMatrixWorld(true);
      const modelMats = [];
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; const mm = o.material; mm.metalness = 0; mm.metalnessMap = null; mm.roughnessMap = null; mm.roughness = /hair|lash/i.test(o.name) ? .6 : .82; mm.envMapIntensity = .55; if (/hair|lash/i.test(o.name)) { mm.alphaTest = .45; mm.transparent = false; mm.side = THREE.DoubleSide; } if (!modelMats.includes(mm)) modelMats.push(mm); } });
      m.traverse(o => { if (o.isMesh && /Body/.test(o.name) && /Ch33_body/i.test(o.material.name)) { const src = o.material; o.material = skinMaterial(src); }
        if (o.isMesh && /hair|lash/i.test(o.name)) o.material = hairMaterial(o.material); });
      const B = n => m.getObjectByName(n);
      // face controls baked in Blender (tools/blender/face_rig.py): shape keys on the head, eye bones for gaze
      const face = []; m.traverse(o => { if (o.isMesh && o.morphTargetDictionary) face.push(o); });
      const bn = { eyeL: B("LeftEye"), eyeR: B("RightEye"), hips: B("Hips"), spine: B("Spine2"), neck: B("Neck"), head: B("Head"), uaR: B("RightArm"), laR: B("RightForeArm"), fR: B("RightHand"), uaL: B("LeftArm"), laL: B("LeftForeArm"), fL: B("LeftHand"), footL: B("LeftFoot"), footR: B("RightFoot"), tipL: B("LeftHandMiddle1") };
      if (["hips", "head", "neck", "uaR", "laR", "fR", "uaL", "laL", "fL", "footL", "footR", "tipL", "spine"].some(k => !bn[k])) throw new Error("rig");
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
      const eyeRest = [bn.eyeL, bn.eyeR].filter(Boolean).map(b => [b, b.quaternion.clone()]);
      const corneaMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .05, roughness: .02, metalness: 0, clearcoat: 1, clearcoatRoughness: .01, envMapIntensity: 1.6, depthWrite: false });
      [bn.eyeL, bn.eyeR].forEach(b => { if (!b) return; b.getWorldPosition(_v1); const c = new THREE.Mesh(new THREE.SphereGeometry(.0163, 24, 16), corneaMat); c.position.copy(_v1); rex.worldToLocal(c.position); rex.add(c); b.attach(c); });
      Object.assign(MODEL, { ready: true, restQ, eyeRest, face, m, bn, mixer, A, L, walk, cur: "Idle", oneShot: null, arms: { R: arm(), L: arm() } });
      mixer.addEventListener("finished", e => { if (MODEL.oneShot && e.action === A[MODEL.oneShot.name]) { const done = MODEL.oneShot.done; MODEL.oneShot = null; e.action.fadeOut(BLEND); A[MODEL.cur].reset().fadeIn(BLEND).play(); done && done(); } });
      softenEnv();
    } catch (err) { dbg("model err " + err.message); rex.children.forEach(c => { c.visible = true; }); MODEL.ready = false; }
  }, err => dbg("parse err " + (err && err.message)));
  function baseClip(name) { if (!MODEL.ready || MODEL.cur === name || !MODEL.A[name]) return; const a = MODEL.A[name]; a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(BLEND).play(); MODEL.A[MODEL.cur].fadeOut(BLEND); MODEL.cur = name; }
  function onceClip(name, done) { if (!MODEL.ready || !MODEL.A[name]) { done && done(); return; } const a = MODEL.A[name]; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.fadeIn(BLEND).play(); MODEL.A[MODEL.cur].fadeOut(BLEND); MODEL.oneShot = { name, done }; }
  function layer(name, w = 1) { const a = MODEL.ready && MODEL.L[name]; if (!a || now() < GD.layerAt) return; GD.layerAt = now() + 1500; a.reset().setEffectiveWeight(w * (name === "Nod" ? .45 : 1)).fadeIn(.25).play(); }
  // gesture director: picks the body clip from what Rex is doing, and never repeats the same talking gesture twice in a row
  function direct(t, walking, talking) {
    const Mo = MODEL; if (Mo.oneShot) return;
    if (walking) { baseClip("Walk"); return; }
    if (talking) { if (!Mo.cur.startsWith("Talk") || t > GD.next) { const opts = ["Talk1", "Talk2", "Talk3", "Talk4", "Talk5"].filter(n => n !== GD.last && Mo.A[n]); const n = opts[Math.floor(Math.random() * opts.length)]; GD.last = n; GD.next = t + 4200 + Math.random() * 2600; baseClip(n); } return; }
    // listening: acknowledge once, then a calm, attentive stance (not the chin-stroke every time)
    if (st.lk > .5) { if (!GD.acked && Mo.A.Ack) { GD.acked = true; onceClip("Ack"); return; } baseClip(Mo.A.Idle3 ? "Idle3" : Mo.A.Think ? "Think" : "Idle"); return; }
    GD.acked = false;
    if (t > GD.idleSwap) { GD.idleSwap = t + 14000 + Math.random() * 10000; const idles = ["Idle", "Idle2", "Idle3", "Idle4"].filter(n => Mo.A[n] && n !== Mo.cur); baseClip(idles[Math.floor(Math.random() * idles.length)] || "Idle"); return; }
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
    rotWorld(h, right, -GD.look.y * .5 - (.08 * st.mu - .04 * st.mc) - st.mOpen * .035);
    rotWorld(h, fwd, .1 * st.lk);
    if (talking && !walking && !Mo.oneShot) { const o = st.mOpen; if (o > .82 && GD.prevOpen <= .82 && t > GD.beatAt) { GD.beatAt = t + 1700 + Math.random() * 900; layer("Nod"); FX.bUp = Math.min(.6, FX.bUp + .25); } GD.prevOpen = o; }
    // slight lean in while you speak or type
    if (st.lk > .05) rotWorld(Mo.bn.spine, right, -.05 * st.lk);
    driveFace(dt, t, walking, talking);
  }
  // ----- face: speech-driven jaw and lips, mood on brows and mouth corners, natural blinks, eyes that look at you -----
  const FX = { jaw: 0, wide: 0, round: 0, press: 0, smile: 0, bUp: 0, bIn: 0, bDown: 0, blink: 0, blinkAt: now() + 1800, blinkT: -1, dbl: false, lookY: 0, lookP: 0 };
  function setMorph(name, v) { const F = MODEL.face; for (let i = 0; i < F.length; i++) { const d = F[i].morphTargetDictionary, k = d[name]; if (k !== undefined) F[i].morphTargetInfluences[k] = v; } }
  function driveFace(dt, t, walking, talking) {
    const Mo = MODEL; if (!Mo.face.length) return; const kk = x => Math.min(1, dt * x);
    const on = talking ? 1 : 0, open = st.mOpen * on;
    const jawT = open * .55; FX.jaw += (jawT - FX.jaw) * kk(jawT > FX.jaw ? 30 : 18);
    FX.wide += (st.mWide * on * .85 - FX.wide) * kk(22); FX.round += (st.mRound * on * .8 - FX.round) * kk(22);
    FX.press += (st.mPress * on - FX.press) * kk(30);
    FX.smile += ((.42 * st.mc + (talking ? .08 : .14)) * (1 - st.mu) - FX.smile) * kk(3);
    FX.bUp += ((.22 * st.mc + Math.min(.35, open * .25)) * (talking ? 1 : .4) - FX.bUp) * kk(6);
    FX.bIn += (.75 * st.mu - FX.bIn) * kk(3); FX.bDown += (.35 * st.lk - FX.bDown) * kk(3);
    // blinks: every few seconds, sometimes a double, quicker closing than opening
    if (FX.blinkT < 0 && t > FX.blinkAt) { FX.blinkT = 0; FX.dbl = Math.random() < .18; }
    if (FX.blinkT >= 0) { FX.blinkT += dt * 1000; const b = FX.blinkT; FX.blink = b < 70 ? b / 70 : b < 170 ? 1 - (b - 70) / 100 : 0; if (b >= 170) { if (FX.dbl) { FX.dbl = false; FX.blinkT = -1; FX.blinkAt = t + 120; } else { FX.blinkT = -1; FX.blinkAt = t + 2200 + Math.random() * 4200; } } }
    // eyes: aim at the target with the head doing the rest; small saccades from the glance offsets
    const tg = st.look > .5 ? SCREEN_POS : camera.position; let ey = 0, ep = 0;
    if (Mo.bn.eyeL && !walking) { Mo.bn.head.getWorldPosition(_v3); _v4.copy(tg).sub(_v3); const yawRel = angDiff(rex.rotation.y, Math.atan2(_v4.x, _v4.z)), pitch = Math.atan2(_v4.y, Math.hypot(_v4.x, _v4.z)); ey = Math.max(-.38, Math.min(.38, yawRel - GD.look.x * .8 + GD.glance.x * .8)); ep = Math.max(-.25, Math.min(.25, pitch - GD.look.y * .5 + GD.glance.y)); }
    const prevY = FX.lookY; FX.lookY += (ey - FX.lookY) * kk(22); FX.lookP += (ep - FX.lookP) * kk(22);
    if (Math.abs(ey - prevY) > .25 && FX.blinkT < 0 && Math.random() < .5) FX.blinkAt = t;   // big eye shifts often come with a blink
    Mo.eyeRest.forEach(([b, q]) => b.quaternion.copy(q));
    if (Mo.bn.eyeL) { const right = _v2.set(1, 0, 0).applyQuaternion(rex.quaternion); [Mo.bn.eyeL, Mo.bn.eyeR].forEach(b => { rotWorld(b, UP, FX.lookY); rotWorld(b, right, -FX.lookP); }); }
    const lidDown = Math.max(0, -FX.lookP) * .45;
    setMorph("jawOpen", FX.jaw * (1 - FX.press)); setMorph("mouthWide", FX.wide); setMorph("mouthRound", FX.round); setMorph("mouthPress", FX.press); setMorph("smile", FX.smile);
    setMorph("browsUp", FX.bUp); setMorph("browsInnerUp", FX.bIn); setMorph("browsDown", FX.bDown);
    setMorph("blinkL", Math.min(1, FX.blink + lidDown)); setMorph("blinkR", Math.min(1, FX.blink + lidDown));
  }
  // ----- silent investors at the table (Mixamo characters, seated idle); they glance at Rex now and then but never speak or react -----
  const investors = [];
  function loadInvestors() { SEATED.forEach(([n, x, z, face], idx) => fetch(`models/inv_${n}.json`).then(r => r.ok ? r.json() : null).then(j => { if (!j) return;
    const b = atob(j.glb); const buf = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) buf[i] = b.charCodeAt(i);
    new GLTFLoader().parse(buf.buffer, "", g => {
      const m = g.scene; m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); const s = 1.72 / Math.max(.01, bb.max.y - bb.min.y); m.scale.multiplyScalar(s);
      const holder = new THREE.Group(); holder.position.set(x - face * .04, 0, z); holder.rotation.y = face * Math.PI / 2; holder.add(m); scene.add(holder);
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material.metalness = 0; o.material.metalnessMap = null; o.material.roughnessMap = null; o.material.roughness = .85; o.material.envMapIntensity = .45; } });
      m.traverse(o => { if (!o.isMesh) return; if (/Body/.test(o.name) && /_body$/i.test(o.material.name)) o.material = skinMaterial(o.material); else if (/hair|lash/i.test(o.name)) o.material = hairMaterial(o.material);
        if (!o.material.userData.dim) { o.material.color.multiplyScalar(.88); o.material.userData.dim = true; } });
      const mixer = new THREE.AnimationMixer(m); const clip = g.animations[0]; if (clip) { const a = mixer.clipAction(clip); a.play(); a.time = (idx * 3.7) % clip.duration; a.timeScale = .9 + idx * .07; }
      investors.push({ mixer, head: m.getObjectByName("Head"), holder, look: 0, next: now() + 4000 + idx * 2500, want: 0 });
    }, e => dbg("investor " + (e && e.message)));
  }).catch(() => {})); }
  function updateInvestors(dt, t) {
    for (const iv of investors) {
      iv.mixer.update(dt);
      if (!iv.head) continue;
      if (t > iv.next) { iv.next = t + 3500 + Math.random() * 5000; iv.want = Math.random() < .65 && st.sil < .5 ? 1 : 0; }
      iv.look += (iv.want - iv.look) * Math.min(1, dt * 1.6);
      if (iv.look > .01) { iv.head.getWorldPosition(_v3); _v4.set(rex.position.x, 1.6, rex.position.z).sub(_v3); const yaw = angDiff(iv.holder.rotation.y, Math.atan2(_v4.x, _v4.z)); rotWorld(iv.head, UP, Math.max(-.9, Math.min(.9, yaw)) * .55 * iv.look); }
    }
  }
  function placeBlob() { const onDisc = Math.hypot(rex.position.x - MARK.x, rex.position.z - MARK.z) < 1.12; rexBlob.position.set(rex.position.x, rex.position.y + .004, rex.position.z); rexBlob.material.opacity = 1 - st.sil; rexBlob.visible = st.sil < .95;
    if (MODEL.ready) [MODEL.bn.footL, MODEL.bn.footR].forEach((f, i) => { f.getWorldPosition(_v1); const b = footBlobs[i]; b.position.set(_v1.x, rex.position.y + .005, _v1.z); b.rotation.z = -rex.rotation.y; const lift = Math.max(0, _v1.y - rex.position.y - .08); b.visible = rexBlob.visible; b.material.opacity = (1 - st.sil) * Math.max(0, 1 - lift * 8); }); }

  const SP = n => new Spring(0, n || 55, .7);
  const J = { a0x: SP(), a0z: SP(), e0: SP(), a1x: SP(), a1z: SP(), e1: SP(), lean: SP(40), tilt: SP(40), pitch: SP(40), yaw: new Spring(0, 30, .85) };
  const st = { sil: 1, walk: null, phase: 0, stepIdx: 0, speed: 0, heading: 0, talkAmp: 0, mouthPulse: 0, blinkAt: now() + 3000, bow: 0,
    pointing: false, mood: "neutral", mc: 0, mu: 0, listen: false, lk: 0, trickUntil: 0, fidget: null, nextFidget: now() + 9000, away: false, look: 0, cardPop: 1, mOpen: 0, mWide: 0, mRound: 0, mPress: 0 };

  function drawCard(big, small) {
    const g = cardCanvas.getContext("2d"); const w = 256, h = 360; const acc = "#" + THEMES.classic.accent.toString(16).padStart(6, "0");
    g.textAlign = "center"; g.fillStyle = "#f7f3ea"; g.fillRect(0, 0, w, h); g.strokeStyle = acc; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#2a1d40"; g.font = "800 " + (big.length > 5 ? 64 : 84) + "px 'Bricolage Grotesque', sans-serif"; g.fillText(big, w / 2, h / 2 + 18);
    g.font = "500 22px 'Lexend', sans-serif"; g.fillStyle = "#5b4a6b"; const words = small.split(" "); let line = "", y = h / 2 + 70;
    words.forEach(wd => { if (g.measureText(line + wd).width > w - 60) { g.fillText(line.trim(), w / 2, y); line = ""; y += 26; } line += wd + " "; }); g.fillText(line.trim(), w / 2, y);
    g.font = "700 20px 'Lexend', sans-serif"; g.fillStyle = acc; g.fillText("NVDA", w / 2, 60); cardTex.needsUpdate = true;
  }
  drawCard("?", "pick a card");

  // one cohesive boardroom (the old studio looks are retired)
  function applyTheme() { setLin(M.brass.color, 0xb8925a); M.brass.userData.base = M.brass.color.clone(); }

  // ----- screen: charts build, numbers count up, spoken value lights up -----
  const sc = { mode: "idle", visual: null, src: "", revealStart: 0, buildStart: 0, hl: -1 };
  // institutional presentation: charcoal-navy slide, takeaway headline, chart with periods and units, growth callouts, source and method notes
  const GOLD = "#c9a45c", GOLD2 = "#8a6a2e", INK = "#f2f4f7", SUB = "#9aa4b5", FAINT = "#5d6879";
  function drawScreen() {
    const g = screenCanvas.getContext("2d"); g.setTransform(SCR_K, 0, 0, SCR_K, 0, 0); const w = 1280, h = 734;
    const bgr = g.createLinearGradient(0, 0, 0, h); bgr.addColorStop(0, "#131c2b"); bgr.addColorStop(1, "#0b111c"); g.fillStyle = bgr; g.fillRect(0, 0, w, h);
    const caps = (t, x, y, size, color, align = "left") => { g.textAlign = align; g.fillStyle = color; g.font = `500 ${size}px 'Lexend', sans-serif`; g.letterSpacing = "2.5px"; g.fillText(t.toUpperCase(), x, y); g.letterSpacing = "0px"; g.textAlign = "left"; };
    if (sc.mode === "idle" || sc.mode === "standby") { caps(sc.mode === "standby" ? "Stand by" : "The Pit", w / 2, h / 2 + 8, 28, SUB, "center"); g.fillStyle = GOLD; g.fillRect(w / 2 - 50, h / 2 + 32, 100, 2); return; }
    if (sc.mode === "reveal") {
      const p = smoother(Math.min(1, (now() - sc.revealStart) / 1600));
      g.globalAlpha = p; g.fillStyle = INK; g.font = "700 170px 'Lexend', sans-serif"; g.textAlign = "center"; g.fillText("NVIDIA", w / 2, h / 2 + 30);
      g.fillStyle = GOLD; g.fillRect(w / 2 - 80 * p, h / 2 + 70, 160 * p, 2); caps("Nasdaq · NVDA · Investor presentation", w / 2, h / 2 + 120, 22, SUB, "center"); g.globalAlpha = 1; g.textAlign = "left"; return;
    }
    const v = sc.visual; if (!v) return; const bp = smoother(Math.min(1, (now() - sc.buildStart) / 1100));
    g.fillStyle = GOLD; g.fillRect(64, 44, 36, 3);
    caps(sc.src || "NVIDIA", 112, 52, 16, SUB);
    g.fillStyle = INK; g.font = "600 46px 'Lexend', sans-serif"; g.fillText(v.take || v.title, 64, 118);
    g.fillStyle = SUB; g.font = "400 23px 'Lexend', sans-serif"; g.fillText(v.title, 64, 156);
    const fmt = val => v.unit === "%" ? (Number.isInteger(val) ? Math.round(val) : val.toFixed(1)) + "%" : fmtB(val);
    if (v.type === "bars") {
      const n = v.items.length, max = Math.max(...v.items.map(i => i[1])); const top = 236, base = h - 148, left = 90, right = w - 90;
      const slot = (right - left) / n, bw = Math.min(150, slot * .5);
      g.fillStyle = "#26324a"; for (let k = 1; k <= 3; k++) g.fillRect(left - 20, base - (base - top - 40) * k / 3, right - left + 40, 1);
      g.fillStyle = "#3a465e"; g.fillRect(left - 20, base, right - left + 40, 2);
      const tops = [];
      v.items.forEach(([lab, val, hi], i) => {
        const k = smoother(Math.min(1, Math.max(0, bp * 1.4 - i * .12))), lit = sc.hl === i, gold = hi || lit;
        const cx = left + slot * (i + .5), bh = (base - top - 40) * val / max * k, x = cx - bw / 2, y = base - bh; tops.push([cx, y]);
        const gr = g.createLinearGradient(0, y, 0, base); if (gold) { gr.addColorStop(0, GOLD); gr.addColorStop(1, GOLD2); } else { gr.addColorStop(0, "#c9d1dc"); gr.addColorStop(1, "#5d6879"); }
        if (lit) { g.shadowColor = GOLD; g.shadowBlur = 26; }
        g.fillStyle = gr; g.fillRect(x, y, bw, bh); g.shadowBlur = 0;
        g.textAlign = "center"; g.fillStyle = gold ? GOLD : INK; g.font = "600 30px 'Lexend', sans-serif"; g.fillText(fmt(val * k), cx, y - 14);
        g.fillStyle = lit ? INK : SUB; g.font = "400 21px 'Lexend', sans-serif"; let L = lab; while (g.measureText(L).width > slot - 14 && L.length > 3) L = L.slice(0, -2) + "…"; g.fillText(L, cx, base + 36); g.textAlign = "left";
      });
      // growth between periods (our calculation), shown once the bars have built
      if (v.growth && bp > .95) for (let i = 1; i < v.items.length; i++) {
        const a = v.items[i - 1][1], b = v.items[i][1]; if (!a) continue; const pct = (b / a - 1) * 100, txt = (pct >= 0 ? "+" : "") + pct.toFixed(0) + "%";
        const mx = (tops[i - 1][0] + tops[i][0]) / 2, my = Math.min(tops[i - 1][1], tops[i][1]) - 62;
        g.font = "600 20px 'Lexend', sans-serif"; const tw = g.measureText(txt).width + 22; g.strokeStyle = "rgba(201,164,92,.6)"; g.lineWidth = 1.5; g.beginPath(); g.roundRect(mx - tw / 2, my - 22, tw, 32, 16); g.stroke();
        g.fillStyle = GOLD; g.textAlign = "center"; g.fillText(txt, mx, my); g.textAlign = "left";
      }
    } else {
      v.items.forEach((t, i) => { const y = 250 + i * 98; if (bp * v.items.length <= i * .8) return; const lit = sc.hl === i;
        g.fillStyle = lit ? GOLD : FAINT; g.font = "600 34px 'Lexend', sans-serif"; g.fillText(String(i + 1).padStart(2, "0"), 64, y);
        g.fillStyle = lit ? INK : "#c3cad6"; g.font = (lit ? "500" : "400") + " 32px 'Lexend', sans-serif"; g.fillText(t, 140, y);
        g.fillStyle = lit ? "rgba(201,164,92,.55)" : "#1f2a3d"; g.fillRect(140, y + 24, w - 204, 1); });
    }
    g.fillStyle = "#1f2a3d"; g.fillRect(64, h - 76, w - 128, 1);
    caps("Source: " + (sc.src || ""), 64, h - 44, 14, FAINT);
    if (v.growth || (sc.calc && sc.calc.length)) { g.fillStyle = FAINT; g.font = "400 15px 'Lexend', sans-serif"; g.textAlign = "right"; g.fillText("Growth rates and shares are our calculations from reported figures", w - 64, h - 44); g.textAlign = "left"; }
  }
  function setScreen(mode, visual, src, calc) {
    sc.calc = calc || null;
    sc.mode = mode; screenLevel.t = mode === "visual" ? .85 : mode === "reveal" ? 1 : .3; if (visual !== undefined) sc.visual = visual; if (src !== undefined) sc.src = src;
    sc.built = false; if (mode === "reveal") sc.revealStart = now(); if (mode === "visual") { sc.buildStart = now(); sc.hl = -1; }
    drawScreen(); screenTex.needsUpdate = true;
    const v = sc.visual;
    $("screen-sr").textContent = mode === "visual" && v ? "On screen: " + v.title + ". " + (v.type === "bars" ? v.items.map(i => i[0] + " " + (v.unit === "%" ? (Number.isInteger(i[1]) ? i[1] : i[1].toFixed(1)) + "%" : fmtB(i[1]))).join(", ") : v.items.join("; ")) : "";
  }
  function highlightFor(sentence) {
    const v = sc.visual; if (!v || sc.mode !== "visual") return; let idx = -1;
    if (v.type === "bars") v.items.forEach(([, val], i) => { const tokn = v.unit === "%" ? (Number.isInteger(val) ? val : val.toFixed(1)) + "%" : val.toFixed(1); if (idx < 0 && sentence.includes(tokn)) idx = i; });
    else { const m = sentence.match(/^(One|Two|Three|Four)\b/); if (m) idx = ["One", "Two", "Three", "Four"].indexOf(m[1]); }
    if (idx !== sc.hl) { sc.hl = idx; drawScreen(); screenTex.needsUpdate = true; }
  }

  const LIT = { act3: { hemi: .35, amb: .05, key: 34, fill: .12, rim: 14, cans: .25, strips: .3, desk: .5, room: .55 }, show: { hemi: 1.0, amb: .15, key: 26, fill: .55, rim: 10, cans: 1, strips: 1, desk: .9, room: 1 }, dim: { hemi: .08, amb: .02, key: 0, fill: 0, rim: 0, cans: .08, strips: .12, desk: .1, room: .07 } };
  const lightState = { cans: 1, strips: 1, canCur: 1, stripCur: 1, room: 1, roomCur: 1 };
  function lighting(preset, dur) { const p = LIT[preset]; tween(hemi, "intensity", p.hemi, dur); tween(ambL, "intensity", p.amb, dur); tween(key, "intensity", p.key, preset === "show" ? 60 : dur); tween(fill, "intensity", p.fill, dur); tween(rim, "intensity", p.rim, dur); tween(deskLamp, "intensity", p.desk, dur); lightState.cans = p.cans; lightState.strips = p.strips; lightState.room = p.room; if (dur <= 20) lightState.roomCur = p.room; }

  // ----- camera: you stay in the chair; the director changes where you look and how close -----
  let baseFov = 45;
  const cam = { lx: new Spring(WIDE_LOOK.x, 5, 1), ly: new Spring(WIDE_LOOK.y, 5, 1), lz: new Spring(WIDE_LOOK.z, 5, 1), fov: new Spring(45, 3.2, 1) };
  const shot = { name: "wide", push: 1, pushT: 1, fovAt: 0 }; const ST = [0, 0, 0, 0]; const tgt4 = (a, b, c, d) => { ST[0] = a; ST[1] = b; ST[2] = c; ST[3] = d; return ST; };
  const tmpV = new THREE.Vector3();
  function shotTarget() {
    const hx = rex.position.x, hz = rex.position.z;
    switch (shot.name) {
      case "rex": return tgt4(hx, 1.45, hz, baseFov * .34 * shot.push);
      case "mid": return tgt4(hx * .75, 1.4, hz + .5, baseFov * .5);
      case "two": return tgt4(hx * .55 + SCREEN_POS.x * .45, 1.62, hz * .55 + SCREEN_POS.z * .45, baseFov * .6);
      case "screen": return tgt4(SCREEN_POS.x, SCREEN_POS.y, SCREEN_POS.z, baseFov * .5);
      case "listen": return tgt4(hx, 1.45, hz, baseFov * .4);
      case "desk": return tgt4(0, .8, 1.6, baseFov);
      default: return tgt4(WIDE_LOOK.x, WIDE_LOOK.y, WIDE_LOOK.z, baseFov);
    }
  }
  // cut = a hard broadcast cut (camera jumps, focus pulls in); otherwise a glide
  function setShot(name, cut) {
    if (reduced && name !== "wide") name = name === "screen" ? "two" : "mid"; if (shot.name === name) return;
    shot.fovAt = now() + 250; shot.name = name;
    if (false) { /* hard cuts retired: every change of shot is a slow glide */ const tg = shotTarget(); [cam.lx, cam.ly, cam.lz].forEach((sp, i) => { sp.x = sp.t = tg[i]; sp.v = 0; }); cam.fov.x = cam.fov.t = tg[3]; cam.fov.v = 0; camera.fov = tg[3]; camera.updateProjectionMatrix(); shot.fovAt = 0; focus.cur = focus.cur * 1.6 + 1.5; }
  }
  const focus = { cur: 6 }; const _bd = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

  // ----- studio reflections and camera polish: light glow, depth blur in close-ups, vignette -----
  const pmrem = new THREE.PMREMGenerator(renderer);
  try { scene.environment = ASSETS.env ? pmrem.fromEquirectangular(ASSETS.env).texture : pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = ASSETS.env ? .45 : 1; } catch (e) {}
  let composer = null, bokeh = null, bloom = null, filmPass = null;
  try {
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt); composer.setPixelRatio(dpr);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .32, .5, 1.5); composer.addPass(bloom);
    const out = new OutputPass(); composer.addPass(out);
    /* vignette + colour grade folded into the output pass: warm midtones, slightly cool shadows, gentle film contrast, lifted blacks */
    out.material.fragmentShader = out.material.fragmentShader.replace(/(gl_FragColor = sRGBTransferOETF\( gl_FragColor \);\s*#endif)/, "$1\n vec3 c = gl_FragColor.rgb; vec2 vd = ( vUv - .5 ) * .95; c *= clamp( 1.0 - dot( vd, vd ) * .8, 0.0, 1.0 ); float l = dot( c, vec3( .2126, .7152, .0722 ) ); float sh = ( 1.0 - l ) * ( 1.0 - l ); float mid = 4.0 * l * ( 1.0 - l ); c *= mix( vec3( 1.0 ), vec3( .95, .99, 1.05 ), sh * .7 ); c *= mix( vec3( 1.0 ), vec3( 1.035, 1.0, .955 ), mid ); c = clamp( c, 0.0, 1.0 ); c = mix( c, c * c * ( 3.0 - 2.0 * c ), .16 ); c = mix( vec3( l ), c, .96 ); gl_FragColor.rgb = c * .985 + .012;");
    if (!/vec3 c = gl_FragColor/.test(out.material.fragmentShader)) dbg("grade not applied");
    // a light film look: fine moving grain and a hint of lens colour fringing toward the edges
    filmPass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: .022 }, ca: { value: .0016 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform sampler2D tDiffuse; uniform float time, grain, ca; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } void main(){ vec2 d = vUv - .5; float r2 = dot(d, d); vec2 o = d * ca * r2 * 4.0; vec3 c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b); float n = h(vUv * 1000.0 + fract(time) * 37.0) - .5; float l = dot(c, vec3(.299, .587, .114)); c += n * grain * (1.0 - l * .6); gl_FragColor = vec4(c, 1.0); }" });
    // film pass kept out of the chain: on an integrated GPU it cost a full-screen pass for little visible gain
  } catch (e) { composer = null; dbg("composer " + e.message); }
  /* skin: light bleeds a little past the shadow line in red (how real skin scatters light), pores break up the highlight */
  function skinMaterial(src) {
    const mat = new THREE.MeshPhysicalMaterial({ map: src.map, normalMap: src.normalMap, color: src.color, roughness: .5, metalness: 0, sheen: .18, sheenColor: new THREE.Color(0xb86a58), sheenRoughness: .6, envMapIntensity: .45, specularIntensity: .7 });
    mat.name = src.name + "_skin";
    mat.onBeforeCompile = sh => {
      sh.uniforms.poreMap = { value: poreTex };
      sh.fragmentShader = "uniform sampler2D poreMap;\n" + sh.fragmentShader
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n vec3 pore = texture2D( poreMap, vNormalMapUv * 190.0 ).xyz; roughnessFactor = clamp( roughnessFactor + ( pore.z - .5 ) * .22, .3, .75 );")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n normal = normalize( normal + vec3( ( pore.xy - .5 ) * .28, 0.0 ) );")
        .replace("#include <aomap_fragment>", "reflectedLight.indirectDiffuse += material.diffuseContribution * vec3( .3, .36, .46 ) * pow( saturate( dot( normal, normalize( vec3( .75, .15, .65 ) ) ) ), 1.5 ) * .55;\n#include <aomap_fragment>")
        .replace("#include <lights_physical_pars_fragment>", THREE.ShaderChunk.lights_physical_pars_fragment.replace(
          "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );",
          "float wN = dot( geometryNormal, directLight.direction ); vec3 wrapL = vec3( saturate( ( wN + .28 ) / 1.28 ), saturate( ( wN + .1 ) / 1.1 ), saturate( ( wN + .07 ) / 1.07 ) ); reflectedLight.directDiffuse += wrapL * wrapL * directLight.color * BRDF_Lambert( material.diffuseContribution );"));
    };
    return mat;
  }
  /* hair cards: soft strand edges, a highlight that runs along the strands (not a plastic blob), warm sheen where light grazes it */
  const hairCache = new Map();
  function hairMaterial(src) {
    if (hairCache.has(src)) return hairCache.get(src);
    const mat = new THREE.MeshPhysicalMaterial({ map: src.map, normalMap: src.normalMap, color: src.color, alphaTest: .3, alphaToCoverage: true, transparent: false, side: THREE.DoubleSide, roughness: .48, metalness: 0,
      specularIntensity: .45, sheen: .45, sheenColor: new THREE.Color(0x7a5a44), sheenRoughness: .35, envMapIntensity: .35 });
    mat.name = src.name + "_hair"; hairCache.set(src, mat); return mat;
  }
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
  function doors(open, dur = 1100) { if (!open && dur > 200) later(dur * .92, () => SFX.door()); const off = open ? .62 : 0; tween(doorL.position, "z", DOOR_Z - doorW / 4 - off, dur); tween(doorR.position, "z", DOOR_Z + doorW / 4 + off, dur); seam.visible = !open; }

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
    Voice.place(rex.position.x, 1.6, rex.position.z, camera); const mo = Voice.sample(); st.mOpen = mo.open; st.mWide = mo.wide; st.mRound = mo.round; st.mPress = mo.press;

    // lights
    screenLevel.cur += (screenLevel.t - screenLevel.cur) * k(2.2);
    screenLight.intensity = screenLevel.cur * .7 * (1 - st.sil); screenGlow.intensity = 1.1 * (.35 + .65 * screenLevel.cur);
    floorGlow.material.color.setRGB(.16 * screenLevel.cur, .21 * screenLevel.cur, .32 * screenLevel.cur);
    for (let i = 0; i < beams.children.length - 1; i++) beams.children[i].visible = lightState.canCur > .2;
    beamMat.uniforms.opacity.value = lightState.canCur;
    _bd.copy(key.target.position).sub(key.position).normalize(); keyBeam.quaternion.setFromUnitVectors(_up, _bd.negate()); keyBeam.position.copy(key.position).addScaledVector(_bd, -2.4); keyBeam.material.uniforms.opacity.value = Math.min(1, key.intensity / 28) * 1.1 * (1 - st.sil * .7);
    if (dust.visible && !reduced) { for (let i = 0; i < dustN; i++) { const j = i * 3; dustPos[j] += Math.sin(T * .13 + dustSeed[i]) * .0006; dustPos[j + 1] += Math.sin(T * .09 + dustSeed[i] * 1.7) * .0004 - .00008; dustPos[j + 2] += Math.cos(T * .11 + dustSeed[i]) * .0005; if (dustPos[j + 1] < .3) dustPos[j + 1] = 4.4; } dustGeo.attributes.position.needsUpdate = true; }
    // eyes adjusting: bright doorway or a darker act shifts exposure slowly, like a camera's auto-exposure
    const bright = key.intensity / 28 * .45 + hemi.intensity / 1.9 * .35 + backLight.intensity / 18 * .7 + .1;
    const expT = Math.max(.78, Math.min(1.3, .95 / Math.pow(Math.max(.3, bright), .3))); renderer.toneMappingExposure += (expT - renderer.toneMappingExposure) * k(.9);
    lightState.roomCur += (lightState.room - lightState.roomCur) * k(2.2); for (let i = 0; i < baked.length; i++) baked[i].color.copy(baked[i].userData.base).multiplyScalar(lightState.roomCur);
    lightState.canCur += (lightState.cans - lightState.canCur) * k(3); lightState.stripCur += (lightState.strips - lightState.stripCur) * k(3);
    canMat.color.copy(CAN).multiplyScalar(.15 + .85 * lightState.canCur);
    for (let i = 0; i < strips.length; i++) { const s = strips[i]; const pulse = S.studio === "arena" ? .75 + .25 * Math.sin(T * 2 + i) : 1; s.material.color.copy(s.userData.c).multiplyScalar(Math.max(.05, lightState.stripCur * pulse)); }
    for (let i = 0; i < themeLights.length; i++) themeLights[i].intensity = themeLights[i].userData.i0 * lightState.stripCur;
    for (let i = 0; i < mats.length; i++) { const m = mats[i]; if (m !== M.card) m.color.copy(m.userData.base).multiplyScalar(1 - st.sil * .97); }
    key.target.position.x += (rex.position.x - key.target.position.x) * k(2); key.target.position.z += (rex.position.z - key.target.position.z) * k(2);

    // performance layers
    const talking = Voice.talking; if (talking !== st.wasTalking) { st.wasTalking = talking; document.body.classList.toggle("speaking", talking); }
    st.talkAmp += ((talking ? 1 : 0) - st.talkAmp) * k(5);
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
    // keep redrawing until the build animation has fully finished, even if a slow frame skipped past its window
    if ((sc.mode === "reveal" || sc.mode === "visual") && !sc.built) { drawScreen(); screenTex.needsUpdate = true; if (t - (sc.mode === "reveal" ? sc.revealStart : sc.buildStart) > (sc.mode === "reveal" ? 1700 : 1300)) sc.built = true; }
    if (cardPivot && cardPivot.userData.s0) cardPivot.scale.copy(cardPivot.userData.s0).multiplyScalar(st.cardPop); else if (cardPivot) cardPivot.scale.set(st.cardPop, st.cardPop, 1);
    rex.position.y = 0;
    updateModel(dt, T, t, walking, talking); placeBlob(); updateInvestors(dt, t);
    if (composer && quality > 0) {
      
      tmpV.set(rex.position.x, 1.55 + rex.position.y, rex.position.z); focus.cur += (camera.position.distanceTo(tmpV) - focus.cur) * k(3.5);
      composer.render(dt);
    } else renderer.render(scene, camera);
    perfTick(t, dt);
    if (!firstFrame) { firstFrame = true; later(1200, loadInvestors); const v = document.getElementById("veil"); if (v) { v.classList.add("gone"); setTimeout(() => v.remove(), 1400); } }
    requestAnimationFrame(frame);
  }
  let firstFrame = false;
  const perf = { on: false, el: null, frames: 0, worst: 0, t0: now(), calls: 0, tris: 0 };
  renderer.info.autoReset = false;
  addEventListener("keydown", e => { if ((e.key === "p" || e.key === "P") && document.activeElement.tagName !== "INPUT") { perf.on = !perf.on; if (!perf.el) { perf.el = document.createElement("pre"); perf.el.style.cssText = "position:fixed;left:10px;top:10px;z-index:99;margin:0;padding:8px 10px;background:rgba(0,0,0,.72);color:#d8c69a;font:11px/1.45 ui-monospace,monospace;border-radius:8px;pointer-events:none"; document.body.appendChild(perf.el); } perf.el.hidden = !perf.on; } });
  function perfTick(t, dt) {
    perf.frames++; perf.worst = Math.max(perf.worst, dt * 1000); perf.calls = renderer.info.render.calls; perf.tris = renderer.info.render.triangles; renderer.info.reset();
    if (!perf.on || t - perf.t0 < 500) return;
    const fps = perf.frames * 1000 / (t - perf.t0), mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + " MB" : "n/a", m = renderer.info.memory;
    perf.el.textContent = `fps ${fps.toFixed(0)}   worst ${perf.worst.toFixed(0)} ms\ndraw calls ${perf.calls}   triangles ${(perf.tris / 1000).toFixed(0)}k\ngeometries ${m.geometries}   textures ${m.textures}\nJS heap ${mem}   voice clips decoded ${Object.keys(VBUF).length}\nquality ${quality}   pixel ratio ${dpr}`;
    perf.frames = 0; perf.worst = 0; perf.t0 = t;
  }
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
    const flap = talking && st.mOpen > 0 ? .25 + st.mOpen * .85 : talking ? (st.mouthPulse > 0 ? .35 + st.mouthPulse * .8 : .3 + .45 * Math.abs(Math.sin(T * 11) * .7 + Math.sin(T * 19) * .3)) : .22;
    mouth.scale.y += (flap - mouth.scale.y) * k(14); mouth.scale.x = 1.3 + .25 * st.mc - .25 * st.mu; mouth.position.y = -.11 + .006 * st.mc - .004 * st.mu;
    for (let i = 0; i < pupils.length; i++) pupils[i].position.y = -.004 * st.mu;
    if (t > st.blinkAt) { const bp = (t - st.blinkAt) / 140; eyes.scale.y = bp < 1 ? Math.max(.1, Math.abs(1 - bp * 2)) : 1; if (bp >= 1) st.blinkAt = t + 2500 + Math.random() * 3000; }
  }
  applyTheme(S.studio); softenEnv(); setScreen("idle", null, ""); lighting("show", 10); requestAnimationFrame(frame);
  setTimeout(() => { try { renderer.compile(scene, camera); } catch (e) {} }, 1500);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawScreen(); screenTex.needsUpdate = true; drawCard("?", "pick a card"); drawNotes(); });

  return {
    applyTheme(n) { applyTheme(n); softenEnv(); drawScreen(); screenTex.needsUpdate = true; },
    act(n) { lighting(n === 3 ? "act3" : "show", 900); },
    setDesk(l) { setDesk(l); softenEnv(); }, drawNotes, setScreen, highlightFor, setShot,
    screenImage() { return screenCanvas.toDataURL("image/png"); },
    word(n) { st.mouthPulse = Math.min(.9, .4 + n * .06); },
    present() { if (MODEL.ready && !st.pointing && !st.walk && !MODEL.oneShot && MODEL.A.Present && Math.random() < .5) onceClip("Present"); },
    mood(m) { if (m !== st.mood && MODEL.ready && Voice.talking) { if (m === "uneasy" && Math.random() < .6) layer("Shrug"); else if (m === "confident" && Math.random() < .3) layer("Nod"); } st.mood = m; },
    push(on) { shot.pushT = on ? .86 : 1; },
    listen(on) { st.listen = on; if (!busy && !Voice.talking) setShot(on ? "listen" : "mid"); },
    interrupt() { st.trickUntil = 0; },
    perform(item) {
      if (item.card) { drawCard(item.card[0], item.card[1]); st.trickUntil = now() + 1900; SFX.flick(); const ry = cardPivot.rotation.y; tween(cardPivot.rotation, "y", ry + Math.PI * 2, 700, 250, backOut); tween(st, "cardPop", 2.2, 380, 200, backOut); tween(st, "cardPop", 1, 450, 1700); }
      if (item.visual) {
        setShot("screen", Math.random() < .6); later(2100, () => setShot(st.pointing || st.walk ? "two" : "rex", Math.random() < .5));
        if (reduced) { rex.position.set(SCREEN_SPOT.x, 0, SCREEN_SPOT.z); st.pointing = true; st.away = true; }
        else { st.away = true; later(item.card ? 1200 : 0, () => walkTo(SCREEN_SPOT.x, SCREEN_SPOT.z, 1500, () => { st.pointing = true; })); }
      } else setShot("rex", Math.random() < .5);
    },
    finishAnswer() { shot.pushT = 1; later(1400, () => { if (Voice.talking || st.exiting) return; st.pointing = false; st.mood = "neutral"; setShot("mid"); if (st.away) { st.away = false; walkTo(MARK.x, MARK.z, 1500); } }); },
    entrance(onReady) {
      clearLater(); tweens.length = 0; st.pointing = false; st.away = false; st.exiting = false; st.mood = "neutral"; st.walk = null; setShot("wide");
      rex.position.set(OFF.x, 0, OFF.z); J.yaw.x = J.yaw.t = 0; st.sil = 1; st.bow = 0; doors(false, 1);
      backLight.intensity = 0; doorSpill.intensity = 0; glowMat.color.setScalar(0);
      if (reduced) { rex.position.set(MARK.x, 0, MARK.z); st.sil = 0; lighting("show", 10); setScreen("reveal"); later(300, onReady); return; }
      lighting("dim", 900); setScreen("standby"); Music.duck(0, 1.2);
      later(1200, () => { tween(backLight, "intensity", 18, 600); tween(doorSpill, "intensity", 30, 600); glowMat.color.setHex(THEMES.classic.backlight).multiplyScalar(3); SFX.whoosh(); doors(true, 1300); });
      later(2200, () => walkTo(INSIDE.x, INSIDE.z, 1400));
      later(3550, () => { SFX.arrive(); Music.start(); Music.duck(1, 4); key.intensity = LIT.show.key * 1.3; tween(key, "intensity", LIT.show.key, 900); tween(st, "sil", 0, 260); setScreen("reveal"); });
      later(3750, () => { lighting("show", 1400); walkTo(MARK.x, MARK.z, 2700, () => { if (MODEL.ready) onceClip("Bow"); }); });
      later(4600, () => { doors(false, 1200); tween(backLight, "intensity", 0, 1200); tween(doorSpill, "intensity", 0, 1200); later(1200, () => glowMat.color.setScalar(0)); });
      later(5600, () => setShot("mid"));
      later(MODEL.ready ? 8000 : 6600, onReady);
    },
    place() { rex.position.set(MARK.x, 0, MARK.z); st.sil = 0; st.exiting = false; setShot("mid"); },
    hide() { clearLater(); tweens.length = 0; st.walk = null; st.exiting = false; rex.position.set(OFF.x, 0, OFF.z); st.sil = 1; st.pointing = false; st.away = false; st.mood = "neutral"; doors(false, 1); lighting("show", 10); setShot("wide"); },
    exit(bow, onGone) {
      clearLater(); st.pointing = false; st.listen = false; st.away = false; st.exiting = true; st.mood = "neutral"; setShot("wide");
      const go = () => { glowMat.color.setHex(THEMES.classic.backlight).multiplyScalar(3); tween(backLight, "intensity", 12, 500); doors(true, 900); walkTo(INSIDE.x, INSIDE.z, 2600, () => walkTo(OFF.x, OFF.z, 1200, () => { doors(false, 900); tween(backLight, "intensity", 0, 900); later(900, () => glowMat.color.setScalar(0)); onGone && onGone(); })); };
      if (MODEL.ready && !reduced) { let went = false; const g2 = () => { if (!went) { went = true; go(); } }; st.mood = bow ? "confident" : "neutral"; onceClip(bow ? "Victory" : "Defeat", () => later(250, g2)); later(5200, g2); }
      else if (bow && !reduced) { st.mood = "confident"; tween(st, "bow", .45, 400); later(700, () => tween(st, "bow", 0, 400)); later(1300, go); } else go();
    }
  };
}

// ================= UI plumbing =================
const PANELS = ["m-decide", "m-transcript", "m-info", "m-settings", "m-notes", "m-chart", "m-portfolio"];
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
      else if (kind === "card" && current && current.item.card && !busy) { const [b, s] = current.item.card; speakLines(splitSentences(cardLine([b, s])), null); }
    },
    sip(kind) { if (kind === "whiskey" && !Voice.talking && !busy && $("bottom").hidden === false) later2(900, () => speakLines(splitSentences(pick(LINES.sips)), null)); }
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
        R.mood(UNEASY.test(plainS[i]) || (item && item.risk && i > 0) ? "uneasy" : "confident"); Music.duck(item && item.risk ? .35 : 1, 2);
        R.highlightFor(plainS[i]); R.push(/\d/.test(plainS[i])); if (i > 0 && /\$\d|\d%/.test(plainS[i]) && !(item && item.risk)) R.present();
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
  $("tx-src").innerHTML = item.src ? `<b>Sources</b> (verified ${VERIFIED}): ` + item.src.map(s => `<a href="${s.url}" target="_blank" rel="noopener">NVIDIA ${s.label}</a>${s.section ? `, ${esc(s.section)}` : ""}`).join("; ")
    + (item.calc ? `<br><b>Our calculations from reported figures:</b> ${item.calc.map(esc).join("; ")}` : "") : "";
  if (R && item.visual) R.setScreen("visual", item.visual, "NVIDIA " + item.src[0].label, item.calc);
  R && R.perform(item);
  if (item.card && item.id !== "hook") addNote(item);
  speakLines(raw, item, onDone);
}
function sayLine(line) { current = { item: { q: "Rex", a: line }, raw: [line] }; $("tx-title").textContent = "Rex"; $("tx-body").textContent = line; $("tx-src").textContent = ""; R && R.setShot("rex"); speakLines(splitSentences(line), null); }
function addNote(q) { if (S.notes.some(n => n.id === q.id)) return; S.notes.push({ id: q.id, s: q.s, big: q.note || q.card[0] }); save(); R && R.drawNotes(); }
function reactionFor(typed) { if (CHALLENGE.test(typed)) return pick(REACT.challenge); if (POSITIVE.test(typed)) return pick(REACT.positive); return Math.random() < .45 ? pick(REACT.neutral) : null; }
$("btn-replay").addEventListener("click", () => { if (!current || busy) return; if (current.item.visual && R) { R.setScreen("visual", current.item.visual, "NVIDIA " + current.item.src[0].label, current.item.calc); R.perform(current.item); } speakLines(current.raw, current.item); });
$("btn-transcript").addEventListener("click", () => { if (current) openPanel("m-transcript"); });

// ask box: rotating suggestions, listen pose, interrupt
const SUGGEST = () => PITCH.questions.filter(q => !S.asked.includes(q.id)).map(q => q.q).concat(["Explain that simpler", "What is gross margin?"]);
let sugI = 0; setInterval(() => { const inp = $("ask-input"); if (document.activeElement === inp && inp.value) return; const list = SUGGEST(); sugI = (sugI + 1) % list.length; inp.placeholder = list[sugI]; }, 3800);
$("ask-input").addEventListener("focus", () => R && R.listen(true));
$("ask-input").addEventListener("blur", () => R && R.listen(false));
$("ask-input").addEventListener("input", () => {
  if (Voice.talking && !interrupted && !busy && $("ask-input").value.length === 1) { interrupted = true; Voice.stop(); Captions.clear(); R && R.interrupt(); setTimeout(() => { Voice.say([LINES.goAhead], { onSentence() { Captions.start(LINES.goAhead); }, onDone() { setTimeout(() => Captions.clear(), 1200); } }); R && R.listen(true); }, 120); }
});
$("ask-form").addEventListener("submit", e => { e.preventDefault(); ask($("ask-input").value.trim()); });
// Act 2 opens with Rex asking you something; mid-grilling he flips it back on you
function act2() { if (busy || S.decided || S.skipped) return; R && R.act(2); later2(800, () => { if (busy) return; pending = "goodbad"; sayLine(LINES.goodBad); }); }
function maybeWorry() { if (worryAsked || S.asked.length < 3) return; worryAsked = true; later2(1300, () => { if (Voice.talking || busy || S.decided) return; pending = "worry"; sayLine(LINES.worry); }); }
// suggestion chips: shown when Rex needs you to pick, or a question is outside what he prepared
function suggest(list) {
  const box = $("suggest"); if (!list || !list.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.innerHTML = list.map(q => `<button type="button" class="sugg" data-id="${q.id}">${esc(q.q)}</button>`).join(""); box.hidden = false;
}
$("suggest").addEventListener("click", e => { const b = e.target.closest(".sugg"); if (!b) return; const q = PITCH.questions.find(x => x.id === b.dataset.id); suggest(null); if (q && !busy) { mark(q); present(q, q.q, false, null, maybeWorry); } });
const unasked = () => PITCH.questions.filter(q => !S.asked.includes(q.id));
function ask(typed) {
  if (busy) return; if (!typed) { $("ask-input").focus(); return; }
  $("ask-input").value = ""; R && R.listen(false); suggest(null);
  const p = pending; pending = null;
  if (p === "goodbad") {
    if (/\b(bad|worst|negative|downside|risks?|ugly)\b/i.test(typed)) { const q = PITCH.questions.find(x => x.id === "risk"); mark(q); present(q, typed, false, LINES.badFirst, maybeWorry); return; }
    if (/\b(good|best|positive|upside|great)\b/i.test(typed)) { const q = PITCH.questions.find(x => x.id === (S.asked.includes("growth") ? "profit" : "growth")); mark(q); present(q, typed, false, LINES.goodFirst, maybeWorry); return; }
  }
  const r = interpret(typed);
  if (r.kind === "advice") { sayLine(LINES.advice); return; }
  if (r.kind === "define") { sayLine(glossaryLine(r.term)); return; }
  if (r.kind === "simpler" || r.kind === "follow") { const target = r.q || (current && current.item.simple ? current.item : null); if (target && target.simple) { mark(target); present(target, typed, true); return; } }
  if (r.kind === "answer") { mark(r.q); present(r.q, typed, false, reactionFor(typed), maybeWorry); return; }
  if (r.kind === "clarify") { sayLine(LINES.clarify); suggest(r.options); return; }
  sayLine(LINES.outside); suggest(unasked().slice(0, 3));
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
  $("offer-msg").textContent = ""; Voice.stop(); Captions.clear(); openPanel("m-decide"); R && R.act(3); R && R.setShot("rex"); Music.duck(0, 1.5);   // a moment of quiet for the decision
});
document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => { $("offer-amount").value = Number(c.dataset.amt).toLocaleString("en-US"); }));
$("offer-form").addEventListener("submit", e => {
  e.preventDefault(); const msg = $("offer-msg");
  const amt = Number(($("offer-amount").value || "").replace(/[^\d.]/g, "")); const avail = START - committed();
  if (!amt || amt <= 0) { msg.textContent = "Enter an amount, for example 250,000."; return; }
  if (amt > avail) { msg.textContent = `You have ${fmtUSD(avail)} left.`; return; }
  S.offers.push({ ticker: PITCH.ticker, company: PITCH.company, amount: Math.round(amt), reason: $("offer-reason").value.trim(), date: new Date().toLocaleDateString("en-CA") }); updateCash();
  S.decided = "in"; save(); $("offer-amount").value = ""; $("offer-reason").value = "";
  wrapUp(`You're in on NVIDIA for ${fmtUSD(amt)} of play money.`, true);
});
$("btn-out").addEventListener("click", () => { S.decided = "out"; save(); wrapUp("You're out on NVIDIA.", false); });
function wrapUp(text, bow) {
  SFX.tension(false); closePanels(); busy = true; R && R.act(2); const line = bow ? LINES.deal : LINES.noDeal;
  if (bow) SFX.confirm(); else SFX.pass(); later2(2500, () => Music.duck(1, 3));
  speakLines(splitSentences(line), null);
  const done = () => nextPitch(text);
  R ? R.exit(bow, done) : setTimeout(done, 1500);
}
// ----- lineup: after each decision the pitcher leaves and the next company comes in; passed companies are gone for the session -----
const LINEUP = [PITCH];
function nextPitch(text) {
  if (!S.done.includes(PITCH.ticker)) S.done.push(PITCH.ticker); save();
  const next = LINEUP.find(c => !S.done.includes(c.ticker));
  R && R.setScreen("standby");
  if (next) { /* a second company plugs in here in Phase 2 */ }
  later2(1600, () => { R && R.setScreen("idle", null, ""); busy = false; showDone(text); });
}
function showDone(text) {
  $("done-title").textContent = "That's tonight's lineup";
  $("done-text").textContent = text;
  $("done-pos").innerHTML = portfolioHTML(false);
  $("m-done").hidden = false; $("bottom").hidden = true; Captions.clear();
}
$("btn-skip").addEventListener("click", () => {
  if (busy) return; S.skipped = true; save(); Voice.stop(); Captions.clear(); busy = true; closePanels();
  const done = () => nextPitch("You passed on NVIDIA. Skipped companies are gone for this session.");
  R ? R.exit(false, done) : done();
});
function reset() {
  const keep = { desk: S.desk, captions: S.captions, gate: S.gate, studio: S.studio, voice: S.voice, sfx: S.sfx, voiceURI: S.voiceURI, offers: S.offers };
  suggest(null);
  S = Object.assign(blank(), keep); save(); Voice.stop(); Captions.clear(); clearLater(); busy = false; current = null; pending = null; worryAsked = false; SFX.tension(false); closePanels();
  $("m-done").hidden = true; $("bottom").hidden = true; $("btn-start").hidden = false;
  if (R) { R.hide(); R.setScreen("idle", null, ""); R.drawNotes(); }
  updateDecide();
}
// ----- portfolio: cash, holdings, your reasons; selling returns the amount invested until licensed prices are connected -----
function updateCash() { $("open-portfolio").textContent = fmtUSD(START - committed()); }
function portfolioHTML(withSell) {
  const rows = S.offers.map((o, i) => `<div class="hold"><div><b>${esc(o.company || o.ticker)}</b> <span>${esc(o.ticker)}</span><small>${o.date ? "Invested " + esc(o.date) : ""}${o.reason ? " · “" + esc(o.reason) + "”" : ""}</small></div><b>${fmtUSD(o.amount)}</b>${withSell ? `<button class="btn" type="button" data-sell="${i}">Sell</button>` : ""}</div>`).join("");
  return `<div class="pf-sum"><div><span>Cash</span><b>${fmtUSD(START - committed())}</b></div><div><span>Invested</span><b>${fmtUSD(committed())}</b></div></div>` + (rows || `<p>No holdings yet.</p>`);
}
function openPortfolio() { $("pf-body").innerHTML = portfolioHTML(true); openPanel("m-portfolio"); }
$("open-portfolio").addEventListener("click", openPortfolio);
$("pf-body").addEventListener("click", e => { const b = e.target.closest("[data-sell]"); if (!b) return; const o = S.offers.splice(Number(b.dataset.sell), 1)[0]; save(); updateCash(); $("pf-body").innerHTML = portfolioHTML(true); toast(`Sold ${o.ticker}. ${fmtUSD(o.amount)} back to cash.`); });
$("btn-reset").addEventListener("click", reset); $("btn-reset-2").addEventListener("click", reset);
$("btn-start").addEventListener("click", () => {
  ctx(); audio(); ambience(S.sfx); try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
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
$("voice-pick").addEventListener("change", e => { Voice.pick(e.target.value); Voice.say([LINES.pick]); });
$("voice-test").addEventListener("click", () => Voice.say(splitSentences(LINES.test)));
const deskBoxes = [...document.querySelectorAll("#deskgrid input")];
deskBoxes.forEach(b => { b.checked = S.desk.includes(b.value); b.addEventListener("change", () => { S.desk = deskBoxes.filter(x => x.checked).map(x => x.value); save(); R && R.setDesk(S.desk); }); });
$("open-info").addEventListener("click", () => openPanel("m-info"));
$("open-settings").addEventListener("click", () => openPanel("m-settings"));
$("gate-age").addEventListener("change", e => { $("gate-enter").disabled = !e.target.checked; });
$("gate-enter").addEventListener("click", () => { S.gate = true; save(); $("m-gate").hidden = true; $("btn-start").focus(); });

// init
$("cap-on").checked = S.captions; $("voice-on").checked = S.voice; $("sfx-on").checked = S.sfx; $("m-gate").hidden = !!S.gate;
setStudio(S.studio); R && R.setDesk(S.desk); updateDecide(); updateCash();
if (S.started && !S.skipped && !S.decided) { $("btn-start").hidden = true; $("bottom").hidden = false; R && R.place(); R && R.setScreen("reveal"); }
else if (S.decided || S.skipped) { S.started = false; S.skipped = false; S.decided = null; S.asked = []; S.notes = []; S.done = []; save(); updateDecide(); }
addEventListener("pointerdown", () => { if (S.started && S.sfx) { audio(); ambience(true); } }, { once: true });
Voice.init();
})();
