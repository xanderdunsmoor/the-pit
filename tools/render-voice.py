# Pre-renders every line a pitcher can say, plus per-frame mouth shapes for lip sync.
#
#   node tools/list-lines.mjs > lines.json
#   FORCE=1 python tools/render-voice.py lines.json            (re-render everything)
#
# Providers are pluggable: each returns (audio float32 mono, sample_rate, timings, kind)
#   kind "ipa"  -> timings are (phoneme, start_s, end_s)       (Kokoro, via its exposed durations)
#   kind "char" -> timings are (character, start_s, end_s)     (ElevenLabs "with-timestamps" alignment)
#   kind "viseme" -> timings are (azure_viseme_id, start_s, end_s)  (Azure viseme events)
# The app only ever sees public/voice/<id>.mp3 + public/voice/index.json, so switching provider never touches the game.
import json, sys, re, subprocess, base64, io, os
import numpy as np, soundfile as sf

lines_doc = json.load(open(sys.argv[1]))
CFG, LINES = lines_doc["voice"], lines_doc["lines"]
KOKORO_DIR = os.environ.get("KOKORO_DIR", "/tmp/claude-0/-home-claude/25ca29fe-897b-5fb4-901f-04a6dc0cc97f/scratchpad/kokoro")
FPS = 50

# ---------------- what the listener should hear (pronunciation + how numbers are read) ----------------
ORD = {1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth", 16: "sixteenth", 17: "seventeenth", 18: "eighteenth", 19: "nineteenth", 20: "twentieth", 21: "twenty-first", 22: "twenty-second", 23: "twenty-third", 24: "twenty-fourth", 25: "twenty-fifth", 26: "twenty-sixth", 27: "twenty-seventh", 28: "twenty-eighth", 29: "twenty-ninth", 30: "thirtieth", 31: "thirty-first"}
WORDS = [(r"\bNVIDIA\b", "Nvidia"), (r"\bNVDA\b", "N V D A"), (r"\bR&D\b", "R and D"), (r"\bH200s\b", "H two hundreds"), (r"\bH200\b", "H two hundred"),
         (r"\bH20\b", "H twenty"), (r"\bHuawei\b", "Wah-way"), (r"\bfabless\b", "fab-less"), (r"\bBaidu\b", "Bye-doo"), (r"\bCUDA\b", "Cooda"),
         (r"\bAI\b", "A.I."), (r"\bTSMC\b", "T S M C"), (r"\bSK Hynix\b", "S K Hynix"), (r"\bCoWoS\b", "co-woss"), (r"(\d+)¢", r"\1 cents"), (r"^\+(\d)", r"plus \1")]
def say_year(y):
    y = int(y); return f"twenty {y - 2000:02d}".replace("twenty 0", "twenty oh ") if 2000 <= y < 2100 else str(y)
def speak(t):
    t = re.sub(r"\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (20\d\d)\b", lambda m: f"{m.group(1)} {ORD[int(m.group(2))]}, {say_year(m.group(3))}", t)
    t = re.sub(r"\b(fiscal|fiscal year|in|since|of) (20\d\d)\b", lambda m: f"{m.group(1)} {say_year(m.group(2))}", t)
    t = re.sub(r"\$(\d+)\.(\d\d)\b(?! billion)", lambda m: f"{int(m.group(1))} {'dollar' if int(m.group(1)) == 1 else 'dollars'} and {int(m.group(2))} cents", t)
    t = re.sub(r"\b0\.(\d) billion dollars", lambda m: f"{int(m.group(1)) * 100} million dollars", t)
    t = re.sub(r"\b1(0\d)%", lambda m: f"a hundred and {int(m.group(1))} percent", t)
    t = re.sub(r"(\d+) (million|billion) dollars (charge|program)", r"\1 \2 dollar \3", t)
    for a, b in WORDS: t = re.sub(a, b, t)
    return t
def pace(t):
    # delivery: numbers land a touch slower, short punchy lines a touch quicker
    base = CFG.get("speed", 1.0); words = len(t.split())
    if re.search(r"\d", t): return base * .94
    if words <= 5: return base * 1.04
    return base

# ---------------- providers ----------------
def kokoro_synth(text, speed):
    from kokoro_onnx import Kokoro
    global _K
    if "_K" not in globals(): _K = Kokoro(os.path.join(KOKORO_DIR, "kokoro-timed.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    style = sum(_K.get_voice_style(n) * float(w) for n, w in (p.split("*") for p in CFG["voice"].split("+")))
    audio, sr, tim = _K.create_timed(text, voice=style, speed=speed, lang="en-us", sentence_pause=0, clause_pause=.12)
    return audio, sr, [(x.phoneme, x.start, x.end) for x in tim], "ipa"
def elevenlabs_synth(text, speed):
    # POST /v1/text-to-speech/{voice_id}/with-timestamps with ELEVENLABS_API_KEY; returns audio_base64 + alignment
    # (characters, character_start_times_seconds, character_end_times_seconds) -> kind "char"
    raise NotImplementedError("Set ELEVENLABS_API_KEY and implement the request when you choose to upgrade.")
def azure_synth(text, speed):
    # Azure Speech SDK with the viseme_received event (viseme_id, audio_offset) -> kind "viseme"
    raise NotImplementedError("Set AZURE_SPEECH_KEY/REGION and implement the request when you choose to upgrade.")
PROVIDERS = {"kokoro": kokoro_synth, "elevenlabs": elevenlabs_synth, "azure": azure_synth}

# ---------------- mouth shapes: (jaw open, lips wide, lips round, lips pressed) ----------------
VIS = {}
def setv(chars, *v):
    for c in chars: VIS[c] = v
setv("aɑæʌ", .75, .25, 0, 0); setv("eɛ", .5, .55, 0, 0); setv("iɪj", .22, .9, 0, 0); setv("oɔɒ", .55, 0, .8, 0)
setv("uʊw", .18, 0, 1, 0); setv("əɚɜɝᵻɐ", .38, .15, 0, 0); setv("mbp", 0, 0, 0, 1); setv("fv", .08, .2, 0, .45)
setv("szʃʒtdnlθðʧʤɾ", .16, .35, 0, 0); setv("kɡŋhɹr", .28, .1, 0, 0); setv("ʔ", .05, 0, 0, 0)
GRAPH = {"a": "æ", "e": "ɛ", "i": "ɪ", "o": "ɔ", "u": "ʊ", "y": "ɪ", "w": "w", "m": "m", "b": "b", "p": "p", "f": "f", "v": "v"}
AZURE = {0: (0, 0, 0, 0), 1: (.7, .2, 0, 0), 2: (.75, .2, 0, 0), 3: (.5, 0, .7, 0), 4: (.45, .5, 0, 0), 5: (.4, .2, 0, 0), 6: (.22, .8, 0, 0), 7: (.18, 0, 1, 0), 8: (.5, 0, .8, 0), 9: (.6, .2, .3, 0), 10: (.5, 0, .7, 0), 11: (.7, .3, 0, 0), 12: (.3, .1, 0, 0), 13: (.3, .1, .3, 0), 14: (.2, .3, 0, 0), 15: (.15, .4, 0, 0), 16: (.15, .3, .3, 0), 17: (.15, .35, 0, 0), 18: (.08, .2, 0, .45), 19: (.15, .35, 0, 0), 20: (.28, .1, 0, 0), 21: (0, 0, 0, 1)}
def shape(tok, kind, last):
    if kind == "viseme": return AZURE.get(int(tok), (.2, .1, 0, 0))
    if kind == "char": tok = GRAPH.get(tok.lower(), tok.lower())
    if tok in "ˈˌ": return None
    if tok == "ː": return last
    return VIS.get(tok, (0, 0, 0, 0) if tok in " .,!?;:—-'" else (.2, .1, 0, 0))

# ---------------- Rex's sound: a touch deeper and warmer, gently levelled (tempo unchanged, so timings stay valid) ----------------
def finish(audio, sr):
    deep = CFG.get("deepen", .97)
    chain = f"asetrate={int(sr * deep)},aresample={sr},atempo={1 / deep:.5f},equalizer=f=140:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.3:g=1.5,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=90"
    buf = io.BytesIO(); sf.write(buf, audio, sr, format="WAV")
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "wav", "-i", "-", "-af", chain, "-f", "wav", "-"], input=buf.getvalue(), capture_output=True, check=True).stdout
    a, _ = sf.read(io.BytesIO(out), dtype="float32"); return a

os.makedirs("public/voice", exist_ok=True)
old = json.load(open("public/voice/index.json"))["lines"] if os.path.exists("public/voice/index.json") else {}
keep = {lid for lid, _ in LINES}; FORCE = os.environ.get("FORCE") == "1"
index = {k: v for k, v in old.items() if k in keep and not FORCE}
for f in os.listdir("public/voice"):
    if f.endswith(".mp3") and f[:-4] not in keep: os.remove("public/voice/" + f)
synth = PROVIDERS[CFG.get("provider", "kokoro")]
for i, (lid, text) in enumerate(LINES):
    if lid in index and os.path.exists(f"public/voice/{lid}.mp3"): continue
    spoken = speak(text)
    audio, sr, tim, kind = synth(spoken, pace(spoken))
    audio = finish(audio, sr); audio = audio / max(1e-6, np.abs(audio).max()) * .89
    nz = np.where(np.abs(audio) > .01)[0]; t0 = 0
    if len(nz): t0 = max(0, nz[0] - int(.04 * sr)); audio = audio[t0: nz[-1] + int(.1 * sr)]
    hop = sr // FPS; n = max(1, len(audio) // hop)
    rms = np.array([np.sqrt(np.mean(audio[f * hop:(f + 1) * hop] ** 2)) for f in range(n)]); rms = np.clip(rms / max(1e-6, np.percentile(rms, 90)), 0, 1.2)
    tgt = np.zeros((n, 4)); last = (0, 0, 0, 0)
    for tok, st, en in tim:
        v = shape(tok, kind, last)
        if v is None: continue
        last = v; f0, f1 = int(max(0, st * sr - t0) / hop), int(max(0, en * sr - t0) / hop); tgt[f0:max(f0 + 1, f1)] = v
    ker = np.exp(-np.linspace(-2, 2, 5) ** 2); ker /= ker.sum()
    sm = np.stack([np.convolve(tgt[:, c], ker, mode="same") for c in range(4)], 1)
    sm = np.roll(sm, -1, axis=0); sm[:, 0] *= np.clip(rms * 1.25, 0, 1)
    mouth = np.round(np.clip(sm, 0, 1) * 255).astype(np.uint8).reshape(-1)
    b = io.BytesIO(); sf.write(b, audio, sr, format="WAV")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "wav", "-i", "-", "-ac", "1", "-b:a", "64k", f"public/voice/{lid}.mp3"], input=b.getvalue(), check=True)
    index[lid] = {"d": round(len(audio) / sr, 3), "m": base64.b64encode(mouth.tobytes()).decode()}
    print(i + 1, len(LINES), lid, round(len(audio) / sr, 1), flush=True)
json.dump({"fps": FPS, "channels": 4, "provider": CFG.get("provider", "kokoro"), "voice": CFG.get("voice"), "lines": index}, open("public/voice/index.json", "w"))
