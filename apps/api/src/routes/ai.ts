import { Router, type Request, type Response } from "express";
import { cloudinary } from "../lib/cloudinary.js";
import { prisma } from "../lib/prisma.js";
import { requireActiveAuth } from "../middleware/requireActiveAuth.js";
import { assertAllowedRemoteImageUrl } from "../lib/remoteUrl.js";
import { logger } from "../lib/logger.js";
import { analyzeImage, smartSearchFilter, generateImage } from "../lib/openai.js";

export const aiRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze/:imageId
// Sends the Cloudinary URL to GPT-4o Vision, saves results to DB.
// ─────────────────────────────────────────────────────────────────────────────
aiRouter.post("/analyze/:imageId", requireActiveAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { imageId } = req.params;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const image = await (prisma as any).image.findFirst({ where: { id: imageId, userId } });
    if (!image) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Image not found." } });
      return;
    }

    // Call OpenAI — this is the ONLY place the API key is used
    const { caption, category, tags } = await analyzeImage(image.url);

    // Save validated results to DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).image.update({
      where: { id: imageId },
      data: { aiCaption: caption, aiCategory: category, aiTags: tags },
    });

    res.json({
      image: updated,
      analysis: { caption, category, tags },
    });
  } catch (err) {
    logger.error({ err }, "AI analysis failed");
    res.status(500).json({
      error: {
        code: "AI_ERROR",
        message: err instanceof Error ? err.message : "AI analysis failed. Please try again.",
      },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/search
// Body: { query: "show me nature photos" }
// AI converts the query to a safe filter → we build the DB query.
// IMPORTANT: We NEVER execute raw AI-generated SQL.
// ─────────────────────────────────────────────────────────────────────────────
aiRouter.post("/search", requireActiveAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string" || !query.trim()) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Search query is required." } });
    return;
  }

  try {
    const filter = await smartSearchFilter(query.trim());

    // Build a safe Prisma where clause from the validated filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (filter.favorite !== null) where.isFavorite = filter.favorite;
    if (filter.category) where.aiCategory = filter.category;

    if (filter.keywords.length > 0) {
      where.OR = filter.keywords.flatMap((kw: string) => [
        { title: { contains: kw, mode: "insensitive" } },
        { description: { contains: kw, mode: "insensitive" } },
        { aiCaption: { contains: kw, mode: "insensitive" } },
      ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = await (prisma as any).image.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ images, filter, query });
  } catch (err) {
    logger.error({ err }, "AI search failed");
    res.status(500).json({
      error: { code: "AI_ERROR", message: "AI search failed. Please try again." },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/generate
// Body: { prompt: "A futuristic city at sunset" }
// Generates an image with DALL-E 3, stores permanently in Cloudinary + DB.
// ─────────────────────────────────────────────────────────────────────────────
aiRouter.post("/generate", requireActiveAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { prompt } = req.body as { prompt?: string };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "A text prompt is required." } });
    return;
  }
  if (prompt.length > 1000) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Prompt must be under 1000 characters." } });
    return;
  }

  try {
    // 1. Generate from OpenAI (returns a temporary ~1hr URL)
    const tempUrl = await generateImage(prompt.trim());
    assertAllowedRemoteImageUrl(tempUrl);

    // 2. Upload to Cloudinary for permanent CDN storage
    const cloudResult = await cloudinary.uploader.upload(tempUrl, {
      folder: `meb-gallery/${userId}/generated`,
      resource_type: "image",
    });

    // 3. Save record to PostgreSQL with source="ai_generated"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const image = await (prisma as any).image.create({
      data: {
        userId,
        publicId: cloudResult.public_id,
        url: cloudResult.secure_url,
        format: cloudResult.format ?? "png",
        width: cloudResult.width ?? 1024,
        height: cloudResult.height ?? 1024,
        bytes: cloudResult.bytes ?? 0,
        title: prompt.trim().slice(0, 120),
        description: `AI-generated: ${prompt.trim()}`,
        source: "ai_generated",
        aiCaption: prompt.trim(),
        aiTags: ["ai-generated", "dall-e-3"],
        tags: ["ai-generated"],
      },
    });

    res.status(201).json({ image });
  } catch (err) {
    logger.error({ err }, "AI image generation failed");
    res.status(500).json({
      error: { code: "AI_ERROR", message: "Image generation failed. Please try again." },
    });
  }
});
