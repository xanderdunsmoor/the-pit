# Pre-renders every line Rex can say with the Kokoro neural voice (Apache-2.0), plus mouth-movement data.
# Usage: node tools/list-lines.mjs > lines.json && python tools/render-voice.py lines.json <kokoro.onnx> <voices.bin>
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
index = {}
for i, (lid, text) in enumerate(lines):
    audio, sr = k.create(speak(text), voice=VOICE, speed=.95, lang='en-us')
    audio = audio / max(1e-6, np.abs(audio).max()) * .89
    # trim silence at the edges but keep a tiny breath
    nz = np.where(np.abs(audio) > .01)[0]
    if len(nz): audio = audio[max(0, nz[0] - int(.04 * sr)): nz[-1] + int(.08 * sr)]
    # mouth data: openness from loudness, width from brightness (ee/s wide, oo/oh round)
    hop = sr // FPS; n = len(audio) // hop; op, wd = [], []
    for f in range(n):
        seg = audio[f * hop:(f + 1) * hop]; rms = float(np.sqrt(np.mean(seg ** 2)))
        spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); fr = np.fft.rfftfreq(len(seg), 1 / sr)
        cen = float((spec * fr).sum() / max(1e-9, spec.sum()))
        op.append(rms); wd.append(cen)
    op = np.array(op); op = np.clip(op / max(1e-6, np.percentile(op, 95)), 0, 1) ** .7
    wd = np.clip((np.array(wd) - 900) / 2600, 0, 1)
    mouth = np.stack([np.round(op * 255), np.round(wd * 255)], 1).astype(np.uint8).reshape(-1)
    buf = io.BytesIO(); sf.write(buf, audio, sr, format='WAV'); 
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'wav', '-i', '-', '-ac', '1', '-b:a', '64k', f'public/voice/{lid}.mp3'], input=buf.getvalue(), check=True)
    index[lid] = {'d': round(len(audio) / sr, 3), 'm': base64.b64encode(mouth.tobytes()).decode()}
    print(i + 1, len(lines), lid, round(len(audio) / sr, 1), flush=True)
json.dump({'fps': FPS, 'lines': index}, open('public/voice/index.json', 'w'))
