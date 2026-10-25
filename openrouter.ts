const URL = "https://openrouter.ai/api/v1/chat/completions";

export async function chat(messages: any[], model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free", temperature = 0.4): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export function parseJson<T = any>(raw: string): T {
  const s = raw.replace(/```json|```/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  return JSON.parse(s.slice(a, b + 1));
}
