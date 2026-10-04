import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient.js";
import { imageKeys, useImages } from "../store/imageHooks.js";
import { ImageCard, type ImageDto } from "../components/ImageCard.js";
import { Lightbox } from "../components/Lightbox.js";
import "./AlbumsPage.css";

interface AlbumListItem {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AlbumDetail {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  images: ImageDto[];
}

export function AlbumsPage() {
  const qc = useQueryClient();

  // Navigation state within albums
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddImagesModal, setShowAddImagesModal] = useState(false);
  const [albumToEdit, setAlbumToEdit] = useState<AlbumListItem | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<AlbumListItem | null>(null);

  // Form state
  const [albumName, setAlbumName] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");

  // Lightbox in album view
  const [lightboxImage, setLightboxImage] = useState<ImageDto | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: imageKeys.albums,
    queryFn: async () => {
      const { data } = await apiClient.get<{ albums: AlbumListItem[] }>("/api/albums");
      return data.albums;
    },
  });

  const { data: currentAlbum, isLoading: currentAlbumLoading } = useQuery({
    queryKey: imageKeys.albumDetail(selectedAlbumId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<{ album: AlbumDetail }>(`/api/albums/${selectedAlbumId}`);
      return data.album;
    },
    enabled: Boolean(selectedAlbumId),
  });

  // Query for user's images when adding images to album
  const { data: allImagesData } = useImages({ page: 1, pageSize: 100 });
  const allImages = (allImagesData?.images as ImageDto[] | undefined) ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const { data } = await apiClient.post("/api/albums", payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: imageKeys.albums });
      setShowCreateModal(false);
      setAlbumName("");
      setAlbumDesc("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name: string; description: string }) => {
      const { data } = await apiClient.patch(`/api/albums/${id}`, patch);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: imageKeys.albums });
      if (selectedAlbumId) {
        void qc.invalidateQueries({ queryKey: imageKeys.albumDetail(selectedAlbumId) });
      }
      setAlbumToEdit(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/albums/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: imageKeys.albums });
      if (selectedAlbumId === albumToDelete?.id) {
        setSelectedAlbumId(null);
      }
      setAlbumToDelete(null);
    },
  });

  const addImageMutation = useMutation({
    mutationFn: async ({ albumId, imageId }: { albumId: string; imageId: string }) => {
      await apiClient.post(`/api/albums/${albumId}/images`, { imageId });
    },
    onSuccess: () => {
      if (selectedAlbumId) {
        void qc.invalidateQueries({ queryKey: imageKeys.albumDetail(selectedAlbumId) });
        void qc.invalidateQueries({ queryKey: imageKeys.albums });
      }
    },
  });

  const removeImageMutation = useMutation({
    mutationFn: async ({ albumId, imageId }: { albumId: string; imageId: string }) => {
      await apiClient.delete(`/api/albums/${albumId}/images/${imageId}`);
    },
    onSuccess: () => {
      if (selectedAlbumId) {
        void qc.invalidateQueries({ queryKey: imageKeys.albumDetail(selectedAlbumId) });
        void qc.invalidateQueries({ queryKey: imageKeys.albums });
      }
    },
  });

  const albums = albumsData ?? [];
  const albumImages: ImageDto[] = currentAlbum?.images ?? [];

  // Lightbox handlers
  const openLightbox = (img: ImageDto) => {
    const idx = albumImages.findIndex((i) => i.id === img.id);
    setLightboxIdx(idx);
    setLightboxImage(img);
  };

  const closeLightbox = () => setLightboxImage(null);

  const lightboxPrev = () => {
    const newIdx = lightboxIdx - 1;
    if (newIdx >= 0) {
      setLightboxIdx(newIdx);
      setLightboxImage(albumImages[newIdx]!);
    }
  };

  const lightboxNext = () => {
    const newIdx = lightboxIdx + 1;
    if (newIdx < albumImages.length) {
      setLightboxIdx(newIdx);
      setLightboxImage(albumImages[newIdx]!);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW: SINGLE ALBUM DETAIL
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedAlbumId) {
    return (
      <div className="page albums-page">
        <div className="container">
          <button
            className="btn btn-ghost albums-back-btn"
            onClick={() => setSelectedAlbumId(null)}
          >
            ← Back to All Albums
          </button>

          {currentAlbumLoading ? (
            <div className="gallery-loading">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="gallery-skeleton shimmer" />
              ))}
            </div>
          ) : currentAlbum ? (
            <>
              <div className="album-detail-header">
                <div>
                  <h1 className="gold-text album-detail-title">{currentAlbum.name}</h1>
                  {currentAlbum.description && (
                    <p className="album-detail-desc">{currentAlbum.description}</p>
                  )}
                  <p className="album-detail-meta">{albumImages.length} images</p>
                </div>
                <div className="album-detail-actions">
                  <button
                    id="add-to-album-btn"
                    className="btn btn-primary"
                    onClick={() => setShowAddImagesModal(true)}
                  >
                    + Add Images
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setAlbumToEdit({
                        id: currentAlbum.id,
                        name: currentAlbum.name,
                        description: currentAlbum.description,
                        coverUrl: null,
                        imageCount: albumImages.length,
                        createdAt: currentAlbum.createdAt,
                        updatedAt: currentAlbum.updatedAt,
                      });
                      setAlbumName(currentAlbum.name);
                      setAlbumDesc(currentAlbum.description);
                    }}
                  >
                    ✎ Edit
                  </button>
                </div>
              </div>

              {albumImages.length === 0 ? (
                <div className="gallery-empty">
                  <span className="gallery-empty__icon">📁</span>
                  <h3>This album is empty</h3>
                  <p>Add existing images from your gallery to organize this collection.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAddImagesModal(true)}
                  >
                    + Add Images Now
                  </button>
                </div>
              ) : (
                <div className="gallery-grid">
                  {albumImages.map((img) => (
                    <div key={img.id} className="album-grid-item">
                      <ImageCard
                        image={img}
                        onImageClick={openLightbox}
                      />
                      <button
                        className="album-remove-img-btn"
                        title="Remove from album"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImageMutation.mutate({
                            albumId: currentAlbum.id,
                            imageId: img.id,
                          });
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="gallery-empty">
              <h3>Album not found</h3>
            </div>
          )}

          {/* Add Images Modal */}
          {showAddImagesModal && currentAlbum && (
            <div className="modal-backdrop" onClick={() => setShowAddImagesModal(false)}>
              <div className="modal-content modal-content--wide card glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Add Photos to "{currentAlbum.name}"</h3>
                  <button className="btn btn-ghost" onClick={() => setShowAddImagesModal(false)}>✕</button>
                </div>
                <p className="modal-desc">Select an image from your gallery to add to this album.</p>

                <div className="album-picker-grid">
                  {allImages.map((img) => {
                    const isAlreadyAdded = albumImages.some((ai) => ai.id === img.id);
                    return (
                      <div
                        key={img.id}
                        className={`album-picker-item ${isAlreadyAdded ? "album-picker-item--added" : ""}`}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            addImageMutation.mutate({ albumId: currentAlbum.id, imageId: img.id });
                          }
                        }}
                      >
                        <img src={img.url} alt={img.title || "Photo"} />
                        {isAlreadyAdded ? (
                          <div className="album-picker-badge">✓ Added</div>
                        ) : (
                          <div className="album-picker-overlay">+ Add</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => setShowAddImagesModal(false)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightboxImage && (
            <Lightbox
              image={lightboxImage}
              onClose={closeLightbox}
              onPrev={lightboxPrev}
              onNext={lightboxNext}
              hasPrev={lightboxIdx > 0}
              hasNext={lightboxIdx < albumImages.length - 1}
            />
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW: ALL ALBUMS GRID
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page albums-page">
      <div className="container">
        <div className="gallery-header">
          <div className="gallery-header__left">
            <h1 className="gold-text gallery-title">Albums</h1>
            <p className="gallery-subtitle">{albums.length} collections</p>
          </div>
          <button
            id="create-album-btn"
            className="btn btn-primary"
            onClick={() => {
              setAlbumName("");
              setAlbumDesc("");
              setShowCreateModal(true);
            }}
          >
            + New Album
          </button>
        </div>

        {albumsLoading ? (
          <div className="albums-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="album-card-skeleton shimmer" />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="gallery-empty">
            <span className="gallery-empty__icon">📁</span>
            <h3>No Albums Yet</h3>
            <p>Create thematic collections to organize your photo gallery effortlessly.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setAlbumName("");
                setAlbumDesc("");
                setShowCreateModal(true);
              }}
            >
              + Create First Album
            </button>
          </div>
        ) : (
          <div className="albums-grid">
            {albums.map((album) => (
              <div
                key={album.id}
                className="album-card card glass-panel"
                onClick={() => setSelectedAlbumId(album.id)}
              >
                <div className="album-card__cover">
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.name} />
                  ) : (
                    <div className="album-card__placeholder">
                      <span>📁</span>
                    </div>
                  )}
                  <div className="album-card__count">{album.imageCount} items</div>
                </div>

                <div className="album-card__body">
                  <div className="album-card__header">
                    <h3 className="album-card__name">{album.name}</h3>
                    <div className="album-card__actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost album-action-btn"
                        title="Edit album"
                        onClick={() => {
                          setAlbumToEdit(album);
                          setAlbumName(album.name);
                          setAlbumDesc(album.description);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-ghost album-action-btn"
                        title="Delete album"
                        onClick={() => setAlbumToDelete(album)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  {album.description && (
                    <p className="album-card__desc">{album.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Album Modal */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content card glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Create New Album</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!albumName.trim()) return;
                  createMutation.mutate({
                    name: albumName.trim(),
                    description: albumDesc.trim(),
                  });
                }}
              >
                <div className="form-group">
                  <label htmlFor="create-album-name">Album Name *</label>
                  <input
                    id="create-album-name"
                    type="text"
                    className="input"
                    placeholder="e.g. Summer Vacation 2026"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="create-album-desc">Description</label>
                  <textarea
                    id="create-album-desc"
                    className="input"
                    rows={3}
                    placeholder="Optional details about this collection..."
                    value={albumDesc}
                    onChange={(e) => setAlbumDesc(e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-create-album"
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || !albumName.trim()}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Album"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Album Modal */}
        {albumToEdit && (
          <div className="modal-backdrop" onClick={() => setAlbumToEdit(null)}>
            <div className="modal-content card glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Edit Album</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!albumName.trim()) return;
                  updateMutation.mutate({
                    id: albumToEdit.id,
                    name: albumName.trim(),
                    description: albumDesc.trim(),
                  });
                }}
              >
                <div className="form-group">
                  <label htmlFor="edit-album-name">Album Name *</label>
                  <input
                    id="edit-album-name"
                    type="text"
                    className="input"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-album-desc">Description</label>
                  <textarea
                    id="edit-album-desc"
                    className="input"
                    rows={3}
                    value={albumDesc}
                    onChange={(e) => setAlbumDesc(e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setAlbumToEdit(null)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-edit-album"
                    type="submit"
                    className="btn btn-primary"
                    disabled={updateMutation.isPending || !albumName.trim()}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Album Modal */}
        {albumToDelete && (
          <div className="modal-backdrop" onClick={() => setAlbumToDelete(null)}>
            <div className="modal-content card glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Delete Album</h3>
              <p className="modal-desc">
                Are you sure you want to delete the album "{albumToDelete.name}"?
                Images within the album will not be deleted from your gallery.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setAlbumToDelete(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-album"
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteMutation.mutate(albumToDelete.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Album"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
