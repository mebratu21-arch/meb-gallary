import { useEffect, useCallback } from "react";
import type { ImageDto } from "./ImageCard.js";
import "./Lightbox.css";

interface Props {
  image: ImageDto;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function Lightbox({ image, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  // Close on Escape, navigate with arrow keys
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    },
    [onClose, onPrev, onNext, hasPrev, hasNext],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const allTags = [...new Set([...image.tags, ...image.aiTags])];

  return (
    <div
      id="lightbox-backdrop"
      className="lightbox-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Close */}
      <button id="lightbox-close" className="lightbox-btn lightbox-close" onClick={onClose} aria-label="Close lightbox">✕</button>

      {/* Prev */}
      {hasPrev && (
        <button id="lightbox-prev" className="lightbox-btn lightbox-nav lightbox-nav--left" onClick={onPrev} aria-label="Previous image">‹</button>
      )}

      {/* Image */}
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={image.url}
          alt={image.title || "Gallery image"}
          className="lightbox-img"
        />

        {/* Info panel */}
        <div className="lightbox-info">
          <h3 className="lightbox-title">{image.title || "Untitled"}</h3>

          {image.aiCaption && (
            <div className="lightbox-ai-caption">
              <span className="lightbox-ai-label">✦ AI Caption</span>
              <p>{image.aiCaption}</p>
            </div>
          )}

          {image.aiCategory && (
            <p className="lightbox-category">
              Category: <span className="gold-text">{image.aiCategory}</span>
            </p>
          )}

          {allTags.length > 0 && (
            <div className="lightbox-tags">
              {allTags.map((tag) => (
                <span key={tag} className="image-card__tag">{tag}</span>
              ))}
            </div>
          )}

          <div className="lightbox-meta">
            <span>{image.width}×{image.height}</span>
            <span>{new Date(image.createdAt).toLocaleDateString()}</span>
            {image.source === "ai_generated" && <span className="badge badge-gold">AI Generated</span>}
          </div>
        </div>
      </div>

      {/* Next */}
      {hasNext && (
        <button id="lightbox-next" className="lightbox-btn lightbox-nav lightbox-nav--right" onClick={onNext} aria-label="Next image">›</button>
      )}
    </div>
  );
}
