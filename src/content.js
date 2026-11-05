// ================= CONTENT: NVIDIA, from its SEC filings =================
// Every figure below was checked against the filing text on VERIFIED. "calc" lists numbers we derived from reported figures.
export const VERIFIED = "2026-11-04";
const Q = "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm";
const K = "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm";
const src10Q = section => ({ label: "Form 10-Q · quarter ended Jul 26, 2026", section, url: Q });
const src10K = section => ({ label: "Form 10-K · fiscal year ended Jan 25, 2026", section, url: K });
export const SRC_Q = src10Q(""), SRC_K = src10K("");
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
  "tariff": "A tax charged on goods when they are imported into a country.",
  "dividend": "A cash payment a company makes to its shareholders, usually every quarter.",
  "fabless": "A chip company that designs its chips but pays other companies to manufacture them.",
  "other income": "Money a company earns outside its main business, such as interest or gains on investments it holds."
};
const INC = src10Q("Condensed Consolidated Statements of Income"), BAL = src10Q("Condensed Consolidated Balance Sheets"), CF = src10Q("Condensed Consolidated Statements of Cash Flows");
export const PITCH = {
  company: "NVIDIA", ticker: "NVDA", pitcher: "Rex Voltaire",
  // the pitcher's voice; provider can later be "elevenlabs" or "azure" (see tools/render-voice.py)
  voice: { provider: "kokoro", voice: "am_michael*.6+am_onyx*.4", speed: 1.0, deepen: .97 },
  hook: { id: "hook", q: "The opening pitch",
    text: "Good evening, shark. I'm Rex Voltaire, and tonight I'm pitching NVIDIA. We design the chips that train and run artificial intelligence, and the world's biggest tech companies buy them by the warehouse. Last quarter we brought in $96.2 billion in [[revenue]], more than double a year ago, and kept about 62 cents of every dollar as profit. The catch? Five customers account for about 70% of the money owed to us. If they slow down, so could we.",
    simple: "I'm Rex, pitching NVIDIA. They make the chips that power AI. Sales more than doubled in a year, to about $96 billion in three months, and they keep most of it as profit. But a handful of giant customers make up a lot of the business, which is risky.",
    card: ["$96.2B", "revenue, one quarter"],
    calc: ["62 cents = net income $59.7B ÷ revenue $96.2B", "About 70% = 22% + 14% + 13% + 11% + 10% of accounts receivable"],
    visual: { take: "Quarterly revenue more than doubled", growth: true, type: "bars", title: "Quarterly revenue, $ billions", unit: "B", items: [["Apr–Jul 2025", 46.743], ["Apr–Jul 2026", 96.221, true]] }, src: [INC, src10Q("Notes, concentration of credit risk")] },
  questions: [
    { id: "sell", q: "What does NVIDIA sell?", s: "What it sells", card: ["93%", "of sales from data centers"],
      a: "Chips and complete computer systems for artificial intelligence. Last quarter our [[data center]] business brought in $89.0 billion of our $96.2 billion in [[revenue]], about 93% of everything. More than half of that came from [[hyperscalers]], the giant cloud companies. A smaller category, edge computing, added $7.2 billion. That focus is a strength while AI spending booms, and a weak spot if it slows.",
      simple: "NVIDIA makes the super-powerful chips that AI runs on. About 93 cents of every dollar it earns comes from selling them to companies that build AI data centers.",
      calc: ["93% = $89.0B ÷ $96.2B", "More than half = hyperscale $48.7B of data center $89.0B (55%)"],
      visual: { take: "Data centers drive 93% of revenue", type: "bars", title: "Revenue by market, Apr–Jul 2026, $B", unit: "B", items: [["Hyperscale", 48.710, true], ["AI clouds, industrial, enterprise", 40.313], ["Edge computing", 7.198]] }, src: [src10Q("Note 13, revenue by market platform")] },
    { id: "growth", q: "How fast is NVIDIA growing?", s: "Growth", card: ["+106%", "revenue vs a year ago"],
      a: "Fast. Revenue for the quarter ended July 26, 2026 was $96.2 billion, up 106% from $46.7 billion a year earlier. For the full [[fiscal year]] that ended January 25, 2026, revenue was $215.9 billion, up 65% from $130.5 billion. Two years before that, it was $60.9 billion. Growth that fast is rare for a company this size, but it also sets a very high bar to keep clearing.",
      simple: "Sales more than doubled in one year. Three years ago NVIDIA sold about $61 billion worth of products in a year. Last year it sold about $216 billion.",
      calc: ["More than tripled = $215.9B ÷ $60.9B (3.5×)", "106% = $96.2B ÷ $46.7B − 1"],
      visual: { take: "Annual revenue more than tripled in two years", growth: true, type: "bars", title: "Full-year revenue, $ billions", unit: "B", items: [["Fiscal 2024", 60.922], ["Fiscal 2025", 130.497], ["Fiscal 2026", 215.938, true]] }, src: [src10K("Consolidated Statements of Income; MD&A summary"), INC] },
    { id: "profit", q: "Is NVIDIA profitable?", s: "Profit", card: ["62¢", "profit per $1 of sales"],
      a: "Very. On $96.2 billion of revenue last quarter, our [[gross margin]] was 75%, [[operating income]] was $63.7 billion and [[net income]] was $59.7 billion. That's about 62 cents of profit on every dollar of sales. Diluted earnings per share were $2.46, up from $1.08 a year ago. Profit that high gives a company room to keep investing even if prices come down.",
      simple: "After paying for everything, including making the chips, salaries and taxes, NVIDIA kept about 62 cents of every dollar customers paid.",
      calc: ["75% gross margin = gross profit $72.1B ÷ revenue $96.2B", "62 cents = net income ÷ revenue"],
      visual: { take: "62 cents of every sales dollar became profit", type: "bars", title: "From sales to profit, Apr–Jul 2026, $B", unit: "B", items: [["Revenue", 96.221], ["Gross profit", 72.142], ["Operating income", 63.734], ["Net income", 59.688, true]] }, src: [INC] },
    { id: "debt", q: "How much debt does NVIDIA carry?", s: "Debt", card: ["$33.4B", "total debt"],
      a: "More than we used to. Our total debt was $33.4 billion on July 26, 2026, up from $8.5 billion six months earlier, roughly four times as much. $32.4 billion of it is [[long-term debt]], not due within a year. We held $22.4 billion in cash and cash equivalents, not counting marketable securities, which are reported separately. Shareholders' equity was $229.0 billion. We also have a $25 billion commercial paper program with nothing borrowed under it. The company is far bigger than its debt, but it now has much more to repay or refinance.",
      simple: "NVIDIA borrowed a lot more this year. Its debt went from about $8.5 billion to about $33.4 billion in six months. That's a fast jump, even though the company is much bigger than its debt.",
      calc: ["Roughly four times = $33.4B ÷ $8.5B"],
      visual: { take: "Debt roughly quadrupled in six months", growth: true, type: "bars", title: "Total debt, $ billions", unit: "B", items: [["Jan 25, 2026", 8.468], ["Jul 26, 2026", 33.366, true]] }, src: [src10Q("Note 9, debt (net carrying amount)"), BAL] },
    { id: "spend", q: "Where does NVIDIA's money go?", s: "Spending", card: ["$7.1B", "R&D, one quarter"],
      a: "Into inventing the next chip, and into our own stock. We spent $7.1 billion on [[research and development]] last quarter, up 64% from a year ago, and total operating expenses rose 55%. In the first half of this fiscal year we also spent $39.0 billion on share repurchases, a [[buyback]]. Research protects our lead; buybacks hand cash back to shareholders instead of growing the business.",
      simple: "NVIDIA spends billions every quarter designing new chips. It's also using a lot of cash to buy back its own shares.",
      calc: ["64% = R&D $7.05B ÷ $4.29B − 1"],
      visual: { take: "R&D spending up 64% in a year", growth: true, type: "bars", title: "R&D spending per quarter, $ billions", unit: "B", items: [["Apr–Jul 2025", 4.291], ["Apr–Jul 2026", 7.054, true]] }, src: [INC, src10Q("MD&A, operating expenses"), CF] },
    { id: "customers", q: "Who are NVIDIA's customers?", s: "Customers", card: ["70%", "owed by 5 customers"],
      a: "Mostly large companies building AI data centers, and a few of them are very large. As of July 26, 2026, five direct customers each accounted for between 10% and 22% of our [[accounts receivable]], about 70% combined. Customers based outside the United States made up 38% of revenue last quarter. Depending on a few big buyers means a pullback by any one of them could hit sales hard.",
      simple: "A handful of huge buyers make up much of the business. Five customers owe NVIDIA about 70% of the money it's waiting to collect.",
      calc: ["About 70% = 22% + 14% + 13% + 11% + 10%"],
      visual: { take: "Five customers hold about 70% of receivables", type: "bars", title: "Share of money owed to NVIDIA, Jul 26, 2026", unit: "%", items: [["Customer A", 22, true], ["Customer B", 14], ["Customer C", 13], ["Customer D", 11], ["Customer E", 10]] }, src: [src10Q("Notes, concentration of credit risk"), src10Q("Note 13, revenue by geography")] },
    { id: "cash", q: "Does NVIDIA make real cash?", s: "Cash flow", card: ["$74.4B", "cash from operations, 6 months"],
      a: "Real cash. In the first half of this fiscal year, our [[operating cash flow]] was $74.4 billion, up from $42.8 billion in the same six months a year earlier. For all of fiscal 2026 it was $102.7 billion. Cash, not paper profit, is what pays for research, buybacks and debt.",
      simple: "The business brings in real money, about $74 billion in six months, not just profits on paper.",
      calc: ["74% = $74.4B ÷ $42.8B − 1"],
      visual: { take: "Operating cash flow up 74% year over year", growth: true, type: "bars", title: "Operating cash flow, Feb–Jul, $ billions", unit: "B", items: [["2025", 42.779], ["2026", 74.421, true]] }, src: [CF, src10K("Consolidated Statements of Cash Flows")] },
    { id: "competition", q: "Who are NVIDIA's competitors?", s: "Competition", card: ["AMD", "plus the cloud giants' own chips"],
      a: "Our annual report names chipmakers such as AMD, Huawei and Intel. It also names big cloud companies, including Alphabet, Amazon and Microsoft, that have their own teams designing AI chips. The report says we expect competition to keep increasing. If the biggest buyers of AI chips rely more on their own designs, they could need fewer of ours.",
      simple: "Other chip companies like AMD and Intel compete with NVIDIA. So do giant tech companies that are building their own AI chips.",
      visual: { take: "Competition comes from chipmakers and cloud giants", type: "list", title: "Competitors named in the 10-K", items: ["Chipmakers: AMD, Huawei, Intel", "Cloud companies' own chips: Alibaba, Alphabet, Amazon, Baidu, Microsoft", "Arm-based CPU makers: Amazon, Huawei, Microsoft"] }, src: [src10K("Item 1, Business: Competition")] },
    { id: "moat", q: "What makes NVIDIA different?", s: "What sets it apart", card: ["2006", "CUDA software launched"],
      a: "Software, not just chips. In 2006 we introduced CUDA, a platform that lets programmers use our chips for far more than graphics. Our annual report says CUDA runs on every NVIDIA GPU, with hundreds of software libraries and tools built on top of it. When developers build their work on that software, switching to another company's chips can be harder.",
      simple: "NVIDIA also makes the software that programmers use to run AI on its chips. Once people build on that software, switching to another chip can be harder.",
      calc: ["Two decades = 2006 to 2026"],
      visual: { take: "A software platform built over two decades", type: "list", title: "NVIDIA's platform, per its 10-K", items: ["2006: CUDA introduced", "CUDA runs on all NVIDIA GPUs", "Hundreds of libraries, frameworks and SDKs on top", "2012: AlexNet trained on NVIDIA GPUs"] }, src: [src10K("Item 1, Business: Our Company and Our Businesses")] },
    { id: "china", q: "How much does NVIDIA sell to China?", s: "China", card: ["$7.9B", "China and Hong Kong, one quarter"],
      a: "Last quarter, revenue attributed to China, including Hong Kong, was $7.9 billion, about 8% of the total, up from $4.0 billion a year earlier. U.S. licenses let us ship small amounts of our H200 chips to certain Chinese customers, but China's government has restricted those sales. Those shipments were under 1% of data center revenue last quarter, and we took a $0.4 billion charge for excess H200 inventory in the first half. Rules on both sides can change what we're allowed to sell, almost overnight.",
      simple: "NVIDIA sold about $8 billion worth to China last quarter. Government rules in the U.S. and China limit what it can sell there, and those rules can change.",
      calc: ["Nearly doubled = $7.88B ÷ $3.99B (1.98×)", "About 8% = $7.88B ÷ $96.2B"],
      visual: { take: "China revenue nearly doubled under shifting export rules", growth: true, type: "bars", title: "Revenue attributed to China incl. Hong Kong, $B", unit: "B", items: [["Apr–Jul 2025", 3.985], ["Apr–Jul 2026", 7.880, true]] }, src: [src10Q("Note 13, revenue by geography"), src10Q("MD&A and risk factors, China")] },
    { id: "makers", q: "Who actually makes NVIDIA's chips?", s: "Who builds the chips", card: ["Fabless", "partners build the chips"],
      a: "Not us. Our annual report describes a [[fabless]] strategy: partners handle every manufacturing step, from making the silicon wafers to assembly, testing and packaging. Our wafers come from foundries such as TSMC and Samsung, and our memory from SK Hynix, Micron and Samsung. That keeps us focused on design, but it means we depend on a small group of suppliers.",
      simple: "NVIDIA designs its chips but doesn't build them. Companies like TSMC in Taiwan do the manufacturing, so NVIDIA relies on them.",
      visual: { take: "NVIDIA designs; partners manufacture", type: "list", title: "Suppliers named in the 10-K", items: ["Wafers: TSMC, Samsung", "Memory: SK Hynix, Micron, Samsung", "Packaging: CoWoS technology", "Assembly and testing: contract manufacturers"] }, src: [src10K("Item 1, Business: Manufacturing")] },
    { id: "margin", q: "Are NVIDIA's profit margins rising or falling?", s: "Margins", card: ["75.0%", "gross margin, one quarter"],
      a: "Rising again. Our [[gross margin]] last quarter was 75.0%, up from 72.4% a year earlier, which our filing credits to a better mix from Blackwell Ultra chips. For the full fiscal year 2026 it had dipped to 71.1%, from 75.0% the year before, partly because of a $4.5 billion charge for excess H20 chip inventory and purchase commitments. Margins show how much pricing power a company has, so investors watch them closely.",
      simple: "NVIDIA keeps about 75 cents of each sales dollar after the cost of making its chips. That slipped last year and has now climbed back.",
      calc: ["75.0% = gross profit $72.1B ÷ revenue $96.2B", "72.4% = $33.9B ÷ $46.7B"],
      visual: { take: "Gross margin is back to 75%", type: "bars", title: "Gross margin, %", unit: "%", items: [["Fiscal 2025", 75.0], ["Fiscal 2026", 71.1], ["Apr–Jul 2025", 72.4], ["Apr–Jul 2026", 75.0, true]] }, src: [INC, src10Q("MD&A, gross margin"), src10K("MD&A summary")] },
    { id: "otherincome", q: "Does all of NVIDIA's profit come from selling chips?", s: "Other income", card: ["$7.8B", "other income, one quarter"],
      a: "Mostly, but not all. Our [[operating income]] from the business was $63.7 billion last quarter, and [[other income]] added another $7.8 billion, up from $2.8 billion a year earlier. In the first half of this fiscal year, other income was $24.1 billion, and $23.7 billion of that was gains on stakes we hold in other companies. Investment gains can swing down as easily as up, so they're less dependable than profit from selling products.",
      simple: "Most of NVIDIA's profit comes from selling chips. But billions more came from rising values of stakes it owns in other companies, and that part can go down as easily as up.",
      visual: { take: "Other income added $7.8B on top of operating profit", type: "bars", title: "Apr–Jul 2026, $ billions", unit: "B", items: [["Operating income", 63.734, true], ["Other income, net", 7.773]] }, src: [INC, CF] },
    { id: "dividend", q: "Does NVIDIA pay its shareholders?", s: "Payouts", card: ["$0.25", "dividend per share, per quarter"],
      a: "Yes, in two ways. On May 18, 2026, we raised our quarterly [[dividend]] from 1 cent to 25 cents a share, and we paid $6.3 billion in dividends in the first half of this fiscal year. We also spent $39.0 billion buying back our own stock. Our filing says future dividends depend on the board deciding they're in shareholders' best interests, so they aren't guaranteed.",
      simple: "NVIDIA pays its owners a small cash payment every quarter, now 25 cents a share, and also spends billions buying back its own stock.",
      calc: ["$45.3B = buybacks $39.0B + dividends $6.3B"],
      visual: { take: "$45.3B returned to shareholders in six months", type: "bars", title: "Returned to shareholders, Feb–Jul 2026, $B", unit: "B", items: [["Buybacks", 39.044, true], ["Dividends", 6.290]] }, src: [CF, src10Q("Note 12, shareholders' equity")] },
    { id: "risk", q: "What could go wrong?", s: "What could go wrong", risk: true, card: ["4", "risks on the table"], note: "4 risks",
      a: "Plenty, and I'll show you every card. One: five customers make up about 70% of what we're owed, so a pullback by a few buyers would hit hard. Two: our filing says H200 chips under the U.S. license program for China face a 25% [[tariff]] when they enter the United States, and we haven't been able to pass any of it on. Three: our total debt roughly quadrupled to $33.4 billion in six months, and we'll have to repay or refinance it. Four: [[inventory]] grew to $31.6 billion from $21.4 billion in January. If demand cools, that's a lot of product on the shelf.",
      simple: "If a few big customers stop buying, sales could drop fast. Selling to China is getting harder and more expensive. NVIDIA has taken on more debt. And it's holding a big pile of chips it still needs to sell.",
      calc: ["About 70% = sum of five customers' shares of receivables"],
      visual: { take: "Four risks disclosed in NVIDIA's own filings", type: "list", title: "Risks from NVIDIA's own filings", items: ["Five customers ≈ 70% of receivables", "25% tariff on licensed H200s, not passed on", "Total debt $8.5B → $33.4B in six months", "Inventory $21.4B → $31.6B since January"] }, src: [src10Q("Notes, concentration of credit risk; MD&A; risk factors"), BAL] }
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
  outside: "That one's outside what I prepared tonight, shark. Pick one of these and I'll give you the real numbers.",
  clarify: "I want to get this right, shark. Did you mean one of these?",
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
