import { chat, parseJson } from "./openrouter";

// ---------- WOMAN FILTER (applies to EVERY image, found or generated; fails closed) ----------
const FEMALE = /\b(wom[ae]n|girls?|lady|ladies|female|females|bride|she|her|hers|mother|mom|mum|actress|model|waitress|businesswoman|schoolgirl|daughter|wife|queen|princess|nun|maid|mrs|miss|gal|bikini|lingerie|pregnant|salon|makeup|fashion|portrait)\b/i;
const CROWD = /\b(people|crowd|group|team|family|families|couple|friends|children|kids|students|audience|customers|persons?|community|together|meeting|party)\b/i;
const HUMAN = /\b(man|men|male|guy|boy|worker|workers|person|businessman|driver|captain|sailor|farmer|engineer|portrait|face|hand|hands)\b/i;

export const sanitizeQuery = (q: string) =>
  q.replace(FEMALE, "").replace(CROWD, "").replace(/\s+/g, " ").trim() || "cardboard box";

export type Img = { url: string; thumb: string; alt: string; credit: string; source: string };

export const textPass = (alt: string) => !FEMALE.test(alt) && !CROWD.test(alt);

/** Vision check. true = safe. If vision is unavailable, accept only object-only descriptions. */
export async function visionPass(imgUrl: string, alt: string): Promise<boolean> {
  try {
    const raw = await chat(
      [{ role: "user", content: [
        { type: "text", text: 'Look carefully, including background and edges. Reply ONLY JSON: {"woman":boolean,"any_person_uncertain":boolean,"has_text":boolean}. woman=true if ANY woman, girl or female-presenting person is visible even partially.' },
        { type: "image_url", image_url: { url: imgUrl } },
      ] }],
      process.env.VISION_MODEL || "google/gemini-2.0-flash-exp:free", 0,
    );
    const j = parseJson(raw);
    return j.woman === false && j.any_person_uncertain === false;
  } catch {
    return alt.length > 0 && !HUMAN.test(alt);
  }
}

const UA = { "User-Agent": "vox-agent/1.0 (personal video tool)" };
const strip = (h = "") => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ---------- Source 1: Wikimedia Commons (no key) ----------
async function wikimedia(q: string): Promise<Img[]> {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=15&gsrsearch=${encodeURIComponent("filetype:bitmap " + q)}&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1200`;
  const j = await (await fetch(u, { headers: UA })).json();
  return Object.values<any>(j.query?.pages ?? {}).flatMap((p) => {
    const ii = p.imageinfo?.[0]; if (!ii || !/jpeg|png/.test(ii.mime)) return [];
    const m = ii.extmetadata ?? {};
    const alt = [p.title, strip(m.ImageDescription?.value), strip(m.Categories?.value)].join(" ");
    return [{ url: ii.thumburl || ii.url, thumb: ii.thumburl || ii.url, alt, source: "wikimedia",
      credit: `${strip(m.Artist?.value) || "unknown"} / ${m.LicenseShortName?.value || "see Commons"} / ${ii.descriptionurl}` }];
  });
}

// ---------- Source 2: Openverse (no key; aggregates Flickr, museums, etc.) ----------
async function openverse(q: string): Promise<Img[]> {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=15&license_type=commercial&mature=false`;
  const j = await (await fetch(u, { headers: UA })).json();
  return (j.results ?? []).map((r: any) => ({
    url: r.url, thumb: r.thumbnail || r.url, source: "openverse",
    alt: [r.title, ...(r.tags ?? []).map((t: any) => t.name)].join(" "),
    credit: `${r.creator || "unknown"} / ${r.license} / ${r.foreign_landing_url}`,
  }));
}

// ---------- Source 3 (optional): Pixabay. Free but REQUIRES a free key. Skipped if no key. ----------
async function pixabay(q: string): Promise<Img[]> {
  const key = process.env.PIXABAY_API_KEY; if (!key) return [];
  const j = await (await fetch(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=15&safesearch=true`)).json();
  return (j.hits ?? []).map((h: any) => ({ url: h.largeImageURL, thumb: h.webformatURL, alt: h.tags, source: "pixabay", credit: `${h.user} / Pixabay / ${h.pageURL}` }));
}

/** Search the free internet. Returns the first image that passes text + vision checks, else null. */
export async function findCleanPhoto(query: string, maxVision = 5): Promise<Img | null> {
  const q = sanitizeQuery(query);
  const lists = await Promise.allSettled([wikimedia(q), openverse(q), pixabay(q)]);
  const cands = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : [])).filter((c) => textPass(c.alt));
  let n = 0;
  for (const c of cands) {
    if (n++ >= maxVision) break;
    if (await visionPass(c.thumb, c.alt)) return c;
  }
  return null;
}

// ---------- Fallback: Pollinations AI generation (free, no key) ----------
const poll = (kw: string, seed: number) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(`paper cutout illustration of ${kw}, vox style, grid paper, red border, no woman, no text`)}?width=1024&height=1024&nologo=true&seed=${seed}`;

/** Generate, then run the same woman check (image models often ignore "no woman"). Up to 3 seeds. */
export async function generateImage(keyword: string): Promise<Img | null> {
  const kw = sanitizeQuery(keyword);
  for (let seed = 1; seed <= 3; seed++) {
    const url = poll(kw, seed);
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
      if (await visionPass(dataUrl, kw)) return { url, thumb: url, alt: kw, source: "pollinations", credit: "AI generated (Pollinations)" };
    } catch { /* try next seed */ }
  }
  return null;
}

/** HYBRID: internet first, AI generation second. null = drop the card (never show an unverified image). */
export async function findImage(query: string): Promise<Img | null> {
  try { const p = await findCleanPhoto(query); if (p) return p; } catch (e) { console.warn("search:", (e as Error).message); }
  return generateImage(query);
}
