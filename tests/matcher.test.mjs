// node tests/matcher.test.mjs — checks the matcher against realistic beginner questions; wrong answers are counted separately from unanswered ones
import { interpret } from "../src/matcher.js";
import { CASES } from "./matcher-questions.mjs";
let right = 0, wrong = 0, unanswered = 0, clarified = 0; const bad = [];
for (const [text, exp] of CASES) {
  const r = interpret(text), ok = exp.split("|"), got = r.kind === "answer" ? r.q.id : r.kind;
  const offered = r.kind === "clarify" ? r.options.map(q => q.id) : [];
  if (ok.includes(got) || (r.kind === "simpler" && ok.includes("simpler"))) right++;
  else if (r.kind === "clarify" && offered.some(id => ok.includes(id))) { clarified++; }
  else if ((r.kind === "none" || r.kind === "clarify") && !ok.includes("none")) { unanswered++; bad.push(["UNANSWERED", text, exp, got, offered.join(",")]); }
  else { wrong++; bad.push(["WRONG", text, exp, got, offered.join(",")]); }
}
const n = CASES.length;
console.log(`${n} questions: ${right} right, ${clarified} clarified (acceptable), ${unanswered} unanswered, ${wrong} WRONG (${(wrong / n * 100).toFixed(1)}%)`);
bad.forEach(b => console.log(b.join(" | ")));
process.exitCode = wrong / n > .02 ? 1 : 0;
