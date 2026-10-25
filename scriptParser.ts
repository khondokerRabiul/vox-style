import { Card, Scene } from "../types/scene";
import { chat, parseJson } from "./openrouter";

const SYSTEM = `You are the scene director for a Vox-style paper-cutout documentary.
You receive numbered script scenes. For EACH scene return visuals as JSON only.

HARD RULES:
- Never mention or imply women, girls, female people, mothers, brides, models, crowds, families, couples, groups of people. Cutout queries must be OBJECTS, machines, products, places, animals, or a single MAN (e.g. "dock worker man").
- Queries: 2-4 concrete English words, photographable on a plain background (e.g. "cargo container ship", "wooden crate", "cotton sacks").
- Max 2 cards per scene. Vary kinds; do not use the same kind in 3 scenes in a row.
- "newspaper": only for a claim/event/announcement. masthead is a FICTIONAL newspaper name. Max 1 per ~8 scenes.
- "chart": only when the scene has growth/numbers over time. values = 5-8 numbers, labels = same count.
- "globe": only for global/world/percent-of-trade statements. value = number.
- "stat": for a single money/number fact. value is a short string like "$5.00".
- title: tiny uppercase caption (<=4 words) or "".
- headline: big text (<=5 words) taken from the scene's key phrase, or "".
- kinetic: 0-2 single important words from the scene text. highlight: 0-1 word inside headline.
- arrow: true if headline points at a card.

Return: {"scenes":[{"i":0,"title":"","headline":"","highlight":[],"kinetic":[],"arrow":false,"cards":[{"kind":"cutout","query":"..."}]}]}
Card shapes: {"kind":"cutout","query"} | {"kind":"newspaper","masthead","headline","sub"} | {"kind":"chart","title","labels":[],"values":[],"source"} | {"kind":"globe","value":80,"suffix":"%","label","sub"} | {"kind":"stat","value":"$5.00","label","strike":false}`;

const STOP = new Set("the a an and or but of to in on at for with from by is are was were be been it its this that these those as then than so we you they he his him i our your their there here not no yes just very more most into out over under about".split(" "));

/** Fallback if the LLM fails: one cutout from the most "noun-like" long word. */
export function heuristicAnnotate(s: Scene): Partial<Scene> {
  const words = s.text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 4 && !STOP.has(w));
  const q = words.slice(0, 2).join(" ") || "cardboard box";
  const cards: Card[] = [{ kind: "cutout", query: q }];
  return { cards, kinetic: words[0] ? [words[0]] : [], headline: "", title: "" };
}

export async function annotateScenes(scenes: Scene[]): Promise<Scene[]> {
  try {
    const prompt = scenes.map((s, i) => `${i}. ${s.text}`).join("\n");
    const out = parseJson(await chat([{ role: "system", content: SYSTEM }, { role: "user", content: prompt }]));
    return scenes.map((s, i) => {
      const a = out.scenes?.find((x: any) => x.i === i);
      if (!a || !Array.isArray(a.cards)) return { ...s, ...heuristicAnnotate(s) } as Scene;
      return {
        ...s, title: a.title || undefined, headline: a.headline || undefined,
        highlight: a.highlight ?? [], kinetic: (a.kinetic ?? []).slice(0, 2), arrow: !!a.arrow,
        cards: a.cards.slice(0, 2).map((c: Card, k: number) => ({ ...c, delay: k * 0.6 + 0.15 })),
      };
    });
  } catch (e) {
    console.warn("LLM annotate failed, using heuristic:", (e as Error).message);
    return scenes.map((s) => ({ ...s, ...heuristicAnnotate(s) }) as Scene);
  }
}

export async function makeHook(firstText: string): Promise<string> {
  try {
    const r = await chat([
      { role: "system", content: "Write ONE punchy curiosity-gap question (max 8 words) that hooks viewers in 3 seconds. No women/people references. Output only the question." },
      { role: "user", content: firstText },
    ]);
    return r.trim().replace(/^["']|["']$/g, "").slice(0, 70);
  } catch { return firstText.split(/[.!?]/)[0].slice(0, 60) + "?"; }
}
