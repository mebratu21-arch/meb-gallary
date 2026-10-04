import { Router, type Request, type Response } from "express";
import multer from "multer";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { logger } from "../lib/logger.js";

export const imagesRouter = Router();

// ── Multer: memory storage, 10 MB max ────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP and GIF images are accepted."));
  },
});

// ── Cloudinary stream upload helper ──────────────────────────────────────────
function uploadToCloudinary(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

// ── Serialise image to DTO (all fields the client needs) ─────────────────────
function toImageDto(img: Record<string, unknown>) {
  return {
    id: img.id,
    publicId: img.publicId,
    url: img.url,
    format: img.format,
    width: img.width,
    height: img.height,
    bytes: img.bytes,
    title: img.title,
    description: (img.description as string | undefined) ?? "",
    tags: img.tags,
    isFavorite: (img.isFavorite as boolean | undefined) ?? false,
    isModerated: (img.isModerated as boolean | undefined) ?? false,
    aiCaption: (img.aiCaption as string | null | undefined) ?? null,
    aiCategory: (img.aiCategory as string | null | undefined) ?? null,
    aiTags: (img.aiTags as string[] | undefined) ?? [],
    source: (img.source as string | undefined) ?? "upload",
    createdAt: (img.createdAt as Date).toISOString(),
    updatedAt: (img.updatedAt as Date).toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/images/upload
// ─────────────────────────────────────────────────────────────────────────────
imagesRouter.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "No file uploaded." } });
      return;
    }

    const userId = req.user!.sub;
    const title = typeof req.body["title"] === "string" ? req.body["title"].trim() : "";
    const description = typeof req.body["description"] === "string" ? req.body["description"].trim() : "";
    const tagsRaw = typeof req.body["tags"] === "string" ? req.body["tags"] : "";
    const tags = tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean);

    try {
      const cloudResult = await uploadToCloudinary(req.file.buffer, `meb-gallery/${userId}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const image = await (prisma as any).image.create({
        data: {
          userId,
          publicId: cloudResult.public_id,
          url: cloudResult.secure_url,
          format: cloudResult.format,
          width: cloudResult.width,
          height: cloudResult.height,
          bytes: cloudResult.bytes,
          title,
          description,
          tags,
          source: "upload",
        },
      });

      res.status(201).json({ image: toImageDto(image) });
    } catch (err) {
      logger.error({ err }, "Image upload failed");
      res.status(500).json({
        error: { code: "UPLOAD_FAILED", message: "Failed to upload image. Please try again." },
      });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/images — paginated with search/filter
// Query: page, pageSize, search, favorite, source
// ─────────────────────────────────────────────────────────────────────────────
imagesRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query["pageSize"] ?? "20"), 10) || 20));
  const skip = (page - 1) * pageSize;
  const search = typeof req.query["search"] === "string" ? req.query["search"].trim() : undefined;
  const favorite = req.query["favorite"] === "true" ? true : undefined;
  const source = typeof req.query["source"] === "string" ? req.query["source"] : undefined;

  try {
    // Build where clause dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (favorite !== undefined) where.isFavorite = favorite;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { aiCaption: { contains: search, mode: "insensitive" } },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [images, total] = await (prisma as any).$transaction([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).image.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).image.count({ where }),
    ]);

    res.json({
      images: images.map(toImageDto),
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch images");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch images." } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/images/:id — single image
// ─────────────────────────────────────────────────────────────────────────────
imagesRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const image = await (prisma as any).image.findFirst({ where: { id: req.params.id, userId } });
    if (!image) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Image not found." } });
      return;
    }
    res.json({ image: toImageDto(image) });
  } catch (err) {
    logger.error({ err }, "Failed to fetch image");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch image." } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/images/:id — update title, description, tags
// ─────────────────────────────────────────────────────────────────────────────
imagesRouter.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { id } = req.params;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).image.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Image not found." } });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof req.body["title"] === "string") data.title = req.body["title"].trim();
    if (typeof req.body["description"] === "string") data.description = req.body["description"].trim();
    if (typeof req.body["tags"] === "string") {
      data.tags = (req.body["tags"] as string).split(",").map((t: string) => t.trim()).filter(Boolean);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).image.update({ where: { id }, data });
    res.json({ image: toImageDto(updated) });
  } catch (err) {
    logger.error({ err }, "Failed to update image");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update image." } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/images/:id/favorite — toggle favorite
// ─────────────────────────────────────────────────────────────────────────────
imagesRouter.patch("/:id/favorite", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { id } = req.params;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).image.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Image not found." } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).image.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });
    res.json({ image: toImageDto(updated) });
  } catch (err) {
    logger.error({ err }, "Failed to toggle favorite");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to toggle favorite." } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/images/:id
// ─────────────────────────────────────────────────────────────────────────────
imagesRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { id } = req.params;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const image = await (prisma as any).image.findFirst({ where: { id, userId } });
    if (!image) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Image not found." } });
      return;
    }
    await cloudinary.uploader.destroy(image.publicId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).image.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    logger.error({ err, imageId: id }, "Failed to delete image");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete image." } });
  }
});
