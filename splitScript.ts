import { Scene } from "../types/scene";

/** Deterministic: user's exact words -> scenes (1-2 sentences, ~4-8s) with timing that sums to the voiceover length. */
export function splitScript(script: string, totalSec: number): Scene[] {
  const sentences = script.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [];
  const groups: string[] = [];
  let cur = "";
  for (const s of sentences.map((x) => x.trim())) {
    if (cur && (cur + " " + s).split(" ").length > 24) { groups.push(cur); cur = s; }
    else cur = cur ? cur + " " + s : s;
  }
  if (cur) groups.push(cur);
  // time weight = characters + a pause bonus per punctuation mark
  const w = groups.map((g) => g.length + (g.match(/[,.;:!?]/g)?.length ?? 0) * 6);
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return groups.map((text, id) => {
    const durSec = (w[id] / sum) * totalSec;
    const sc: Scene = { id, text, startSec: t, durSec, cards: [], sfx: [] };
    t += durSec;
    return sc;
  });
}
