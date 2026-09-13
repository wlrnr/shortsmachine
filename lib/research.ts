import { z } from "zod";

export const mediaSchema = z.object({
  label: z.string().trim().min(1).max(100),
  url: z.string().url().max(2000),
});
export const researchSchema = z.object({
  hook: z.string().trim().min(1).max(240),
  why: z.string().trim().min(1).max(400),
  eventDate: z.string().max(100),
  caveat: z.string().max(400),
  media: z.array(mediaSchema).max(3),
  scores: z.object({
    surprise: z.number().int().min(0).max(5),
    twist: z.number().int().min(0).max(5),
    visual: z.number().int().min(0).max(5),
    credibility: z.number().int().min(0).max(5),
  }),
});
export type Research = z.infer<typeof researchSchema>;
export type Topic = { title: string; source: string; notes: string; research?: Research };
export const candidateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  source: z.string().url().max(2000),
  notes: z.string().trim().min(40).max(2500),
  eventDate: z.string().max(100),
  caveat: z.string().max(400),
  media: z.array(mediaSchema).max(3),
});
export type Candidate = z.infer<typeof candidateSchema> & { id: string };
export const discoverySchema = {
  type: "object", additionalProperties: false,
  properties: { candidates: { type: "array", items: {
    type: "object", additionalProperties: false,
    properties: {
      title: { type: "string" }, source: { type: "string" }, notes: { type: "string" },
      eventDate: { type: "string" }, caveat: { type: "string" },
      media: { type: "array", items: { type: "object", additionalProperties: false,
        properties: { label: { type: "string" }, url: { type: "string" } }, required: ["label", "url"] } },
    }, required: ["title", "source", "notes", "eventDate", "caveat", "media"],
  } } }, required: ["candidates"],
};
const scoreProperties = Object.fromEntries(["surprise", "twist", "visual", "credibility"].map(k => [k, { type: "integer", minimum: 0, maximum: 5 }]));
export const selectionSchema = {
  type: "object", additionalProperties: false,
  properties: { selections: { type: "array", items: {
    type: "object", additionalProperties: false,
    properties: {
      id: { type: "string" }, hook: { type: "string" }, why: { type: "string" },
      scores: { type: "object", properties: scoreProperties, required: Object.keys(scoreProperties), additionalProperties: false },
    }, required: ["id", "hook", "why", "scores"],
  } } }, required: ["selections"],
};

export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname === "localhost" || /^(127\.|10\.|192\.168\.|169\.254\.|\[)/.test(url.hostname)) return null;
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(k)) url.searchParams.delete(k);
    return url.href.replace(/\/$/, "");
  } catch { return null; }
}

// URL membership proves a link appeared in search, not that every claim is fact-checked.
export function observedSources(response: any): Set<string> {
  const urls = new Set<string>();
  for (const item of response.output ?? []) {
    if (item.type === "web_search_call") {
      for (const source of item.action?.sources ?? []) {
        const url = safeUrl(source.url); if (url) urls.add(url);
      }
      for (const raw of [item.action?.url, ...(item.action?.urls ?? [])]) {
        const url = safeUrl(raw); if (url) urls.add(url);
      }
    }
    for (const content of item.content ?? []) for (const ref of content.annotations ?? []) {
      if (ref.type === "url_citation") { const url = safeUrl(ref.url); if (url) urls.add(url); }
    }
  }
  return urls;
}
export function verifiedCandidates(raw: unknown, response: any): Omit<Candidate, "id">[] {
  if (!Array.isArray(raw)) return [];
  const observed = observedSources(response);
  return raw.slice(0, 8).flatMap(value => {
    const result = candidateSchema.safeParse(value);
    if (!result.success) return [];
    const candidate = result.data;
    const source = safeUrl(candidate.source);
    if (!source || !observed.has(source)) return [];
    return [{ ...candidate, source, media: candidate.media.flatMap(m => {
      const url = safeUrl(m.url);
      return url && observed.has(url) ? [{ ...m, url }] : [];
    }) }];
  });
}
export function mergeCandidates(groups: Omit<Candidate, "id">[][]): Candidate[] {
  const seenUrls = new Set<string>(), seenTitles = new Set<string>();
  return groups.flat().filter(c => {
    const title = c.title.toLowerCase().replace(/\s+/g, "");
    if (seenUrls.has(c.source) || seenTitles.has(title)) return false;
    seenUrls.add(c.source); seenTitles.add(title); return true;
  }).map((c, i) => ({ ...c, id: "c" + (i + 1) }));
}
export function selectedTopics(candidates: Candidate[], raw: unknown): Topic[] {
  if (!Array.isArray(raw)) return [];
  const selection = z.object({ id: z.string(), hook: researchSchema.shape.hook, why: researchSchema.shape.why, scores: researchSchema.shape.scores });
  const seen = new Set<string>();
  return raw.flatMap(value => {
    const parsed = selection.safeParse(value); if (!parsed.success) return [];
    const s = parsed.data, c = candidates.find(candidate => candidate.id === s.id);
    if (!c || seen.has(c.id) || s.scores.credibility < 3) return [];
    seen.add(c.id);
    return [{ title: c.title, source: c.source, notes: c.notes, research: {
      hook: s.hook, why: s.why, scores: s.scores, eventDate: c.eventDate, caveat: c.caveat, media: c.media,
    } }];
  }).sort((a, b) => totalScore(b.research!) - totalScore(a.research!)).slice(0, 5);
}
export function totalScore(r: Research) { return Object.values(r.scores).reduce((n, score) => n + score, 0); }
export function savedResearch(raw?: string): Research | null {
  try { const parsed = researchSchema.safeParse(JSON.parse(raw || "{}")); return parsed.success ? parsed.data : null; } catch { return null; }
}
