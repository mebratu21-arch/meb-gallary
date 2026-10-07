import { useState, useCallback, useMemo } from "react";
import { useImages } from "../store/imageHooks.js";
import { apiClient } from "../lib/apiClient.js";
import { ImageCard, type ImageDto } from "../components/ImageCard.js";
import { UploadModal } from "../components/UploadModal.js";
import { Lightbox } from "../components/Lightbox.js";
import { useQueryClient } from "@tanstack/react-query";
import { imageKeys } from "../store/imageHooks.js";
import { DEMO_IMAGES } from "../data/demoImages.js";
import "./GalleryPage.css";

type FilterTab = "all" | "favorites" | "ai_generated";

export function GalleryPage() {
  const qc = useQueryClient();

  // ── Filter + search state ─────────────────────────────────────────────────
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  // ── Local demo favorites state ───────────────────────────────────────────
  const [demoFavorites, setDemoFavorites] = useState<Record<string, boolean>>({
    "demo-mountains": true,
    "demo-ocean": true,
    "demo-rose": true,
    "demo-forest": true,
  });

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);

  // ── Lightbox state ────────────────────────────────────────────────────────
  const [lightboxImage, setLightboxImage] = useState<ImageDto | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // ── Build query params ────────────────────────────────────────────────────
  const queryParams = {
    page,
    pageSize: 24,
    ...(tab === "favorites" ? { favorite: true } : {}),
    ...(tab === "ai_generated" ? { source: "ai_generated" } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading, isError } = useImages(queryParams);

  // User uploaded images from API
  const apiImages: ImageDto[] = (data?.images as ImageDto[] | undefined) ?? [];
  const isUsingDemo = !isLoading && (isError || apiImages.length === 0);

  // Filtered demo images when using demo showcase
  const displayImages: ImageDto[] = useMemo(() => {
    if (!isUsingDemo) return apiImages;

    return DEMO_IMAGES.map((img) => ({
      ...img,
      isFavorite: demoFavorites[img.id] ?? img.isFavorite,
    })).filter((img) => {
      if (tab === "favorites" && !img.isFavorite) return false;
      if (tab === "ai_generated" && img.source !== "ai_generated" && !img.aiCaption) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = img.title.toLowerCase().includes(q);
        const matchesDesc = img.description.toLowerCase().includes(q);
        const matchesTags = img.tags.some((t) => t.toLowerCase().includes(q));
        const matchesAi = img.aiCaption?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesAi) return false;
      }
      return true;
    });
  }, [isUsingDemo, apiImages, demoFavorites, tab, search]);

  const total = isUsingDemo ? displayImages.length : data?.total ?? 0;
  const pages = isUsingDemo ? 1 : data?.pages ?? 1;

  // ── Favorite toggle ───────────────────────────────────────────────────────
  const handleFavoriteToggle = useCallback(async (id: string) => {
    if (id.startsWith("demo-")) {
      setDemoFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    try {
      await apiClient.patch(`/api/images/${id}/favorite`);
      void qc.invalidateQueries({ queryKey: imageKeys.all });
    } catch {
      /* silently ignore */
    }
  }, [qc]);

  // ── Lightbox navigation ───────────────────────────────────────────────────
  const openLightbox = (image: ImageDto) => {
    const idx = displayImages.findIndex((img) => img.id === image.id);
    setLightboxIdx(idx);
    setLightboxImage(image);
  };

  const closeLightbox = () => setLightboxImage(null);

  const lightboxPrev = () => {
    const newIdx = lightboxIdx - 1;
    if (newIdx >= 0) { setLightboxIdx(newIdx); setLightboxImage(displayImages[newIdx]!); }
  };

  const lightboxNext = () => {
    const newIdx = lightboxIdx + 1;
    if (newIdx < displayImages.length) { setLightboxIdx(newIdx); setLightboxImage(displayImages[newIdx]!); }
  };

  // ── Search submit ─────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="page gallery-page">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="gallery-header container">
        <div className="gallery-header__left">
          <h1 className="gold-text gallery-title">Meb Gallery</h1>
          <p className="gallery-subtitle">
            {isUsingDemo ? "Showcase Collection • 6 Sample Masterpieces" : `${total} images`}
          </p>
        </div>
        <button
          id="upload-btn"
          className="btn btn-primary"
          onClick={() => setShowUpload(true)}
        >
          + Upload Photo
        </button>
      </div>

      {/* ── Demo Mode Banner ──────────────────────────────────────────────── */}
      {isUsingDemo && (
        <div className="container" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              background: "linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(255, 255, 255, 0.03))",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              borderRadius: "12px",
              padding: "0.75rem 1.25rem",
              fontSize: "0.875rem",
              color: "#e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>✨</span>
              <span>
                <strong>Curated Demo Showcase:</strong> Sample high-resolution photography ready to browse, inspect, and favorite.
              </span>
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}
              onClick={() => setShowUpload(true)}
            >
              Upload Your Own
            </button>
          </div>
        </div>
      )}

      {/* ── Filter tabs + search ───────────────────────────────────────────── */}
      <div className="gallery-controls container">
        <div className="gallery-tabs">
          {(["all", "favorites", "ai_generated"] as FilterTab[]).map((t) => (
            <button
              key={t}
              id={`tab-${t}`}
              className={`gallery-tab ${tab === t ? "gallery-tab--active" : ""}`}
              onClick={() => { setTab(t); setPage(1); }}
            >
              {t === "all" ? "All Photos" : t === "favorites" ? "♥ Favorites" : "✦ AI Curated"}
            </button>
          ))}
        </div>

        <form className="gallery-search" onSubmit={handleSearch}>
          <input
            id="search-input"
            className="input gallery-search__input"
            type="text"
            placeholder="Search by title, tags, AI caption…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {search && (
            <button type="button" className="gallery-search__clear" onClick={clearSearch}>✕</button>
          )}
          <button id="search-submit" type="submit" className="btn btn-ghost gallery-search__btn">🔍</button>
        </form>
      </div>

      {/* ── Active search indicator ────────────────────────────────────────── */}
      {search && (
        <div className="container gallery-search-indicator">
          Searching for: <span className="gold-text">"{search}"</span>
          <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "0.75rem" }} onClick={clearSearch}>Clear</button>
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div className="container">
        {isLoading && (
          <div className="gallery-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="gallery-skeleton shimmer" />
            ))}
          </div>
        )}

        {!isLoading && displayImages.length === 0 && (
          <div className="gallery-empty">
            <span className="gallery-empty__icon">{tab === "favorites" ? "♡" : "🖼️"}</span>
            <h3>{tab === "favorites" ? "No favorites yet" : search ? "No results found" : "Your gallery is empty"}</h3>
            <p>
              {tab === "favorites"
                ? "Click the heart icon on any photo to favorite it."
                : search
                ? `No images match "${search}".`
                : "Upload your first image to get started."}
            </p>
            {!search && tab === "all" && (
              <button id="empty-upload-btn" className="btn btn-primary" onClick={() => setShowUpload(true)}>
                Upload First Image
              </button>
            )}
          </div>
        )}

        {!isLoading && displayImages.length > 0 && (
          <div className="gallery-grid">
            {displayImages.map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                onFavoriteToggle={handleFavoriteToggle}
                onDeleted={() => void qc.invalidateQueries({ queryKey: imageKeys.all })}
                onImageClick={openLightbox}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {pages > 1 && (
          <div className="gallery-pagination">
            <button
              id="prev-page-btn"
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            <span className="gallery-page-info">Page {page} of {pages}</span>
            <button
              id="next-page-btn"
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Upload modal ──────────────────────────────────────────────────── */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          onClose={closeLightbox}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
          hasPrev={lightboxIdx > 0}
          hasNext={lightboxIdx < displayImages.length - 1}
        />
      )}
    </div>
  );
}
