import { useState, useRef, useCallback } from "react";
import { useUploadImage } from "../store/imageHooks.js";
import "./UploadModal.css";

interface Props {
  onClose: () => void;
}

export function UploadModal({ onClose }: Props) {
  const { mutateAsync: upload, isPending } = useUploadImage();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setError(null);
    setSuccess(false);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)) {
      setError("Only JPEG, PNG, WebP and GIF are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be smaller than 10 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please choose an image."); return; }
    try {
      await upload({ file, title: title.trim() || undefined, tags: tags.trim() || undefined });
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch {
      setError("Upload failed. Check your Cloudinary settings and try again.");
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload image" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card scale-in">
        {/* Header */}
        <div className="modal-header">
          <h2 className="gold-text">Upload Image</h2>
          <button id="modal-close-btn" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Drop zone */}
          <div
            id="upload-drop-zone"
            className={`drop-zone ${dragging ? "drop-zone--active" : ""} ${file ? "drop-zone--filled" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              id="upload-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onInputChange}
              hidden
            />
            {preview ? (
              <img src={preview} alt="Preview" className="drop-zone__preview" />
            ) : (
              <div className="drop-zone__placeholder">
                <span className="drop-zone__icon">🖼️</span>
                <p>Drag &amp; drop an image here</p>
                <p className="drop-zone__hint">or click to browse · JPEG, PNG, WebP, GIF · max 10 MB</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="modal-fields">
            <label htmlFor="upload-title-input" className="field-label">Title <span className="field-optional">(optional)</span></label>
            <input
              id="upload-title-input"
              className="input"
              type="text"
              placeholder="My beautiful photo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label htmlFor="upload-tags-input" className="field-label">Tags <span className="field-optional">(comma-separated)</span></label>
            <input
              id="upload-tags-input"
              className="input"
              type="text"
              placeholder="nature, travel, portrait"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {error && <p id="upload-error" className="modal-error" role="alert">{error}</p>}
          {success && <p className="modal-success">✅ Uploaded!</p>}

          <div className="modal-actions">
            <button id="modal-cancel-btn" type="button" className="btn btn-ghost" onClick={onClose} disabled={isPending}>Cancel</button>
            <button id="upload-submit-btn" type="submit" className="btn btn-primary" disabled={isPending || !file}>
              {isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
