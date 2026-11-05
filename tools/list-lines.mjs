// Prints the pitcher's voice settings and every [id, sentence-as-spoken] for tools/render-voice.py
import { allSentences, lineId, forSpeech, PITCH } from "../src/content.js";
console.log(JSON.stringify({ voice: PITCH.voice, lines: allSentences().map(s => [lineId(s), forSpeech(s)]) }));
