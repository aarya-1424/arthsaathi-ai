import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({ authConfigured: true, supabase: { auth } }));

import App from "./App";

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

test("signed-out visitors see the sign in form", async () => {
  render(<App />);
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
});

test("signed-in users see the home page and the server check", async () => {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "t", user: { email: "a@b.com" } } } });
  render(<App />);
  expect(await screen.findByText(/signed in as a@b.com/)).toBeInTheDocument();
  expect(await screen.findByText("Server connected.")).toBeInTheDocument();
});

test("short passwords are stopped before calling the server", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Email"), "a@b.com");
  await user.type(screen.getByLabelText("Password"), "short");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("at least 8");
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
});

test("wrong password shows a friendly message", async () => {
  auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Email"), "a@b.com");
  await user.type(screen.getByLabelText("Password"), "wrongpassword");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is not correct.");
});

test("sign up with email confirmation ON asks the user to check their email", async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Create a new account" }));
  await user.type(screen.getByLabelText("Email"), "a@b.com");
  await user.type(screen.getByLabelText("Password"), "longenough1");
  await user.click(screen.getByRole("button", { name: "Sign up" }));
  expect(await screen.findByRole("status")).toHaveTextContent("check your email");
});

test("sign up with email confirmation OFF shows no 'check your email' message", async () => {
  auth.signUp.mockResolvedValue({ data: { session: { access_token: "t", user: { email: "a@b.com" } } }, error: null });
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Create a new account" }));
  await user.type(screen.getByLabelText("Email"), "a@b.com");
  await user.type(screen.getByLabelText("Password"), "longenough1");
  await user.click(screen.getByRole("button", { name: "Sign up" }));
  await waitFor(() => expect(auth.signUp).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
});

test("password reset gives the same message for any email", async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Forgot password?" }));
  await user.type(screen.getByLabelText("Email"), "nobody@b.com");
  await user.click(screen.getByRole("button", { name: "Send reset link" }));
  expect(await screen.findByRole("status")).toHaveTextContent("If this email has an account");
});

test("a network failure shows a helpful message and the button works again", async () => {
  auth.signInWithPassword.mockRejectedValue(new Error("offline"));
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Email"), "a@b.com");
  await user.type(screen.getByLabelText("Password"), "longenough1");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
});
