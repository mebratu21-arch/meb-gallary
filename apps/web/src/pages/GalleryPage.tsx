import "./GalleryPage.css";

export function GalleryPage() {
  return (
    <main className="page gallery-page">
      <div className="container">
        <div className="gallery-hero fade-in">
          <h1>
            Your <span className="gold-text">Gallery</span>
          </h1>
          <p className="gallery-subtitle">
            Upload, organize, and discover your images with AI-powered tagging.
          </p>
        </div>

        {/* Placeholder grid — populated in Phase 2 */}
        <div className="gallery-empty scale-in" role="img" aria-label="Empty gallery">
          <div className="gallery-empty-icon">✦</div>
          <h2>No images yet</h2>
          <p>Upload your first image to get started.</p>
          <button id="upload-cta-btn" className="btn btn-primary" type="button">
            Upload images
          </button>
        </div>
      </div>
    </main>
  );
}
