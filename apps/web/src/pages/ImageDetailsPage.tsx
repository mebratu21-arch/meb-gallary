import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useImage, useUpdateImage, useDeleteImage, useToggleFavorite, useAnalyzeImage } from "../store/imageHooks.js";
import "./ImageDetailsPage.css";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: image, isLoading, isError } = useImage(id ?? "");
  const { mutate: updateImage, isPending: isUpdating } = useUpdateImage();
  const { mutate: deleteImage, isPending: isDeleting } = useDeleteImage();
  const { mutate: toggleFavorite, isPending: isFavoriting } = useToggleFavorite();
  const { mutate: analyzeImage, isPending: isAnalyzing } = useAnalyzeImage();

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (image) {
      setTitle(image.title ?? "");
      setDescription(image.description ?? "");
      setTagsInput(image.tags?.join(", ") ?? "");
    }
  }, [image]);

  if (isLoading) {
    return (
      <div className="page image-details-page">
        <div className="container details-loading">
          <div className="details-skeleton-hero shimmer" />
          <div className="details-skeleton-info shimmer" />
        </div>
      </div>
    );
  }

  if (isError || !image) {
    return (
      <div className="page image-details-page">
        <div className="container details-error">
          <span className="details-error__icon">⚠️</span>
          <h2>Image Not Found</h2>
          <p>The requested image does not exist or has been removed.</p>
          <Link to="/gallery" className="btn btn-primary">
            ← Return to Gallery
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.id) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    updateImage(
      {
        id: image.id,
        title: title.trim(),
        description: description.trim(),
        tags,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setSuccessMsg("Details updated successfully!");
          setTimeout(() => setSuccessMsg(null), 3000);
        },
      }
    );
  };

  const handleAnalyze = () => {
    if (!image.id || isAnalyzing) return;
    analyzeImage(image.id, {
      onSuccess: () => {
        setSuccessMsg("AI analysis complete!");
        setTimeout(() => setSuccessMsg(null), 4000);
      },
    });
  };

  const handleDelete = () => {
    if (!image.id) return;
    deleteImage(image.id, {
      onSuccess: () => {
        navigate("/gallery");
      },
    });
  };

  return (
    <div className="page image-details-page">
      <div className="container">
        {/* Top breadcrumb navigation */}
        <div className="details-nav">
          <Link to="/gallery" className="details-nav__back">
            ← Back to Gallery
          </Link>
          <div className="details-nav__actions">
            <button
              id="favorite-btn"
              type="button"
              className={`btn btn-ghost details-fav-btn ${image.isFavorite ? "details-fav-btn--active" : ""}`}
              onClick={() => toggleFavorite(image.id)}
              disabled={isFavoriting}
              title={image.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              {image.isFavorite ? "♥ Favorited" : "♡ Favorite"}
            </button>
            <button
              id="delete-btn"
              type="button"
              className="btn btn-ghost details-delete-btn"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
            >
              🗑 Delete
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="details-alert details-alert--success">
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* Main Content Layout */}
        <div className="details-grid">
          {/* Left Column: Image Display */}
          <div className="details-media card glass-panel">
            <div className="details-media__wrapper">
              <img
                src={image.url}
                alt={image.title || "Gallery image"}
                className="details-media__img"
              />
              {image.source === "ai_generated" && (
                <span className="badge badge-ai details-media__badge">✦ AI Generated</span>
              )}
            </div>
            <div className="details-media__actions">
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost details-media__link"
              >
                ↗ View Full Resolution
              </a>
            </div>
          </div>

          {/* Right Column: Metadata & AI Intelligence */}
          <div className="details-sidebar">
            {/* Image Info / Edit Card */}
            <div className="card glass-panel details-card">
              <div className="details-card__header">
                <h2 className="details-card__title">Image Details</h2>
                {!isEditing && (
                  <button
                    id="edit-details-btn"
                    className="btn btn-ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    ✎ Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="details-form">
                  <div className="form-group">
                    <label htmlFor="img-title">Title</label>
                    <input
                      id="img-title"
                      type="text"
                      className="input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title or caption"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="img-desc">Description</label>
                    <textarea
                      id="img-desc"
                      className="input details-form__textarea"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a detailed description..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="img-tags">Tags (comma-separated)</label>
                    <input
                      id="img-tags"
                      type="text"
                      className="input"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="nature, sunset, mountain"
                    />
                  </div>

                  <div className="details-form__actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setTitle(image.title ?? "");
                        setDescription(image.description ?? "");
                        setTagsInput(image.tags?.join(", ") ?? "");
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </button>
                    <button
                      id="save-details-btn"
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="details-info">
                  <h3 className="details-info__title">{image.title || "Untitled"}</h3>
                  {image.description ? (
                    <p className="details-info__desc">{image.description}</p>
                  ) : (
                    <p className="details-info__desc details-info__desc--empty">
                      No description provided.
                    </p>
                  )}

                  {/* Tags */}
                  {image.tags && image.tags.length > 0 && (
                    <div className="details-tags">
                      {image.tags.map((tag) => (
                        <span key={tag} className="details-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Technical properties */}
                  <div className="details-specs">
                    <div className="details-spec">
                      <span className="details-spec__label">Dimensions</span>
                      <span className="details-spec__val">
                        {image.width} × {image.height} px
                      </span>
                    </div>
                    <div className="details-spec">
                      <span className="details-spec__label">File Size</span>
                      <span className="details-spec__val">{formatBytes(image.bytes)}</span>
                    </div>
                    <div className="details-spec">
                      <span className="details-spec__label">Format</span>
                      <span className="details-spec__val">{image.format?.toUpperCase()}</span>
                    </div>
                    <div className="details-spec">
                      <span className="details-spec__label">Uploaded</span>
                      <span className="details-spec__val">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Vision Card */}
            <div className="card glass-panel details-card details-ai-card">
              <div className="details-card__header">
                <div className="details-ai-card__title-group">
                  <span className="gold-text">✦</span>
                  <h2 className="details-card__title">AI Vision Intelligence</h2>
                </div>
                <button
                  id="ai-analyze-btn"
                  className="btn btn-primary details-ai-btn"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="spinner-inline" /> Analyzing...
                    </>
                  ) : image.aiCaption ? (
                    "Re-Analyze Image"
                  ) : (
                    "✦ Analyze with AI"
                  )}
                </button>
              </div>

              {image.aiCaption ? (
                <div className="details-ai-content">
                  <div className="details-ai-block">
                    <span className="details-ai-label">AI Description</span>
                    <blockquote className="details-ai-caption">"{image.aiCaption}"</blockquote>
                  </div>

                  {image.aiCategory && (
                    <div className="details-ai-block">
                      <span className="details-ai-label">Detected Category</span>
                      <div className="details-ai-category">
                        <span className="badge badge-gold">{image.aiCategory}</span>
                      </div>
                    </div>
                  )}

                  {image.aiTags && image.aiTags.length > 0 && (
                    <div className="details-ai-block">
                      <span className="details-ai-label">AI Discovered Tags</span>
                      <div className="details-tags">
                        {image.aiTags.map((t) => (
                          <span key={t} className="details-tag details-tag--ai">
                            ✦ {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="details-ai-empty">
                  <p>
                    Unlock computer vision insights: generate natural language captions, detect
                    categories, and extract contextual tags automatically with GPT-4o Vision.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
            <div className="modal-content card glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Delete Image</h3>
              <p className="modal-desc">
                Are you sure you want to permanently delete "{image.title || "this image"}"? This
                action cannot be undone and will remove it from Cloudinary and all albums.
              </p>
              <div className="modal-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-btn"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
