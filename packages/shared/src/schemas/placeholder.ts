import { z } from "zod";

/** Placeholder schema — proves @meb-gallery/shared is importable from apps. */
export const placeholderSchema = z.object({
  id: z.string().uuid(),
  message: z.string().min(1),
});

export type PlaceholderData = z.infer<typeof placeholderSchema>;
