# The Pit

An educational game: fictional AI pitchers present real public companies from their SEC filings, and you respond with play money. Not investment advice.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # production build in dist/ (+ dist/artifact-files.json for publishing)
```

## Assets

| What | Source | License |
| --- | --- | --- |
| Studio lighting (`public/env/studio-rgbe.png`, from *Brown Photostudio 02*) | [Poly Haven](https://polyhaven.com) | CC0 |
| Boardroom (`public/models/boardroom.json`, `public/tex/lm_*.png`) | Built and light-baked in Blender by `tools/blender/build_boardroom.py` | Project |
| Walnut, parquet, velvet and leather textures (`public/tex`; `.ktx2.json` = GPU-compressed copies made by `tools/encode-ktx2.mjs`, JPG/PNG kept as fallback) | [Poly Haven](https://polyhaven.com) | CC0 |
| Basis transcoder (`public/basis`) | three.js examples (Binomial Basis Universal) | Apache-2.0 |
| Rex's voice (`public/voice`) | Rendered with Kokoro (open-source) by `tools/render-voice.py`; mouth shapes timed per sound | Apache-2.0 model |
| Sound effects (`public/sfx`) | Kenney *Impact Sounds*, [kenney.nl](https://kenney.nl) | CC0 |
| Rex's body and animations (`public/models/rex.json`) | Mixamo character and motion clips | Mixamo terms: may be used in projects, **raw files may not be redistributed**. Not committed; without it the game falls back to the built-in stylised Rex. The seated investors (`public/models/inv_*.json`) are Mixamo characters and are also kept out of the repo. |

`public/env/studio-rgbe.png` stores the HDR as RGBE: the top half holds RGB mantissas and the bottom half the shared exponent, so it can be served wherever only web image types are allowed.
