import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

interface Props {
  children: ReactNode;
}

/** Redirects unauthenticated users to /login, preserving the intended path. */
export function ProtectedRoute({ children }: Props) {
  const { accessToken } = useAuthStore();
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
