import { z } from "zod";

// ── Single image DTO (returned by API) ──────────────────────────────────────

export const imageSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  publicId: z.string(),
  url: z.string().url(),
  format: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  title: z.string(),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  aiTags: z.array(z.string()).default([]),
  aiCaption: z.string().nullable().optional(),
  aiCategory: z.string().nullable().optional(),
  isFavorite: z.boolean().default(false),
  isModerated: z.boolean().default(false),
  source: z.enum(["upload", "ai_generated"]).default("upload"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type ImageDto = z.infer<typeof imageSchema>;

// ── Upload response ──────────────────────────────────────────────────────────

export const uploadImageResponseSchema = z.object({
  image: imageSchema,
});

export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;

// ── List response ────────────────────────────────────────────────────────────

export const listImagesResponseSchema = z.object({
  images: z.array(imageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  pages: z.number().int().nonnegative().optional(),
});

export type ListImagesResponse = z.infer<typeof listImagesResponseSchema>;
