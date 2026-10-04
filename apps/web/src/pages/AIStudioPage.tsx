import { useState } from "react";
import { apiClient } from "../lib/apiClient.js";
import type { ImageDto } from "../components/ImageCard.js";
import "./AIStudioPage.css";

export function AIStudioPage() {
  // ── Generate tab ──────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageDto | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Smart search tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"generate" | "search">("generate");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ImageDto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<Record<string, unknown> | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    setGeneratedImage(null);
    try {
      const { data } = await apiClient.post<{ image: ImageDto }>("/api/ai/generate", { prompt: prompt.trim() });
      setGeneratedImage(data.image);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setGenerateError(msg ?? "Image generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const { data } = await apiClient.post<{ images: ImageDto[]; filter: Record<string, unknown> }>(
        "/api/ai/search",
        { query: searchQuery.trim() },
      );
      setSearchResults(data.images);
      setSearchFilter(data.filter);
    } catch {
      setSearchError("Smart search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="page ai-studio-page">
      <div className="container">
        <div className="ai-studio-header">
          <h1 className="gold-text">✦ AI Studio</h1>
          <p>Generate images with AI or search your gallery using natural language.</p>
        </div>

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <div className="ai-tabs">
          <button
            id="tab-generate"
            className={`ai-tab ${activeTab === "generate" ? "ai-tab--active" : ""}`}
            onClick={() => setActiveTab("generate")}
          >
            🎨 Generate Image
          </button>
          <button
            id="tab-search"
            className={`ai-tab ${activeTab === "search" ? "ai-tab--active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            🔍 Smart Search
          </button>
        </div>

        {/* ── Generate tab ─────────────────────────────────────────────────── */}
        {activeTab === "generate" && (
          <div className="ai-panel scale-in">
            <div className="ai-panel__info">
              <h2>Generate with DALL-E 3</h2>
              <p>Describe an image and AI will create it. Generated images are saved directly to your gallery.</p>
              <ul className="ai-panel__examples">
                {[
                  "A futuristic city in Tel Aviv at golden hour",
                  "A watercolor painting of mountains at sunset",
                  "A photorealistic portrait of a robot reading a book",
                  "Abstract art with blue and gold swirls",
                ].map((ex) => (
                  <li key={ex}>
                    <button
                      className="ai-example-btn"
                      onClick={() => setPrompt(ex)}
                    >
                      "{ex}"
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <form className="ai-form" onSubmit={(e) => void handleGenerate(e)}>
              <div className="form-group">
                <label className="form-label" htmlFor="generate-prompt">Your prompt</label>
                <textarea
                  id="generate-prompt"
                  className="input ai-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate…"
                  rows={4}
                  maxLength={1000}
                />
                <span className="ai-char-count">{prompt.length}/1000</span>
              </div>

              {generateError && <p className="modal-error" role="alert">{generateError}</p>}

              <button
                id="generate-btn"
                type="submit"
                className="btn btn-primary ai-submit-btn"
                disabled={generating || !prompt.trim()}
              >
                {generating ? (
                  <><span className="spinner" style={{ width: "16px", height: "16px" }} />  Generating…</>
                ) : "✦ Generate Image"}
              </button>
            </form>

            {generatedImage && (
              <div className="ai-result scale-in">
                <img src={generatedImage.url} alt={generatedImage.title} className="ai-result__img" />
                <div className="ai-result__info">
                  <p className="gold-text">✓ Image generated and saved to your gallery!</p>
                  <p className="ai-result__prompt">{generatedImage.aiCaption}</p>
                  <a href="/gallery" className="btn btn-ghost">View in Gallery →</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Smart search tab ─────────────────────────────────────────────── */}
        {activeTab === "search" && (
          <div className="ai-panel scale-in">
            <div className="ai-panel__info">
              <h2>Natural Language Search</h2>
              <p>Search your gallery using plain English. AI understands your intent and finds matching images.</p>
              <ul className="ai-panel__examples">
                {[
                  "Show me nature photos with mountains",
                  "Find my favorite travel pictures",
                  "Show AI generated city images",
                  "Find photos with blue colors",
                ].map((ex) => (
                  <li key={ex}>
                    <button className="ai-example-btn" onClick={() => setSearchQuery(ex)}>"{ex}"</button>
                  </li>
                ))}
              </ul>
            </div>

            <form className="ai-form" onSubmit={(e) => void handleSmartSearch(e)}>
              <div className="form-group">
                <label className="form-label" htmlFor="smart-search-input">What are you looking for?</label>
                <input
                  id="smart-search-input"
                  className="input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'Show me sunset photos'"
                />
              </div>
              {searchError && <p className="modal-error">{searchError}</p>}
              <button
                id="smart-search-btn"
                type="submit"
                className="btn btn-primary ai-submit-btn"
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? "Searching…" : "🔍 Search"}
              </button>
            </form>

            {searchFilter && (
              <div className="ai-filter-info">
                <span className="lightbox-ai-label">AI interpreted as:</span>
                <code>{JSON.stringify(searchFilter, null, 0)}</code>
              </div>
            )}

            {searchResults.length > 0 ? (
              <div className="ai-search-results">
                <p className="ai-results-count">{searchResults.length} images found</p>
                <div className="ai-results-grid">
                  {searchResults.map((img) => (
                    <a key={img.id} href={`/gallery/${img.id}`} className="ai-result-thumb">
                      <img src={img.url} alt={img.title} loading="lazy" />
                      {img.title && <span className="ai-result-thumb__title">{img.title}</span>}
                    </a>
                  ))}
                </div>
              </div>
            ) : searchFilter && !searching ? (
              <div className="gallery-empty">
                <span className="gallery-empty__icon">🔍</span>
                <h3>No results found</h3>
                <p>Try a different query or upload more images.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
