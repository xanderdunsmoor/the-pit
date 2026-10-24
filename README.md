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
| Floor, velvet and metal textures (`public/tex`) | [Poly Haven](https://polyhaven.com) | CC0 |
| Studio lighting (`public/env/studio-rgbe.png`, from *Brown Photostudio 02*) | [Poly Haven](https://polyhaven.com) | CC0 |
| Floor contact shading (`public/tex/floor_ao.jpg`) | Baked in Blender from this project's room layout | Project |
| Sound effects (`public/sfx`) | Kenney *Impact Sounds*, [kenney.nl](https://kenney.nl) | CC0 |
| Rex's body and animations (`public/models/rex.json`) | Mixamo character and motion clips | Mixamo terms: may be used in projects, **raw files may not be redistributed**. Not committed; without it the game falls back to the built-in stylised Rex. |

`public/env/studio-rgbe.png` stores the HDR as RGBE: the top half holds RGB mantissas and the bottom half the shared exponent, so it can be served wherever only web image types are allowed.
