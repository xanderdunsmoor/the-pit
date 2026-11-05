// Encodes room textures to KTX2 (Basis) for lower GPU memory: node tools/encode-ktx2.mjs public/tex  (needs: npm i ktx2-encoder sharp), then wrap each .ktx2 as base64 JSON (<name>.ktx2.json) because the artifact host only serves web types.
import { encodeToKTX2 } from "ktx2-encoder"; import sharp from "sharp"; import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
const dec = async b => { const { data, info } = await sharp(Buffer.from(b)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8Array(data) }; };
const jobs = [["walnut_diff","jpg",{}],["parquet_diff","jpg",{}],["velvet_diff","jpg",{}],["leather_diff","jpg",{}],["walnut_rough","jpg",{isPerceptual:false}],["leather_rough","jpg",{isPerceptual:false}]];
for (const [n, ext, o] of jobs) {
  const out = await encodeToKTX2(readFileSync(`${dir}/${n}.${ext}`), Object.assign({ isUASTC: false, generateMipmap: true, qualityLevel: 128, compressionLevel: 2, imageDecoder: dec }, o));
  writeFileSync(`${dir}/${n}.ktx2`, out); console.log(n, out.length);
}
