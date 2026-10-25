import { Scene } from "../types/scene";
import { annotateScenes } from "./scriptParser";
import { findImage } from "./imageAgent";
import { autoSfx } from "../lib/sfxRules";

/** annotate (LLM) -> hybrid image search (internet, then AI) with woman filter -> auto SFX. */
export async function processChunk(scenes: Scene[]): Promise<Scene[]> {
  const annotated = await annotateScenes(scenes);
  for (const s of annotated) {
    for (const c of s.cards) {
      if (c.kind !== "cutout") continue;
      const img = await findImage(c.query);
      if (img) { c.src = img.url; c.alt = img.alt; c.credit = `${img.source}: ${img.credit}`; }
      else console.warn(`[no clean image] "${c.query}" -> card skipped`);
    }
    s.cards = s.cards.filter((c) => c.kind !== "cutout" || c.src);
    s.sfx = autoSfx(s);
  }
  return annotated;
}
