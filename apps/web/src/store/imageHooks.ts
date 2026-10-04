import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient.js";
import type { ImageDto, ListImagesResponse, UploadImageResponse } from "@meb-gallery/shared";

// ── Query Keys ────────────────────────────────────────────────────────────────

export interface ImageFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  favorite?: boolean;
  source?: string;
}

export const imageKeys = {
  all: ["images"] as const,
  lists: () => [...imageKeys.all, "list"] as const,
  list: (params: ImageFilterParams) => [...imageKeys.lists(), params] as const,
  detail: (id: string) => [...imageKeys.all, "detail", id] as const,
  albums: ["albums"] as const,
  albumDetail: (id: string) => ["albums", "detail", id] as const,
  adminStats: ["admin", "stats"] as const,
  adminUsers: (page: number) => ["admin", "users", page] as const,
};

// ── Fetch list ────────────────────────────────────────────────────────────────

export function useImages(params: ImageFilterParams = {}) {
  const { page = 1, pageSize = 24, search, favorite, source } = params;

  return useQuery({
    queryKey: imageKeys.list({ page, pageSize, search, favorite, source }),
    queryFn: async () => {
      const query: Record<string, string | number | boolean> = { page, pageSize };
      if (search) query.search = search;
      if (favorite !== undefined) query.favorite = favorite;
      if (source) query.source = source;

      const { data } = await apiClient.get<ListImagesResponse>("/api/images", {
        params: query,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

// ── Fetch single image ────────────────────────────────────────────────────────

export function useImage(id: string) {
  return useQuery({
    queryKey: imageKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{ image: ImageDto }>(`/api/images/${id}`);
      return data.image;
    },
    enabled: Boolean(id),
  });
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadImageInput {
  file: File;
  title?: string;
  description?: string;
  tags?: string;
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadImageInput) => {
      const form = new FormData();
      form.append("file", input.file);
      if (input.title) form.append("title", input.title);
      if (input.description) form.append("description", input.description);
      if (input.tags) form.append("tags", input.tags);

      const { data } = await apiClient.post<UploadImageResponse>("/api/images/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.image;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: imageKeys.all });
    },
  });
}

// ── Toggle Favorite ───────────────────────────────────────────────────────────

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      const { data } = await apiClient.patch<{ image: ImageDto }>(`/api/images/${imageId}/favorite`);
      return data.image;
    },
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: imageKeys.all });
      if (updated?.id) {
        qc.setQueryData(imageKeys.detail(updated.id), updated);
      }
    },
  });
}

// ── Update Image Metadata ─────────────────────────────────────────────────────

export interface UpdateImageInput {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export function useUpdateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateImageInput) => {
      const { data } = await apiClient.patch<{ image: ImageDto }>(`/api/images/${id}`, patch);
      return data.image;
    },
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: imageKeys.all });
      if (updated?.id) {
        qc.setQueryData(imageKeys.detail(updated.id), updated);
      }
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      await apiClient.delete(`/api/images/${imageId}`);
      return imageId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: imageKeys.all });
    },
  });
}

// ── AI Analysis ───────────────────────────────────────────────────────────────

export function useAnalyzeImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      const { data } = await apiClient.post<{
        image: ImageDto;
        analysis: { caption: string; category: string; tags: string[] };
      }>(`/api/ai/analyze/${imageId}`);
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: imageKeys.all });
      if (data?.image?.id) {
        qc.setQueryData(imageKeys.detail(data.image.id), data.image);
      }
    },
  });
}
