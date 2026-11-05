// ================= QUESTION MATCHING: natural language -> prepared, sourced answers =================
// Three outcomes: a confident answer, a clarifying question when two topics compete or the signal is weak,
// or "outside what I prepared". It never stretches to an unrelated answer just because one word overlaps.
import { PITCH, GLOSSARY } from "./content.js";

// [pattern, weight]: a pattern with a space is a phrase; a single word is a stem (matches the start of a word, typos allowed)
export const INTENTS = {
  sell: [["what do you sell", 6], ["what do they sell", 6], ["what does nvidia do", 6], ["what does nvidia sell", 6], ["what do you do", 6], ["what do they do", 6], ["what does the company do", 6], ["what does it do", 5], ["what do they make", 6], ["what do you make", 6], ["how do they make money", 9], ["how does nvidia make money", 9], ["how do you make money", 9], ["how does it make money", 9], ["make money from", 4], ["business model", 6], ["revenue come from", 6], ["sales come from", 6], ["money come from", 5], ["what is nvidia", 6], ["what kind of company", 6], ["main business", 5], ["actually do", 5], ["company do", 5], ["guys make", 5], ["guys do", 5], ["graphics card", 5], ["product", 5], ["sell", 3], ["gpu", 2], ["data center", 3], ["datacenter", 3], ["hyperscal", 4], ["segment", 3], ["edge computing", 4]],
  growth: [["grow", 4], ["fast", 2], ["trend", 3], ["increase", 2], ["last year", 2], ["history", 2], ["bigger", 3], ["double", 3], ["year over year", 4], ["sales up", 4], ["revenue up", 4], ["expand", 3], ["shrink", 4], ["slowing", 3], ["how big", 3], ["how much revenue", 4], ["total revenue", 4], ["growth", 4], ["revenue", 2], ["sales", 2]],
  profit: [["profit", 4], ["profitable", 2], ["earn", 3], ["eps", 4], ["net income", 5], ["actually make money", 6], ["do they make money", 6], ["does nvidia make money", 6], ["do you make money", 6], ["does it make money", 6], ["making money", 4], ["losing money", 6], ["lose money", 6], ["bottom line", 4], ["income", 2], ["each dollar", 5], ["per dollar", 4]],
  margin: [["margin", 6], ["pricing power", 6], ["markup", 4], ["cost to make", 3], ["gross", 3], ["rising or falling", 3]],
  debt: [["debt", 6], ["borrow", 5], ["loan", 4], ["owe", 2], ["liabilit", 4], ["balance sheet", 4], ["bond", 4], ["leverage", 4], ["cash on hand", 4], ["cash in the bank", 4], ["how much cash do", 4], ["equity", 2], ["borrowing too much", 6], ["in the red", 2]],
  spend: [["spend", 4], ["r&d", 5], ["r and d", 5], ["research", 4], ["expense", 4], ["costs", 3], ["where does the money go", 7], ["where does your money go", 7], ["where does nvidia's money go", 7], ["where does nvidias money go", 7], ["money go", 4], ["invest in", 3], ["reinvest", 4], ["salar", 3], ["employees", 2], ["operating expenses", 5], ["buyback", 2]],
  customers: [["customer", 5], ["who buys", 6], ["buyer", 4], ["client", 4], ["concentrat", 4], ["depend on", 3], ["who pays", 4], ["receivable", 4], ["who do they sell to", 7], ["who do you sell to", 7], ["sell to", 3], ["big tech", 3], ["outside the us", 3], ["international", 3], ["overseas", 3], ["countries", 3], ["foreign", 3]],
  cash: [["cash flow", 7], ["cashflow", 7], ["real cash", 6], ["real money", 4], ["paper", 3], ["on paper", 4], ["real or", 2], ["operating cash", 6], ["generate", 3], ["cash", 2], ["afford", 4], ["pay for", 3], ["fund", 3], ["money coming in", 5], ["coming in", 5], ["bring in", 3]],
  competition: [["compet", 6], ["rival", 6], ["amd", 6], ["intel", 6], ["huawei", 6], ["other companies make", 4], ["anyone else", 4], ["alternative", 4], ["who else", 4], ["threat", 2], ["own chips", 4], ["google", 3], ["alphabet", 3], ["amazon", 3], ["microsoft", 3], ["copy", 3], ["catch up", 4], ["beat them", 4]],
  moat: [["different", 5], ["special", 4], ["advantage", 6], ["moat", 7], ["cuda", 7], ["unique", 5], ["stand out", 5], ["why would anyone buy", 7], ["why buy from", 6], ["why do people buy", 6], ["why would anyone", 5], ["why choose", 5], ["edge over", 5], ["secret sauce", 6], ["better than", 4], ["so good", 4], ["software", 4], ["dominant", 4], ["dominate", 4], ["so successful", 5], ["choose", 4], ["prefer", 4]],
  china: [["china", 7], ["chinese", 7], ["hong kong", 5], ["export", 5], ["h200", 5], ["h20", 5], ["ban", 3], ["restrict", 4], ["sanction", 4], ["trade war", 5], ["geopolit", 4]],
  makers: [["who makes", 5], ["who builds", 5], ["who actually makes", 7], ["manufactur", 7], ["factory", 5], ["factories", 5], ["fabless", 7], ["tsmc", 7], ["samsung", 4], ["supplier", 6], ["supply chain", 6], ["produce", 3], ["build the chips", 6], ["make the chips", 6], ["make their chips", 6], ["make its chips", 6], ["memory", 3], ["taiwan", 3], ["chips made", 6], ["where are they made", 6]],
  otherincome: [["other income", 8], ["investment gains", 7], ["money from investments", 7], ["from investments", 6], ["gains", 3], ["stakes", 5], ["investments", 3], ["all of their profit", 6], ["all their profit", 6], ["all of the profit", 6], ["all of nvidia's profit", 6], ["all of nvidias profit", 6], ["profit come from", 5], ["one time", 3], ["non operating", 5], ["just from chips", 5], ["only from chips", 5], ["from selling chips", 4]],
  dividend: [["dividend", 8], ["pay shareholders", 7], ["pay its shareholders", 7], ["pay their shareholders", 7], ["pay investors", 6], ["payout", 5], ["return cash", 5], ["give back", 4], ["buyback", 5], ["buy back", 5], ["repurchas", 5], ["shareholder", 3], ["investors get paid", 7], ["get paid", 4]],
  risk: [["risk", 6], ["wrong", 5], ["downside", 6], ["worry", 3], ["worried", 3], ["concern", 3], ["problem", 3], ["danger", 4], ["bear case", 6], ["catch", 3], ["weakness", 6], ["weak spot", 6], ["tariff", 4], ["inventory", 4], ["threat", 3], ["bad", 2], ["fail", 3], ["scared", 3], ["what happens if", 4], ["slow down", 4], ["slows down", 4], ["demand", 3], ["crash", 4], ["collapse", 4], ["go under", 4], ["bankrupt", 4], ["red flag", 6], ["uncertain", 3]]
};
// common voice-transcription and spelling slips
const FIX = [[/\b(in video|invidia|envidia|nvidea|nvida|nividia|n video|en video|nvdia|nvida's)\b/g, "nvidia"], [/\bare and d\b/g, "r and d"], [/\b(cooda|kuda|coda)\b/g, "cuda"], [/\b(t s m c|tsm)\b/g, "tsmc"], [/\ba m d\b/g, "amd"], [/\bdividen\b/g, "dividend"], [/\bcostumer/g, "customer"]];
export const SIMPLER = /(simpl|don'?t (get|understand)|confus|eli5|plain english|in english|dumb it down|easier|what does that mean|lost me|explain (that|it|again)|i'?m (new|a beginner)|in normal words|like i'?m five)/i;
export const FOLLOW = /^(why|how so|so what|tell me more|go on|more|explain more|elaborate|what do you mean|meaning|and)\??$/i;
export const ADVICE = /(should i (buy|invest|sell|get)|is (it|this|nvidia|nvda|the stock) a (good|bad|smart) (buy|investment|stock|idea)|worth (buying|investing)|will (it|the stock|nvda|nvidia|the price|shares) (go|rise|fall|drop|keep)|price target|buy or sell|good investment|how much should i|recommend|stock price|share price|what'?s the price|is it overvalued|is it cheap)/i;
const DEFINE = /(what(?:'s| is| are| does)|define|meaning of|explain)\s+(?:a |an |the )?([a-z&\- ]{2,40}?)(?:\s+mean)?\??$/i;

export function normalize(text) {
  let t = " " + String(text).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9&'\s]/g, " ").replace(/\s+/g, " ").trim() + " ";
  FIX.forEach(([a, b]) => { t = t.replace(a, b); });
  return t;
}
// edit distance that counts a swap of two neighbouring letters ("grwoth", "rsik") as one slip
function lev(a, b) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = [];
  for (let i = 0; i <= m; i++) { d[i] = [i]; for (let j = 1; j <= n; j++) d[i][j] = i ? 0 : j; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
  return d[m][n];
}
function stemHit(tokens, stem) {
  for (const w of tokens) {
    if (w.startsWith(stem)) return true;
    if (stem.length >= 5 && w.length >= stem.length - 1) { const tol = stem.length >= 10 ? 2 : 1; for (let L = stem.length - 1; L <= stem.length + 1; L++) if (lev(w.slice(0, L), stem) <= tol) return true; }
    else if (stem.length === 4 && w.length === 4 && w[0] === stem[0] && lev(w, stem) <= 1) return true;
  }
  return false;
}
export function scoreAll(text) {
  const t = normalize(text), tokens = t.trim().split(" ");
  return Object.entries(INTENTS).map(([id, list]) => {
    let s = 0; for (const [p, w] of list) if (p.includes(" ") ? t.includes(" " + p + " ") || t.includes(" " + p) : stemHit(tokens, p)) s += w;
    return [id, s];
  }).sort((a, b) => b[1] - a[1]);
}
export function glossaryHit(text) {
  const m = text.trim().match(DEFINE); const cand = m ? m[2].toLowerCase().trim() : text.toLowerCase().trim(); const keys = Object.keys(GLOSSARY);
  return keys.find(k => cand === k || cand === k + "s" || cand.replace(/s$/, "") === k) || (m ? keys.find(k => cand.includes(k)) : null) || null;
}
const byId = id => PITCH.questions.find(q => q.id === id);
// returns { kind: "answer"|"clarify"|"define"|"advice"|"simpler"|"follow"|"none", q?, options?, term? }
export function interpret(text) {
  const raw = String(text || "").trim(); if (!raw) return { kind: "none", options: [] };
  if (ADVICE.test(raw)) return { kind: "advice" };
  if (FOLLOW.test(raw)) return { kind: "follow" };
  const sc = scoreAll(raw), [bestId, best] = sc[0], second = sc[1][1];
  const mentionsCo = /\b(you|your|nvidia|nvda|company|they|their|its|it's|this quarter|last quarter|this year|last year|now|currently|trend)\b/i.test(raw);
  const term = glossaryHit(raw);
  if (SIMPLER.test(raw)) return { kind: "simpler", q: best >= 4 ? byId(bestId) : null };
  if (term && (best < 6 || !mentionsCo)) return { kind: "define", term };
  if (best >= 4 && (second < 3 || best - second >= 3 || best >= second * 1.6)) return { kind: "answer", q: byId(bestId) };
  if ((best >= 3 && second < 2) || (best >= 2 && second === 0)) return { kind: "answer", q: byId(bestId) };   // weak but unambiguous
  if (best >= 2) return { kind: "clarify", options: sc.filter(([, s]) => s >= Math.max(2, best * .5)).slice(0, 3).map(([id]) => byId(id)) };
  return { kind: "none", options: [] };
}
