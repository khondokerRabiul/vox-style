import { Scene, SfxEvent } from "../types/scene";

const METAL = /\b(box(es)?|cargo|container(s)?|crate(s)?|metal|steel|iron|truck(s)?|ship(s)?|crane(s)?|dock(s)?|anchor|chain|freight)\b/i;
const IDEA = /\b(idea|ai|think(ing)?|thought|smart|invent(ed|ion)?|innovat\w*|brain|clever|realiz\w*|imagine|genius)\b/i;
const GROWTH = /(\bchart\b|growth|grew|rise|rose|percent|%|increase\w*|billion|million|rate|doubled|tripled|\d{2,})/i;

/** Position (0..1) of the first word matching rx inside the scene text. */
function posOf(text: string, rx: RegExp): number | null {
  const words = text.split(/\s+/);
  const i = words.findIndex((w) => rx.test(w));
  return i < 0 ? null : i / Math.max(1, words.length);
}

/** Deterministic SFX sync: script words + card types -> sound events. */
export function autoSfx(s: Scene): SfxEvent[] {
  const ev: SfxEvent[] = [];
  const at = (p: number) => Math.max(0, Math.min(s.durSec - 0.2, p * s.durSec));
  if (s.headline) ev.push({ name: "typewriter", at: 0.1 });
  s.cards.forEach((c, i) => {
    const t = c.delay ?? i * 0.6 + 0.15;
    if (c.kind === "newspaper") ev.push({ name: "paper-flip", at: t });
    else if (c.kind === "chart" || c.kind === "globe" || c.kind === "stat") {
      ev.push({ name: "paper-flip", at: t }, { name: "counting-tick", at: t + 0.35 });
    } else {
      const metal = METAL.test(s.text + " " + c.query);
      ev.push({ name: metal ? "metal-thud" : "paper-flip", at: t });
    }
  });
  const idea = posOf(s.text, IDEA);
  if (idea !== null) ev.push({ name: "lightbulb-tick", at: at(idea) });
  const gr = posOf(s.text, GROWTH);
  if (gr !== null && !s.cards.some((c) => c.kind === "chart" || c.kind === "globe"))
    ev.push({ name: "counting-tick", at: at(gr) });
  (s.kinetic ?? []).forEach((k) => {
    const p = posOf(s.text, new RegExp(k.split(" ")[0].replace(/[^\w]/g, ""), "i"));
    ev.push({ name: "pop", at: at(p ?? 0.3) });
  });
  if (s.arrow) ev.push({ name: "whoosh", at: 0.5 });
  ev.sort((a, b) => a.at - b.at);
  return ev.filter((e, i) => !ev.slice(0, i).some((p) => p.name === e.name && Math.abs(p.at - e.at) < 0.25));
}
