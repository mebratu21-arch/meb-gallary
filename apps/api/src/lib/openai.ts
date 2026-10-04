import OpenAI from "openai";
import { env } from "../config/env.js";

// Optional OpenAI singleton
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

/**
 * Helper: call Gemini generateContent with fallback models
 */
async function callGemini(contents: unknown[], systemPrompt?: string) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No GEMINI_API_KEY configured");

  const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const body: Record<string, unknown> = { contents };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { code?: number; message?: string };
      };

      if (data.error) {
        lastError = new Error(`Gemini (${model}): ${data.error.message}`);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n")
        .trim();

      if (text) return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Gemini request failed on all candidate models");
}

/**
 * analyzeImage — sends an image URL to Gemini Vision (or GPT-4o-mini Vision).
 * Returns structured { caption, category, tags }.
 */
export async function analyzeImage(imageUrl: string) {
  // 1. Try Gemini Vision first if GEMINI_API_KEY is available
  if (env.GEMINI_API_KEY) {
    try {
      // Fetch image bytes to supply inline to Gemini Vision
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Could not fetch image at ${imageUrl} (${imgRes.status})`);
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const prompt = `Analyze this image and return ONLY a JSON object with this exact structure:
{
  "caption": "A clear 1-2 sentence description of what is in the image.",
  "category": "One category word (e.g. nature, portrait, architecture, food, travel, art, technology, animals, sport, other)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Tags should be lowercase English words describing content, colors, mood, or style.`;

      const raw = await callGemini([
        {
          parts: [
            { inlineData: { mimeType: contentType.split(";")[0], data: base64 } },
            { text: prompt },
          ],
        },
      ]);

      const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(cleaned) as {
        caption?: unknown;
        category?: unknown;
        tags?: unknown;
      };

      if (typeof parsed.caption === "string" && Array.isArray(parsed.tags)) {
        return {
          caption: parsed.caption.trim(),
          category: typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "other",
          tags: (parsed.tags as unknown[])
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.toLowerCase().trim())
            .slice(0, 10),
        };
      }
    } catch {
      // If Gemini throws, fallback to OpenAI if configured
      if (!openai) throw new Error("Image analysis failed with AI provider");
    }
  }

  // 2. Fallback to OpenAI if configured
  if (openai) {
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
              text: `Analyze this image and return ONLY a JSON object with exactly this structure:
{
  "caption": "A clear 1-2 sentence description of what is in the image.",
  "category": "One category word (e.g. nature, portrait, architecture, food, travel, art, technology, animals, sport, other)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as {
      caption?: unknown;
      category?: unknown;
      tags?: unknown;
    };

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

  throw new Error("No AI API key (Gemini or OpenAI) is configured for image analysis.");
}

/**
 * smartSearchFilter — converts natural-language query into a safe filter object.
 * Returns { keywords, category, favorite }.
 */
export async function smartSearchFilter(query: string) {
  // 1. Try Gemini first
  if (env.GEMINI_API_KEY) {
    try {
      const prompt = `Convert this image search query into a JSON filter. Return ONLY valid JSON with:
{
  "keywords": ["keyword1", "keyword2"],
  "category": "category or null",
  "favorite": true | false | null
}
"keywords" are words to search in titles, descriptions, captions, and tags.
"category" is the image category to filter, or null.
"favorite" is true for favorites only, false for non-favorites, null for all.

Query: "${query}"`;

      const raw = await callGemini([{ parts: [{ text: prompt }] }]);
      const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
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
      // Continue to OpenAI fallback or local fallback
    }
  }

  // 2. Try OpenAI
  if (openai) {
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
}`,
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

  // 3. Fallback without AI: basic word splitting
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  return { keywords: words.length ? words : [query], category: null, favorite: null };
}

/**
 * generateImage — creates an image from a text prompt.
 * If OpenAI is configured with DALL-E, calls OpenAI;
 * otherwise uses a generative image endpoint with the user's prompt.
 */
export async function generateImage(prompt: string) {
  if (openai) {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      });
      const url = response.data?.[0]?.url;
      if (url) return url;
    } catch {
      // Fall through to generative endpoint fallback
    }
  }

  // Generative fallback: high quality generated image from prompt
  const encoded = encodeURIComponent(prompt.trim());
  const seed = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}`;
}

export { openai };
