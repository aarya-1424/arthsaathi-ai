import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("../lib/supabase", () => ({ authConfigured: true, supabase: { auth } }));

import App from "../App";

beforeEach(() => {
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

test.each([
  ["/privacy", "Privacy Policy", /We do not sell your data/],
  ["/terms", "Terms of Use", /does not give investment, tax, legal or insurance advice/],
  ["/disclaimer", "Financial Disclaimer", /not a SEBI-registered investment adviser/],
])("%s is public and shows the %s", async (path, title, text) => {
  window.history.replaceState(null, "", path);
  render(<App />);
  expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  expect(document.title).toContain(title);
});

test("the privacy policy says what is never collected and how to delete data", async () => {
  window.history.replaceState(null, "", "/privacy");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "Privacy Policy" });
  expect(screen.getByText(/Bank passwords, UPI PIN, OTPs, card numbers or card PINs/)).toBeInTheDocument();
  expect(screen.getByText(/ask us to delete your account/)).toBeInTheDocument();
});

test("the landing page footer leads to a legal page and back", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("link", { name: "Privacy Policy" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/privacy");
  await user.click(screen.getByRole("link", { name: /Back to ArthSaathi/ }));
  expect(await screen.findByRole("heading", { level: 1, name: /finally understood/ })).toBeInTheDocument();
});

test("a signed-out visitor opening an app address is sent to the landing page", async () => {
  window.history.replaceState(null, "", "/money");
  render(<App />);
  expect(await screen.findByRole("heading", { level: 1, name: /finally understood/ })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/");
});
