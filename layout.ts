import { Card } from "../types/scene";
export type Slot = { x: number; y: number; w: number; rot: number };

// Auto layout so the LLM never has to output coordinates.
export function layoutCards(cards: Card[], hasHeadline: boolean): Slot[] {
  const y = hasHeadline ? 720 : 560;
  const n = cards.length;
  const big = (c: Card) => c.kind !== "cutout" && c.kind !== "stat";
  if (n === 1) return [{ x: 960, y, w: big(cards[0]) ? (hasHeadline ? 760 : 1000) : 640, rot: -2 }];
  if (n === 2) return [
    { x: 560, y, w: big(cards[0]) ? 720 : 520, rot: -3 },
    { x: 1360, y, w: big(cards[1]) ? 720 : 520, rot: 2.5 },
  ];
  return [
    { x: 400, y, w: 480, rot: -4 }, { x: 960, y, w: 480, rot: 1.5 }, { x: 1520, y, w: 480, rot: 3.5 },
  ].slice(0, n);
}
