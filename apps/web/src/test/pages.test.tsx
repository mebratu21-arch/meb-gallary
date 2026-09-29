import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../../pages/LoginPage.js";
import { RegisterPage } from "../../pages/RegisterPage.js";
import { ProtectedRoute } from "../../components/ProtectedRoute.js";
import { useAuthStore } from "../../store/authStore.js";

describe("LoginPage", () => {
  it("renders the login form with required fields", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a link to the register page", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /create one/i })).toBeInTheDocument();
  });
});

describe("RegisterPage", () => {
  it("renders the registration form with required fields", () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
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
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
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
    expect(screen.getByText("Secret content")).toBeInTheDocument();
    // Reset
    useAuthStore.setState({ accessToken: null });
  });
});
