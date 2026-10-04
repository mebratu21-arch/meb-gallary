import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar.js";
import { GalleryPage } from "./pages/GalleryPage.js";
import { ImageDetailsPage } from "./pages/ImageDetailsPage.js";
import { AlbumsPage } from "./pages/AlbumsPage.js";
import { AIStudioPage } from "./pages/AIStudioPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { AdminDashboard } from "./pages/AdminDashboard.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";

export function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <GalleryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery/:id"
          element={
            <ProtectedRoute>
              <ImageDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/albums"
          element={
            <ProtectedRoute>
              <AlbumsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-studio"
          element={
            <ProtectedRoute>
              <AIStudioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/gallery" replace />} />
        <Route path="*" element={<Navigate to="/gallery" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
