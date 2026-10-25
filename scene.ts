export type SfxName =
  | "paper-flip" | "metal-thud" | "lightbulb-tick" | "counting-tick"
  | "typewriter" | "whoosh" | "pop" | "hook-hit";

export type SfxEvent = { name: SfxName; at: number }; // seconds from scene start

export type Card =
  | { kind: "cutout"; query: string; src?: string; baked?: boolean; alt?: string; credit?: string; delay?: number }
  | { kind: "newspaper"; masthead: string; headline: string; sub?: string; highlight?: string; delay?: number }
  | { kind: "chart"; title: string; labels: string[]; values: number[]; source?: string; delay?: number }
  | { kind: "globe"; value: number; suffix?: string; label: string; sub?: string; route?: boolean; delay?: number }
  | { kind: "stat"; value: string; label: string; strike?: boolean; delay?: number };

export type Scene = {
  id: number;
  text: string;       // exact slice of the user's script
  startSec: number;
  durSec: number;
  title?: string;     // small caption on top ("SEVENTY YEARS AGO")
  headline?: string;  // big typewriter text
  highlight?: string[];
  kinetic?: string[]; // keyword pop-ups
  arrow?: boolean;
  cards: Card[];
  sfx: SfxEvent[];
};

export type Project = {
  totalSec: number;
  voiceSrc?: string;
  globeSrc?: string;
  hook?: string;
  scenes: Scene[];
};
