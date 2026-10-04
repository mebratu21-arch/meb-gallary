import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { logger } from "../lib/logger.js";

export const adminRouter = Router();

// ── Admin auth guard ──────────────────────────────────────────────────────────
adminRouter.use(requireAuth, (req: Request, res: Response, next) => {
  if (req.user!.role !== "ADMIN") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required." } });
    return;
  }
  next();
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
adminRouter.get("/stats", async (_req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [totalUsers, totalImages, aiGenerated, unmoderated] = await (prisma as any).$transaction([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).user.count(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).image.count(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).image.count({ where: { source: "ai_generated" } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).image.count({ where: { isModerated: false } }),
    ]);

    res.json({ stats: { totalUsers, totalImages, aiGenerated, unmoderated } });
  } catch (err) {
    logger.error({ err }, "Failed to fetch admin stats");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch stats." } });
  }
});

// ─── GET /api/admin/users — paginated user list ───────────────────────────────
adminRouter.get("/users", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10) || 1);
  const pageSize = Math.min(50, parseInt(String(req.query["pageSize"] ?? "20"), 10) || 20);
  const skip = (page - 1) * pageSize;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [users, total] = await (prisma as any).$transaction([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).user.findMany({
        skip, take: pageSize,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { images: true } } },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).user.count(),
    ]);
    res.json({ users, total, page, pageSize });
  } catch (err) {
    logger.error({ err }, "Failed to list users");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list users." } });
  }
});

// ─── PATCH /api/admin/users/:id/role — promote/demote ────────────────────────
adminRouter.patch("/users/:id/role", async (req: Request, res: Response) => {
  const { role } = req.body as { role?: string };
  if (role !== "USER" && role !== "ADMIN") {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Role must be USER or ADMIN." } });
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma as any).user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    logger.error({ err }, "Failed to update user role");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update role." } });
  }
});
