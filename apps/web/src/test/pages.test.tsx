import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuthStore } from "../store/authStore";


describe("LoginPage", () => {
  it("renders the login form with required fields", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("shows a link to the register page", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /create one/i })).toBeDefined();
  });
});

describe("RegisterPage", () => {
  it("renders the registration form with required fields", () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByLabelText(/full name/i)).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
  });
});

describe("ProtectedRoute", () => {
  it("redirects to /login when not authenticated", () => {
    useAuthStore.setState({ accessToken: null });
    render(
      <MemoryRouter initialEntries={["/gallery"]}>
        <ProtectedRoute>
          <div>Secret content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Secret content")).toBeNull();
  });

  it("renders children when authenticated", () => {
    useAuthStore.setState({ accessToken: "fake-token" });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Secret content")).toBeDefined();
    // Reset
    useAuthStore.setState({ accessToken: null });
  });
});
