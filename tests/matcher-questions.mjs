// 200+ realistic beginner questions for NVIDIA. expected: a question id, "a|b" (either answer or a clarify offering one of them is fine),
// "none" (should say out of scope), "define", "advice", "simpler", "follow".
export const CASES = [
  // sell
  ["What does NVIDIA sell?", "sell"], ["what do they actually do", "sell"], ["What does this company do", "sell"], ["so what do you guys make", "sell"],
  ["how does nvidia make money", "sell"], ["Where does their revenue come from?", "sell"], ["what's their business model", "sell"], ["what is nvidia", "sell"],
  ["what kind of company is this", "sell"], ["what products do they have", "sell"], ["do they just make graphics cards?", "sell"], ["what is their main business", "sell"],
  ["what do you do in video", "sell"], ["whats nvidea's product", "sell"], ["how much comes from data centers", "sell"],
  // growth
  ["How fast is NVIDIA growing?", "growth"], ["is the business growing", "growth"], ["are sales going up", "growth"], ["how much did revenue grow", "growth"],
  ["Is the company getting bigger?", "growth"], ["did sales double", "growth"], ["what's the growth rate", "growth"], ["how big are their sales", "growth"],
  ["how much revenue did they make last year", "growth"], ["are they shrinking", "growth"], ["is growth slowing", "growth|risk"], ["revenue trend over the years", "growth"],
  ["how much has nvidia grown", "growth"], ["year over year growth?", "growth"], ["grwoth?", "growth"],
  // profit
  ["Is NVIDIA profitable?", "profit"], ["Does NVIDIA actually make money?", "profit"], ["are they losing money", "profit"], ["do they make a profit", "profit"],
  ["how much profit do they make", "profit"], ["what are their earnings", "profit"], ["what's the eps", "profit"], ["net income?", "profit"],
  ["are they making money or not", "profit"], ["what's the bottom line", "profit"], ["how much do they earn", "profit"], ["do you make money", "profit"],
  ["profitible?", "profit"], ["how much do they keep from each dollar", "profit|margin"],
  // margin
  ["what are their margins", "margin"], ["Are NVIDIA's profit margins rising or falling?", "margin"], ["what's the gross margin this quarter", "margin"],
  ["do they have pricing power", "margin"], ["are margins going down", "margin"], ["how big is the markup on their chips", "margin"], ["profit margin trend", "margin"],
  ["did margins drop last year", "margin"], ["whats nvidias gross margin", "margin"], ["why did margins fall", "margin"],
  // debt
  ["How much debt does NVIDIA carry?", "debt"], ["are they borrowing too much", "debt"], ["do they have loans", "debt"], ["how much do they owe", "debt"],
  ["what does the balance sheet look like", "debt"], ["how much cash do they have in the bank", "debt"], ["do they have a lot of debt", "debt"], ["did they borrow more money", "debt"],
  ["are they leveraged", "debt"], ["bonds?", "debt"], ["dept", "debt"], ["what are their liabilities", "debt"], ["is nvidia in debt", "debt"],
  // spend
  ["Where does NVIDIA's money go?", "spend"], ["what do they spend money on", "spend"], ["how much do they spend on research", "spend"], ["r and d spending", "spend"],
  ["what are their biggest expenses", "spend"], ["how much does it cost to run the company", "spend"], ["do they reinvest", "spend"], ["what are operating expenses", "spend|define"],
  ["are costs going up", "spend"], ["how much on r&d", "spend"], ["where does the money go", "spend"],
  // customers
  ["Who are NVIDIA's customers?", "customers"], ["who buys their chips", "customers"], ["who do they sell to", "customers"], ["do they depend on a few customers", "customers"],
  ["who are their biggest buyers", "customers"], ["who pays them", "customers"], ["are their clients concentrated", "customers"], ["how much comes from overseas", "customers"],
  ["do foreign countries buy from them", "customers"], ["who are the clients", "customers"], ["costumers?", "customers"], ["what share of money owed comes from five customers", "customers"],
  // cash
  ["Does NVIDIA make real cash?", "cash"], ["what's their cash flow", "cash"], ["is the profit real or just on paper", "cash"], ["how much cash do they generate", "cash"],
  ["how do they afford all this", "cash"], ["how do they pay for everything", "cash"], ["operating cash flow?", "cash"], ["how much money is coming in", "cash"],
  ["cashflow", "cash"], ["how do they fund their growth", "cash|growth"],
  // competition
  ["Who are NVIDIA's competitors?", "competition"], ["who else makes AI chips", "competition"], ["what about AMD", "competition"], ["is intel a threat", "competition"],
  ["who are their rivals", "competition"], ["can anyone else compete", "competition"], ["are google and amazon making their own chips", "competition"], ["what's the competition like", "competition"],
  ["could someone catch up to them", "competition"], ["is huawei competing", "competition"], ["compettion?", "competition"], ["are there alternatives to nvidia", "competition"],
  // moat
  ["What makes NVIDIA different?", "moat"], ["why would anyone buy from them", "moat"], ["what's their competitive advantage", "moat|competition"], ["do they have a moat", "moat"],
  ["what is cuda", "moat|define"], ["why are they so dominant", "moat"], ["what's special about nvidia", "moat"], ["why do people choose nvidia", "moat"],
  ["what's their secret sauce", "moat"], ["is it the software", "moat"], ["what makes them stand out", "moat"], ["why are they better than amd", "moat|competition"],
  ["why is nvidia so successful", "moat"], ["what's unique about them", "moat"],
  // china
  ["How much does NVIDIA sell to China?", "china"], ["what about china", "china"], ["are there export restrictions", "china"], ["can they sell to chinese companies", "china"],
  ["is china banning their chips", "china"], ["what's happening with the h200", "china"], ["how does the trade war affect them", "china"], ["sanctions?", "china"],
  ["hong kong sales", "china"], ["chinas impact", "china"],
  // makers
  ["Who actually makes NVIDIA's chips?", "makers"], ["do they have their own factories", "makers"], ["who manufactures the chips", "makers"], ["what is tsmc's role", "makers"],
  ["do they depend on suppliers", "makers"], ["where are the chips made", "makers"], ["who builds the chips", "makers"], ["what's their supply chain", "makers"],
  ["are they fabless", "makers"], ["manufacturing?", "makers"], ["do they rely on taiwan", "makers|china"],
  // otherincome
  ["Does all of NVIDIA's profit come from selling chips?", "otherincome"], ["what's other income", "otherincome|define"], ["do they make money from investments", "otherincome"],
  ["are there one time gains", "otherincome"], ["what are those investment gains", "otherincome"], ["does profit come only from chips", "otherincome"], ["stakes in other companies?", "otherincome"],
  // dividend
  ["Does NVIDIA pay its shareholders?", "dividend"], ["do they pay a dividend", "dividend"], ["how much is the dividend", "dividend"], ["do they buy back stock", "dividend|spend"],
  ["do investors get paid", "dividend"], ["what's the payout", "dividend"], ["do they return cash to shareholders", "dividend"], ["devidend?", "dividend"],
  // risk
  ["What could go wrong?", "risk"], ["what are the risks", "risk"], ["what's the downside", "risk"], ["what is their biggest weakness", "risk"],
  ["What happens if demand slows down?", "risk"], ["should I be worried about anything", "risk"], ["what's the bear case", "risk"], ["any red flags", "risk"],
  ["what's the catch", "risk"], ["could they go bankrupt", "risk"], ["what if the AI boom ends", "risk|none"], ["what problems do they face", "risk"],
  ["are tariffs a problem", "risk"], ["too much inventory?", "risk"], ["what keeps you up at night", "risk|none"], ["rsik?", "risk"],
  // definitions
  ["What is gross margin?", "define"], ["what does revenue mean", "define"], ["define buyback", "define"], ["what is a tariff", "define"],
  ["what's accounts receivable", "define"], ["what does fiscal year mean", "define"], ["what is net income", "define"], ["what are hyperscalers", "define"],
  ["what is inventory", "define"], ["what is a dividend", "define"], ["what does fabless mean", "define"], ["what is operating cash flow", "define"],
  // simpler / follow-ups
  ["explain that simpler", "simpler"], ["I don't understand", "simpler"], ["can you dumb it down", "simpler"], ["say that in plain english", "simpler"],
  ["i'm a beginner, what does that mean", "simpler"], ["why?", "follow"], ["tell me more", "follow"], ["so what", "follow"],
  // advice (must refuse)
  ["Should I buy NVIDIA?", "advice"], ["is nvidia a good investment", "advice"], ["will the stock go up", "advice"], ["what's the price target", "advice"],
  ["is it worth buying", "advice"], ["how much should I invest", "advice"], ["buy or sell?", "advice"], ["what's the share price", "advice"],
  ["is it overvalued", "advice"], ["do you recommend it", "advice"],
  // out of scope
  ["who is the CEO", "none"], ["how many employees do they have", "none|spend"], ["what's the weather", "none"], ["tell me a joke", "none"],
  ["what's your favorite color", "none"], ["when was nvidia founded", "none|moat"], ["what video games use nvidia", "none|sell"], ["do they have a crypto business", "none"],
  ["what's apple doing", "none"], ["hello", "none"], ["how old are you", "none"], ["what's the meaning of life", "none"],
  ["can I get a refund", "none"], ["where is the headquarters", "none"], ["who designed the logo", "none"],
  // multiple concepts (clarify or either is fine)
  ["are they profitable and how much debt do they have", "profit|debt"], ["growth and risks?", "growth|risk"], ["who are the customers and competitors", "customers|competition"],
  ["how much cash and debt", "cash|debt"], ["profit and margins", "profit|margin"], ["china and tariffs", "china|risk"]
];
