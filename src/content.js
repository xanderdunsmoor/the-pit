// ================= CONTENT: NVIDIA, from its SEC filings =================
export const SRC_Q = { label: "10-Q, fiscal Q2 2027", url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm" };
export const SRC_K = { label: "10-K, fiscal 2026", url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm" };
export const GLOSSARY = {
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
export const PITCH = {
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
export const REACT = {
  challenge: ["Fair hit.", "Tough one. I respect that.", "I was hoping you'd push on that."],
  positive: ["Glad you noticed.", "Now you're seeing the trick."],
  neutral: ["Watch closely.", "Let me show you.", "Ah. Good card to pull."]
};
export const CHALLENGE = /(too much|a lot of|worr|concern|really\?|seriously|risky|scary|expensive|overvalued|bubble|why should|prove|doubt|skeptic|dangerous|yikes|sketchy|suspicious|not sure)/i;
export const POSITIVE = /(impressive|wow|nice|amazing|love|cool|great|incredible|awesome)/i;


// Every fixed line Rex can say outside the answers (each one is pre-rendered with the neural voice)
export const LINES = {
  goAhead: "Go ahead, shark.",
  goodBad: "So, shark. Good news or bad news first?",
  worry: "Let me flip it. What worries you most, shark? The customers, the debt, or China?",
  badFirst: "Bad news first. Brave.",
  goodFirst: "Good news it is.",
  advice: "I can't tell you whether to invest, shark. That's your call, and tonight it's play money. I can show you the numbers and the risks so you can decide.",
  outside: "That one's outside my act tonight. Ask me what NVIDIA sells, how fast it's growing, its profits, its debt, where the money goes, who the customers are, its cash flow, or what could go wrong.",
  deal: "A pleasure doing business, shark.",
  noDeal: "Fair enough. The show goes on.",
  sips: ["Liquid courage. Bold move, shark.", "Easy now. I need you sharp.", "Pour one for the tariffs."],
  test: "Good evening, shark. This is how I'll sound for every answer tonight.",
  pick: "Rex Voltaire, at your service."
};
export const glossaryLine = term => `${term.charAt(0).toUpperCase() + term.slice(1)}. ${GLOSSARY[term]}`;
export const cardLine = ([b, s]) => `${b}. ${s.charAt(0).toUpperCase() + s.slice(1)}.`;
export const splitSentences = t => t.split(/(?<=[^A-Z][.!?])\s+(?=[A-Z0-9“"$\[])/);
export const plain = t => t.replace(/\[\[([^\]]+)\]\]/g, "$1");
// how a sentence is read aloud (shared by the browser voice and the pre-render script)
export const forSpeech = t => t.replace(/\$([\d.]+) billion/g, "$1 billion dollars").replace(/\$([\d.]+)B\b/g, "$1 billion dollars").replace(/(\d+)\.0 billion/g, "$1 billion").replace(/≈/g, "about");
// every sentence Rex can speak, as the exact strings passed to the voice
export function allSentences() {
  const out = new Set(); const addText = t => splitSentences(t).forEach(x => out.add(plain(x)));
  [PITCH.hook, ...PITCH.questions].forEach(q => { addText(q.a || q.text); addText(q.simple); if (q.card) addText(cardLine(q.card)); });
  Object.values(REACT).flat().forEach(addText);
  Object.values(LINES).flat().forEach(addText);
  Object.keys(GLOSSARY).forEach(k => addText(glossaryLine(k)));
  return [...out];
}
// stable short id for a sentence (FNV-1a), used as the audio file name
export function lineId(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
