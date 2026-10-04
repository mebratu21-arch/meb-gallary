import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore.js";
import { apiClient } from "../lib/apiClient.js";
import { Navigate } from "react-router-dom";
import { imageKeys } from "../store/imageHooks.js";
import "./AdminDashboard.css";

interface AdminStats {
  totalUsers: number;
  totalImages: number;
  aiGenerated: number;
  unmoderated: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: {
    images: number;
  };
}

export function AdminDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Guard: Admin only
  if (user && user.role !== "ADMIN") {
    return <Navigate to="/gallery" replace />;
  }

  // Fetch admin stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: imageKeys.adminStats,
    queryFn: async () => {
      const { data } = await apiClient.get<{ stats: AdminStats }>("/api/admin/stats");
      return data.stats;
    },
  });

  // Fetch users list
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: imageKeys.adminUsers(page),
    queryFn: async () => {
      const { data } = await apiClient.get<{
        users: AdminUser[];
        total: number;
        page: number;
        pageSize: number;
      }>("/api/admin/users", { params: { page, pageSize: 15 } });
      return data;
    },
  });

  // Update role mutation
  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "USER" | "ADMIN" }) => {
      setRoleUpdatingId(userId);
      const { data } = await apiClient.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onSettled: () => {
      setRoleUpdatingId(null);
    },
  });

  const stats = statsData;
  const users = usersData?.users ?? [];
  const totalUsers = usersData?.total ?? 0;
  const totalPages = Math.ceil(totalUsers / 15) || 1;

  return (
    <div className="page admin-page">
      <div className="container">
        {/* Header */}
        <div className="gallery-header">
          <div>
            <div className="admin-badge-wrap">
              <span className="badge badge-admin">★ Administration Console</span>
            </div>
            <h1 className="gold-text gallery-title">System Overview</h1>
            <p className="gallery-subtitle">Platform health, telemetry and access management</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card card glass-panel">
            <span className="admin-stat__label">Total Registered Users</span>
            <span className="admin-stat__val">{statsLoading ? "-" : stats?.totalUsers}</span>
            <span className="admin-stat__desc">Active accounts across the platform</span>
          </div>

          <div className="admin-stat-card card glass-panel">
            <span className="admin-stat__label">Total Gallery Images</span>
            <span className="admin-stat__val">{statsLoading ? "-" : stats?.totalImages}</span>
            <span className="admin-stat__desc">Hosted on Cloudinary CDN</span>
          </div>

          <div className="admin-stat-card card glass-panel">
            <span className="admin-stat__label">AI-Generated Creations</span>
            <span className="admin-stat__val gold-text">{statsLoading ? "-" : stats?.aiGenerated}</span>
            <span className="admin-stat__desc">Created with DALL-E 3 engine</span>
          </div>

          <div className="admin-stat-card card glass-panel">
            <span className="admin-stat__label">Unmoderated Content</span>
            <span className="admin-stat__val">{statsLoading ? "-" : stats?.unmoderated}</span>
            <span className="admin-stat__desc">Pending automated compliance</span>
          </div>
        </div>

        {/* Users Management Table */}
        <div className="card glass-panel admin-table-card">
          <div className="admin-table-card__header">
            <div>
              <h2 className="admin-table-title">User Accounts & Roles</h2>
              <p className="admin-table-desc">
                Promote trusted members to Administrator or manage privileges.
              </p>
            </div>
          </div>

          {usersLoading ? (
            <div className="admin-table-loading">
              <div className="gallery-skeleton shimmer" style={{ height: "240px" }} />
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Uploaded Images</th>
                    <th>Joined</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-avatar">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </span>
                          <span className="admin-user-name">{u.name}</span>
                        </div>
                      </td>
                      <td className="admin-user-email">{u.email}</td>
                      <td>
                        <span className="admin-images-count">{u._count?.images ?? 0} items</span>
                      </td>
                      <td className="admin-user-date">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge ${u.role === "ADMIN" ? "badge-admin" : "badge-user"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.id !== user?.id ? (
                          <button
                            id={`role-btn-${u.id}`}
                            className="btn btn-ghost admin-role-toggle-btn"
                            disabled={roleUpdatingId === u.id}
                            onClick={() => {
                              const newRole = u.role === "ADMIN" ? "USER" : "ADMIN";
                              roleMutation.mutate({ userId: u.id, newRole });
                            }}
                          >
                            {roleUpdatingId === u.id
                              ? "Updating..."
                              : u.role === "ADMIN"
                              ? "Demote to User"
                              : "Promote to Admin"}
                          </button>
                        ) : (
                          <span className="admin-self-tag">(Current session)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="gallery-pagination">
              <button
                className="btn btn-ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className="gallery-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
