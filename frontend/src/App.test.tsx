import { render, screen, waitFor, within } from "@testing-library/react";
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

type User = ReturnType<typeof userEvent.setup>;

/** Opens the sign-in sheet from the landing page's floating pill and returns the sheet. */
async function openSheet(user: User, button: "Sign in" | "Get started" = "Sign in") {
  const pill = await screen.findByRole("navigation", { name: "Main" });
  await user.click(within(pill).getByRole("button", { name: button }));
  return screen.getByRole("dialog");
}

test("signed-out visitors see the landing page, not a login form", async () => {
  render(<App />);
  expect(await screen.findByRole("heading", { level: 1, name: /finally understood/ })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("Sign in opens the sheet in sign-in mode with the email box focused", async () => {
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user);
  expect(within(sheet).getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  expect(within(sheet).getByLabelText("Email")).toHaveFocus();
});

test("Get started opens the sheet in sign-up mode", async () => {
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user, "Get started");
  expect(within(sheet).getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  expect(within(sheet).getByLabelText("What should we call you?")).toBeInTheDocument();
});

test("the sheet closes with Escape and with the close button", async () => {
  const user = userEvent.setup();
  render(<App />);
  await openSheet(user);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const sheet = await openSheet(user);
  await user.click(within(sheet).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("signed-in users with no profile yet start onboarding", async () => {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "t", user: { email: "a@b.com" } } } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ display_name: null, financial: null, onboarding_complete: false }),
  }));
  render(<App />);
  expect(await screen.findByText(/Step 1 of 4/)).toBeInTheDocument();
});

test("short passwords are stopped before calling the server", async () => {
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user);
  await user.type(within(sheet).getByLabelText("Email"), "a@b.com");
  await user.type(within(sheet).getByLabelText("Password"), "short");
  await user.click(within(sheet).getByRole("button", { name: "Sign in" }));
  expect(await within(sheet).findByRole("alert")).toHaveTextContent("at least 8");
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
});

test("wrong password shows a friendly message", async () => {
  auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user);
  await user.type(within(sheet).getByLabelText("Email"), "a@b.com");
  await user.type(within(sheet).getByLabelText("Password"), "wrongpassword");
  await user.click(within(sheet).getByRole("button", { name: "Sign in" }));
  expect(await within(sheet).findByRole("alert")).toHaveTextContent("Email or password is not correct.");
});

test("sign up with email confirmation ON asks the user to check their email", async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user, "Get started");
  await user.type(within(sheet).getByLabelText("Email"), "a@b.com");
  await user.type(within(sheet).getByLabelText("Password"), "longenough1");
  await user.click(within(sheet).getByRole("button", { name: "Sign up" }));
  expect(await within(sheet).findByRole("status")).toHaveTextContent("check your email");
});

test("sign up with email confirmation OFF shows no 'check your email' message", async () => {
  auth.signUp.mockResolvedValue({ data: { session: { access_token: "t", user: { email: "a@b.com" } } }, error: null });
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user, "Get started");
  await user.type(within(sheet).getByLabelText("Email"), "a@b.com");
  await user.type(within(sheet).getByLabelText("Password"), "longenough1");
  await user.click(within(sheet).getByRole("button", { name: "Sign up" }));
  await waitFor(() => expect(auth.signUp).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
});

test("password reset gives the same message for any email", async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user);
  await user.click(within(sheet).getByRole("button", { name: "Forgot password?" }));
  await user.type(within(sheet).getByLabelText("Email"), "nobody@b.com");
  await user.click(within(sheet).getByRole("button", { name: "Send reset link" }));
  expect(await within(sheet).findByRole("status")).toHaveTextContent("If this email has an account");
});

test("a network failure shows a helpful message and the button works again", async () => {
  auth.signInWithPassword.mockRejectedValue(new Error("offline"));
  const user = userEvent.setup();
  render(<App />);
  const sheet = await openSheet(user);
  await user.type(within(sheet).getByLabelText("Email"), "a@b.com");
  await user.type(within(sheet).getByLabelText("Password"), "longenough1");
  await user.click(within(sheet).getByRole("button", { name: "Sign in" }));
  expect(await within(sheet).findByRole("alert")).toHaveTextContent("Could not reach the server");
  await waitFor(() => expect(within(sheet).getByRole("button", { name: "Sign in" })).toBeEnabled());
});
