import { useState } from "react";
import { Link } from "react-router-dom";
import { useDeleteImage } from "../store/imageHooks.js";
import "./ImageCard.css";

export interface ImageDto {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  aiTags: string[];
  aiCaption: string | null;
  aiCategory: string | null;
  isFavorite: boolean;
  source: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
}

interface Props {
  image: ImageDto;
  onFavoriteToggle?: (id: string) => void;
  onDeleted?: (id: string) => void;
  onImageClick?: (image: ImageDto) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageCard({ image, onFavoriteToggle, onDeleted, onImageClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate: deleteImage, isPending: deleting } = useDeleteImage();

  const allTags = [...new Set([...image.tags, ...image.aiTags])].slice(0, 5);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteImage(image.id, { onSuccess: () => onDeleted?.(image.id) });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(image.id);
  };

  const handleCardClick = () => {
    if (onImageClick) onImageClick(image);
  };

  return (
    <div
      id={`image-card-${image.id}`}
      className={`image-card ${hovered ? "image-card--hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
    >
      {/* Thumbnail */}
      <div className="image-card__thumb">
        <img
          src={image.url}
          alt={image.title || "Gallery image"}
          className="image-card__img"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className={`image-card__overlay ${hovered ? "image-card__overlay--visible" : ""}`}>
          <div className="image-card__actions">
            {/* Favorite */}
            <button
              id={`favorite-btn-${image.id}`}
              className={`image-card__action-btn ${image.isFavorite ? "image-card__action-btn--active" : ""}`}
              onClick={handleFavorite}
              title={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-label="Toggle favorite"
            >
              {image.isFavorite ? "♥" : "♡"}
            </button>

            {/* View details */}
            <Link
              to={`/gallery/${image.id}`}
              id={`details-link-${image.id}`}
              className="image-card__action-btn"
              onClick={(e) => e.stopPropagation()}
              title="View details"
            >
              🔍
            </Link>

            {/* Delete */}
            <button
              id={`delete-btn-${image.id}`}
              className={`image-card__action-btn ${confirmDelete ? "image-card__action-btn--danger" : ""}`}
              onClick={handleDelete}
              disabled={deleting}
              title={confirmDelete ? "Click again to confirm delete" : "Delete image"}
              aria-label="Delete image"
            >
              {deleting ? "…" : confirmDelete ? "✓?" : "🗑"}
            </button>
          </div>

          {/* AI badge */}
          {image.source === "ai_generated" && (
            <span className="image-card__ai-badge">✦ AI</span>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className="image-card__info">
        <p className="image-card__title">{image.title || "Untitled"}</p>
        {image.aiCategory && (
          <span className="badge badge-gold image-card__category">{image.aiCategory}</span>
        )}
        {allTags.length > 0 && (
          <div className="image-card__tags">
            {allTags.map((tag) => (
              <span key={tag} className="image-card__tag">{tag}</span>
            ))}
          </div>
        )}
        <p className="image-card__meta">{formatBytes(image.bytes)} · {image.width}×{image.height}</p>
      </div>
    </div>
  );
}
