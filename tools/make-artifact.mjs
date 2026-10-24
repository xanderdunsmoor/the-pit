// Lists every file in dist/ (except the page) as the `files` map for publishing The Pit as a claude.ai artifact.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
const root = "dist"; const out = {};
const walk = d => readdirSync(d).forEach(n => { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else { const r = relative(root, p).split("\\").join("/"); if (r !== "index.html") out[r] = p; } });
walk(root);
writeFileSync(join(root, "artifact-files.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length + " supporting files listed in dist/artifact-files.json");
