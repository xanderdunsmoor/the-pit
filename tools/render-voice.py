# Pre-renders every line Rex can say with the Kokoro neural voice (Apache-2.0), plus mouth-movement data.
# Usage: node tools/list-lines.mjs > lines.json && FORCE=1 python tools/render-voice.py lines.json <kokoro.onnx> <voices.bin> <kokoro-timed.onnx>
# kokoro-timed.onnx = the same model with its duration tensor exposed as an output named "duration" (see tools/expose-durations.py)
import json, sys, re, subprocess, base64, io
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
lines = json.load(open(sys.argv[1]))
k = Kokoro(sys.argv[2], sys.argv[3])
VOICE = k.get_voice_style('am_michael') * .6 + k.get_voice_style('am_onyx') * .4   # warm American baritone
SAY = [(r'\bNVIDIA\b', 'Nvidia'), (r'\bNVDA\b', 'N V D A'), (r'\bR&D\b', 'R and D'), (r'\bH200s?\b', 'H two hundreds'), (r'(\d+)¢', r'\1 cents'), (r'^\+(\d)', r'plus \1'), (r'\bAI\b', 'A.I.')]
def speak(t):
    for a, b in SAY: t = re.sub(a, b, t)
    return t
FPS = 50
# mouth shapes per sound (IPA from the voice model): jaw open, lips wide, lips round, lips pressed
VIS = {}
def setv(chars, jaw, wide, rnd, press):
    for c in chars: VIS[c] = (jaw, wide, rnd, press)
setv("aɑæʌ", .75, .25, 0, 0); setv("eɛ", .5, .55, 0, 0); setv("iɪj", .22, .9, 0, 0); setv("oɔɒ", .55, 0, .8, 0)
setv("uʊw", .18, 0, 1, 0); setv("əɚɜɝᵻ", .38, .15, 0, 0); setv("mbp", 0, 0, 0, 1); setv("fv", .08, .2, 0, .45)
setv("szʃʒtdnlθðʧʤɾ", .16, .35, 0, 0); setv("kɡŋhɹr", .28, .1, 0, 0); setv("ʔ", .05, 0, 0, 0)
import os
TIMED = sys.argv[4] if len(sys.argv) > 4 else None
kt = Kokoro(TIMED, sys.argv[3]) if TIMED else k
old = json.load(open('public/voice/index.json'))['lines'] if os.path.exists('public/voice/index.json') else {}
keep = {lid for lid, _ in lines}
FORCE = os.environ.get('FORCE') == '1'
index = {kk: v for kk, v in old.items() if kk in keep and not FORCE}
for f in os.listdir('public/voice'):
    if f.endswith('.mp3') and f[:-4] not in keep: os.remove('public/voice/' + f)   # drop lines Rex no longer says
for i, (lid, text) in enumerate(lines):
    if lid in index and os.path.exists(f'public/voice/{lid}.mp3'): continue      # already rendered
    audio, sr, tim = kt.create_timed(speak(text), voice=VOICE, speed=.95, lang='en-us', sentence_pause=0, clause_pause=.06)
    audio = audio / max(1e-6, np.abs(audio).max()) * .89
    nz = np.where(np.abs(audio) > .01)[0]; t0 = 0
    if len(nz): t0 = max(0, nz[0] - int(.04 * sr)); audio = audio[t0: nz[-1] + int(.08 * sr)]
    hop = sr // FPS; n = max(1, len(audio) // hop)
    # loudness envelope keeps the mouth shut in silences
    rms = np.array([np.sqrt(np.mean(audio[f * hop:(f + 1) * hop] ** 2)) for f in range(n)]); rms = np.clip(rms / max(1e-6, np.percentile(rms, 90)), 0, 1.2)
    tgt = np.zeros((n, 4)); last = (0, 0, 0, 0)
    for tm in tim:
        ph = tm.phoneme
        if ph in "ˈˌ": continue
        v = last if ph == "ː" else VIS.get(ph, (0, 0, 0, 0) if ph in " .,!?;:—-" else (.2, .1, 0, 0))
        last = v
        f0, f1 = int(max(0, tm.start * sr - t0) / hop), int(max(0, tm.end * sr - t0) / hop)
        tgt[f0:max(f0 + 1, f1)] = v
    # coarticulation: blend neighbouring sounds (about 40 ms), and lead the audio slightly
    ker = np.exp(-np.linspace(-2, 2, 5) ** 2); ker /= ker.sum()
    sm = np.stack([np.convolve(tgt[:, c], ker, mode='same') for c in range(4)], 1)
    sm = np.roll(sm, -1, axis=0); sm[:, 0] *= np.clip(rms * 1.25, 0, 1)
    mouth = np.round(np.clip(sm, 0, 1) * 255).astype(np.uint8).reshape(-1)
    buf = io.BytesIO(); sf.write(buf, audio, sr, format='WAV')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'wav', '-i', '-', '-ac', '1', '-b:a', '64k', f'public/voice/{lid}.mp3'], input=buf.getvalue(), check=True)
    index[lid] = {'d': round(len(audio) / sr, 3), 'm': base64.b64encode(mouth.tobytes()).decode()}
    print(i + 1, len(lines), lid, round(len(audio) / sr, 1), flush=True)
json.dump({'fps': FPS, 'channels': 4, 'lines': index}, open('public/voice/index.json', 'w'))
