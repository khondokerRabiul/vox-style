# Vox Agent: script + voiceover -> paper-cutout documentary MP4

Style extracted from your reference: warm grey grid paper + film grain, grayscale cutouts with a jagged red border,
heavy black typewriter headlines, yellow highlighter, orange counting stats, red hand-drawn arrows,
newspaper / chart / globe cards flying in, red X strike-through.

## Rules enforced in code
- No women: 3 layers in `agents/imageAgent.ts` (LLM prompt, alt-text/crowd filter, vision check). The vision check runs on found AND AI-generated images. Fails closed: unverified image = card dropped.
- No background music: none exists in `Composition.tsx`. Only voiceover + `public/sfx/*`.
- SFX sync: `lib/sfxRules.ts` maps script words/card types to paper-flip / metal-thud / lightbulb-tick / counting-tick / typewriter.

## Hybrid B-roll (no Pexels)
1. Search free internet images: Wikimedia Commons + Openverse (no key), Pixabay only if you add a free key.
2. Pass the text filter + vision check, then `scripts/cutout.py` removes background/text and adds the red border.
3. If nothing passes, generate with Pollinations (free, no key) using your prompt, then run the same woman check.
- Credits for found images are saved to `data/credits.txt`. Wikimedia/Openverse images can be CC-BY or CC-BY-SA, so paste credits in the video description.
- Unsplash Source was shut down by Unsplash, so it is not included.

## Keys
- `.env.local` already holds your OpenRouter key. It is git-ignored. Do NOT commit or share it.
- Vercel does not read `.env.local`. Add `OPENROUTER_API_KEY` in Vercel > Settings > Environment Variables.

## Two ways to run (mobile-friendly)
A) **Vercel = preview studio.** Deploy repo, add env vars from `.env.example`. Paste script, upload voiceover, preview, download `project.json`.
B) **GitHub Actions = final 8-min MP4** (Vercel can't render long video or run rembg). Add the `OPENROUTER_API_KEY` secret, commit `script.txt` + `voice.mp3`, run the "Render video" workflow, download the artifact.
   Or in Codespaces: `npm i && pip install -r requirements.txt && npm run sfx && npm run build:video -- --script script.txt --voice voice.mp3 && npm run render`

## Notes
- First rembg run downloads a ~170MB model.
- Replace the generated placeholder SFX in `public/sfx/` with real CC0 sounds (same file names).
- Optional: put a transparent earth PNG at `public/earth.png` for the globe card.
- Scene timing is proportional to text length. For frame-exact word sync, run Whisper on the voiceover and feed timestamps into `splitScript`.
- Code was written without running `npm install` or a render. Expect small fixes on first run.
