import { useAuthStore } from "../store/authStore.js";
import { useImages } from "../store/imageHooks.js";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient.js";
import { imageKeys } from "../store/imageHooks.js";
import { Link, useNavigate } from "react-router-dom";
import "./ProfilePage.css";

export function ProfilePage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // Fetch image counts and stats
  const { data: allImagesData, isLoading: imagesLoading } = useImages({ page: 1, pageSize: 6 });
  const { data: favImagesData } = useImages({ favorite: true, pageSize: 1 });
  const { data: aiImagesData } = useImages({ source: "ai_generated", pageSize: 1 });

  const { data: albumsData } = useQuery({
    queryKey: imageKeys.albums,
    queryFn: async () => {
      const { data } = await apiClient.get<{ albums: unknown[] }>("/api/albums");
      return data.albums;
    },
  });

  const totalImages = allImagesData?.total ?? 0;
  const totalFavorites = favImagesData?.total ?? 0;
  const totalAi = aiImagesData?.total ?? 0;
  const totalAlbums = albumsData?.length ?? 0;
  const recentImages = allImagesData?.images ?? [];

  async function handleLogout() {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      /* ignore */
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="page profile-page">
      <div className="container">
        {/* Profile Card */}
        <div className="profile-hero card glass-panel">
          <div className="profile-avatar">
            <span className="profile-avatar__text">{initial}</span>
          </div>

          <div className="profile-details">
            <div className="profile-header">
              <h1 className="profile-name">{user?.name || "User Profile"}</h1>
              <span className={`badge ${user?.role === "ADMIN" ? "badge-admin" : "badge-user"}`}>
                {user?.role === "ADMIN" ? "★ Admin" : "Member"}
              </span>
            </div>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-meta">
              Secure Cloud Account • Cloudinary & Neon PostgreSQL Connected
            </p>
          </div>

          <div className="profile-actions">
            <button id="profile-logout-btn" className="btn btn-ghost" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Analytics & Metrics Grid */}
        <div className="profile-stats-grid">
          <div className="stat-card card glass-panel">
            <span className="stat-card__icon">🖼️</span>
            <span className="stat-card__val">{imagesLoading ? "-" : totalImages}</span>
            <span className="stat-card__label">Total Images</span>
          </div>

          <div className="stat-card card glass-panel">
            <span className="stat-card__icon">♥</span>
            <span className="stat-card__val">{totalFavorites}</span>
            <span className="stat-card__label">Favorites</span>
          </div>

          <div className="stat-card card glass-panel">
            <span className="stat-card__icon gold-text">✦</span>
            <span className="stat-card__val">{totalAi}</span>
            <span className="stat-card__label">AI Generated</span>
          </div>

          <div className="stat-card card glass-panel">
            <span className="stat-card__icon">📁</span>
            <span className="stat-card__val">{totalAlbums}</span>
            <span className="stat-card__label">Albums</span>
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="profile-shortcuts card glass-panel">
          <h2 className="profile-section-title">Quick Actions</h2>
          <div className="shortcuts-row">
            <Link to="/gallery" className="btn btn-ghost">
              Browse Gallery
            </Link>
            <Link to="/ai-studio" className="btn btn-primary">
              ✦ AI Studio
            </Link>
            <Link to="/albums" className="btn btn-ghost">
              Manage Albums
            </Link>
            {user?.role === "ADMIN" && (
              <Link to="/admin" className="btn btn-ghost gold-border">
                ★ Admin Console
              </Link>
            )}
          </div>
        </div>

        {/* Recent Uploads Showcase */}
        {recentImages.length > 0 && (
          <div className="profile-recent-section">
            <div className="profile-recent-header">
              <h2 className="profile-section-title">Recent Creations & Uploads</h2>
              <Link to="/gallery" className="gold-text profile-view-all">
                View All →
              </Link>
            </div>
            <div className="profile-recent-grid">
              {recentImages.map((img) => (
                <Link
                  key={img.id}
                  to={`/gallery/${img.id}`}
                  className="profile-recent-item card"
                >
                  <img src={img.url} alt={img.title || "Recent image"} />
                  {img.source === "ai_generated" && (
                    <span className="badge badge-ai profile-recent-badge">✦ AI</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
