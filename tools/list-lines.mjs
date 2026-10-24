// Prints [id, sentence-as-spoken] for every line Rex can say, for tools/render-voice.py
import { allSentences, lineId, forSpeech } from "../src/content.js";
console.log(JSON.stringify(allSentences().map(s => [lineId(s), forSpeech(s)])));
