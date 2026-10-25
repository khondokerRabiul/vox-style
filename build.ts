/* Full pipeline (run locally / Codespaces / GitHub Actions):
   npm run build:video -- --script script.txt --voice voice.mp3
   -> data/project.json (then: npm run render) */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { splitScript } from "../agents/splitScript";
import { makeHook } from "../agents/scriptParser";
import { processChunk } from "../agents/pipeline";
import { Project, Scene } from "../types/scene";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };

async function download(url: string, to: string) {
  const r = await fetch(url, { headers: { "User-Agent": "vox-agent/1.0 (personal video tool)" } }); if (!r.ok) throw new Error(`download ${r.status}`);
  fs.writeFileSync(to, Buffer.from(await r.arrayBuffer()));
}

(async () => {
  // load .env.local without extra deps
  for (const f of [".env.local", ".env"]) if (fs.existsSync(f))
    fs.readFileSync(f, "utf8").split("\n").forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; });

  const scriptFile = arg("script") ?? "script.txt", voice = arg("voice") ?? "voice.mp3";
  const script = fs.readFileSync(scriptFile, "utf8");
  const totalSec = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice]).toString());
  console.log(`voiceover: ${totalSec.toFixed(1)}s`);
  fs.mkdirSync("public/assets/cutouts", { recursive: true });
  fs.mkdirSync("public/assets/raw", { recursive: true });
  fs.mkdirSync("data", { recursive: true });
  const ext = path.extname(voice); fs.copyFileSync(voice, `public/voice${ext}`);

  let scenes = splitScript(script, totalSec);
  console.log(`${scenes.length} scenes`);
  const hook = await makeHook(scenes[0]?.text ?? "");

  const out: Scene[] = [];
  for (let i = 0; i < scenes.length; i += 6) {
    out.push(...(await processChunk(scenes.slice(i, i + 6))));
    console.log(`annotated ${Math.min(i + 6, scenes.length)}/${scenes.length}`);
  }

  // download + rembg/inpaint/red-border (falls back to CSS border if python is unavailable)
  for (const s of out) for (const [k, c] of s.cards.entries()) {
    if (c.kind !== "cutout" || !c.src) continue;
    const base = `s${s.id}_${k}`, raw = `public/assets/raw/${base}.jpg`, png = `public/assets/cutouts/${base}.png`;
    try {
      await download(c.src, raw);
      execFileSync("python3", ["scripts/cutout.py", raw, png], { stdio: "pipe" });
      c.src = `assets/cutouts/${base}.png`; c.baked = true;
    } catch (e) {
      console.warn(`cutout failed for ${base}, using CSS border:`, (e as Error).message.slice(0, 120));
      if (fs.existsSync(raw)) c.src = `assets/raw/${base}.jpg`;
    }
  }

  const credits = out.flatMap((s) => s.cards.flatMap((c) => (c.kind === "cutout" && c.credit ? [`scene ${s.id}: ${c.credit}`] : [])));
  fs.writeFileSync("data/credits.txt", credits.join("\n")); // paste into video description (CC-BY / CC-BY-SA need attribution)

  const project: Project = {
    totalSec, hook, scenes: out, voiceSrc: `voice${ext}`,
    globeSrc: fs.existsSync("public/earth.png") ? "earth.png" : undefined,
  };
    fs.writeFileSync("data/project.json", JSON.stringify(project, null, 2));
  console.log("done -> data/project.json   next: npm run render");
})();
