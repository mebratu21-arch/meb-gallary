import OpenAI from "openai";
import { env } from "../config/env.js";

// Singleton — only create the client once
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * analyzeImage — sends an image URL to GPT-4o-mini Vision.
 * Returns structured { caption, category, tags }.
 *
 * We use a strict prompt to get reliable structured JSON back.
 * We validate the structure before saving to the database.
 *
 * WHY NOT trust the AI output blindly?
 * AI output can be malformed. We always validate + sanitize before saving.
 */
export async function analyzeImage(imageUrl: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "low" },
          },
          {
            type: "text",
            text: `Analyze this image and return ONLY a JSON object with exactly this structure (no markdown, no extra text):
{
  "caption": "A clear 1-2 sentence description of what is in the image.",
  "category": "One category word (e.g. nature, portrait, architecture, food, travel, art, technology, animals, sport, other)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Tags should be lowercase English words describing content, colors, mood, or style.`,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() ?? "";
  const cleaned = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "");

  let parsed: { caption?: unknown; category?: unknown; tags?: unknown };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    throw new Error("OpenAI returned invalid JSON for image analysis");
  }

  if (typeof parsed.caption !== "string") throw new Error("Missing caption in AI response");
  if (!Array.isArray(parsed.tags)) throw new Error("Missing tags array in AI response");

  return {
    caption: parsed.caption.trim(),
    category: typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "other",
    tags: (parsed.tags as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase().trim())
      .slice(0, 10),
  };
}

/**
 * smartSearchFilter — converts natural-language query into a safe filter object.
 * The backend then uses this to build a Knex/Prisma query — NEVER executes AI SQL.
 */
export async function smartSearchFilter(query: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `Convert an image search query into a JSON filter. Return ONLY JSON with:
{
  "keywords": ["keyword1", "keyword2"],
  "category": "category or null",
  "favorite": true | false | null
}
"keywords" are words to search in titles, descriptions, captions, and tags.
"category" is the image category to filter, or null.
"favorite" is true for favorites only, false for non-favorites, null for all.`,
      },
      { role: "user", content: query },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() ?? "{}";
  const cleaned = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "");

  try {
    const parsed = JSON.parse(cleaned) as {
      keywords?: unknown;
      category?: unknown;
      favorite?: unknown;
    };
    return {
      keywords: Array.isArray(parsed.keywords)
        ? (parsed.keywords as unknown[]).filter((k): k is string => typeof k === "string")
        : [query],
      category: typeof parsed.category === "string" ? parsed.category : null,
      favorite: typeof parsed.favorite === "boolean" ? parsed.favorite : null,
    };
  } catch {
    return { keywords: [query], category: null, favorite: null };
  }
}

/**
 * generateImage — creates an image from a text prompt using DALL-E 3.
 * Returns a temporary URL (valid ~1 hour). Caller should immediately store in Cloudinary.
 */
export async function generateImage(prompt: string) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  const url = response.data?.[0]?.url;
  if (!url) throw new Error("OpenAI did not return an image URL");
  return url;
}

export { openai };
