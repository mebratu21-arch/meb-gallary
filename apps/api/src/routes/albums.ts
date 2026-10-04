import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { logger } from "../lib/logger.js";

export const albumsRouter = Router();

// All album routes require authentication
albumsRouter.use(requireAuth);

// ─── GET /api/albums ──────────────────────────────────────────────────────────
albumsRouter.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albums = await (prisma as any).album.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        albumImages: {
          include: { image: { select: { url: true } } },
          take: 1,
          orderBy: { addedAt: "desc" },
        },
        _count: { select: { albumImages: true } },
      },
    });

    // Reshape for cleaner API response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = albums.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      coverUrl: a.albumImages[0]?.image?.url ?? null,
      imageCount: a._count.albumImages,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    res.json({ albums: result });
  } catch (err) {
    logger.error({ err }, "Failed to list albums");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list albums." } });
  }
});

// ─── POST /api/albums ─────────────────────────────────────────────────────────
albumsRouter.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { name, description = "" } = req.body as { name?: string; description?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Album name is required." } });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const album = await (prisma as any).album.create({
      data: { userId, name: name.trim(), description: description.trim() },
    });
    res.status(201).json({ album });
  } catch (err) {
    logger.error({ err }, "Failed to create album");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create album." } });
  }
});

// ─── GET /api/albums/:id — album with images ──────────────────────────────────
albumsRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const album = await (prisma as any).album.findFirst({
      where: { id: req.params.id, userId },
      include: {
        albumImages: {
          include: { image: true },
          orderBy: { addedAt: "desc" },
        },
      },
    });
    if (!album) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Album not found." } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json({ album: { ...album, images: album.albumImages.map((ai: any) => ai.image) } });
  } catch (err) {
    logger.error({ err }, "Failed to get album");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get album." } });
  }
});

// ─── PATCH /api/albums/:id ────────────────────────────────────────────────────
albumsRouter.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { name, description } = req.body as { name?: string; description?: string };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).album.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Album not found." } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (name?.trim()) data.name = name.trim();
    if (description !== undefined) data.description = description.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const album = await (prisma as any).album.update({ where: { id: req.params.id }, data });
    res.json({ album });
  } catch (err) {
    logger.error({ err }, "Failed to update album");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update album." } });
  }
});

// ─── DELETE /api/albums/:id ───────────────────────────────────────────────────
albumsRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).album.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Album not found." } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).album.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete album");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete album." } });
  }
});

// ─── POST /api/albums/:id/images — add image to album ────────────────────────
albumsRouter.post("/:id/images", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { imageId } = req.body as { imageId?: string };
  if (!imageId) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "imageId is required." } });
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const album = await (prisma as any).album.findFirst({ where: { id: req.params.id, userId } });
    if (!album) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Album not found." } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).albumImage.upsert({
      where: { albumId_imageId: { albumId: req.params.id, imageId } },
      update: {},
      create: { albumId: req.params.id, imageId },
    });
    res.status(201).json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to add image to album");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to add image to album." } });
  }
});

// ─── DELETE /api/albums/:id/images/:imageId ───────────────────────────────────
albumsRouter.delete("/:id/images/:imageId", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const album = await (prisma as any).album.findFirst({ where: { id: req.params.id, userId } });
    if (!album) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Album not found." } });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).albumImage.delete({
      where: { albumId_imageId: { albumId: req.params.id, imageId: req.params.imageId } },
    });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to remove image from album");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to remove image from album." } });
  }
});
