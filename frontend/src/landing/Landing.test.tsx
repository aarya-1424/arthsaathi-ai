import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";

vi.mock("../lib/supabase", () => ({ authConfigured: true, supabase: { auth: {} } }));

import { Landing } from "./Landing";

test("the Try it card updates the example split as you type", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Landing /></MemoryRouter>);
  const income = screen.getByLabelText("Your monthly income");
  expect(income).toHaveValue("28,000"); // shown with commas
  expect(screen.getByRole("img", { name: /Needs \(rent, food, bills\) ₹14,000 \(50%\)/ })).toBeInTheDocument();

  await user.clear(income);
  await user.type(income, "40000");
  expect(income).toHaveValue("40,000");
  expect(screen.getByRole("img", { name: /Savings ₹8,000 \(20%\)/ })).toBeInTheDocument();
});

test("the income box keeps digits only", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Landing /></MemoryRouter>);
  const income = screen.getByLabelText("Your monthly income");
  await user.clear(income);
  await user.type(income, "-12a.5");
  expect(income).toHaveValue("125");
});

test("the example is clearly labelled as an example, not advice", () => {
  render(<MemoryRouter><Landing /></MemoryRouter>);
  expect(screen.getAllByText("Example").length).toBeGreaterThan(0);
  expect(screen.getByText(/It isn't advice/)).toBeInTheDocument();
});

test("features lead with what works today; unfinished ones sit in a small 'On the way' list", () => {
  render(<MemoryRouter><Landing /></MemoryRouter>);
  const features = screen.getByRole("region", { name: /Everything about your money/ });
  expect(within(features).getAllByRole("heading", { level: 3 }).slice(0, 4).map((h) => h.textContent)).toEqual([
    "See where your money goes", "Budgets that guide you", "Six months at a glance", "Next steps, from your own numbers",
  ]);
  const soon = within(features).getByRole("group", { name: "On the way" });
  expect(within(soon).getAllByRole("listitem")).toHaveLength(4);
  expect(within(soon).getByText("Goals")).toBeInTheDocument();
  expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
});

test("the top bar has sign in and get started, and the footer links to the legal pages", () => {
  render(<MemoryRouter><Landing /></MemoryRouter>);
  const bar = screen.getByRole("navigation", { name: "Main" });
  expect(within(bar).getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(within(bar).getByRole("button", { name: "Get started" })).toBeInTheDocument();
  const legal = screen.getByRole("navigation", { name: "Legal" });
  expect(within(legal).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  expect(within(legal).getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
  expect(within(legal).getByRole("link", { name: "Financial Disclaimer" })).toHaveAttribute("href", "/disclaimer");
});

test("no contact link is shown unless a real contact email is configured", () => {
  render(<MemoryRouter><Landing /></MemoryRouter>);
  expect(screen.queryByRole("link", { name: "Contact" })).not.toBeInTheDocument();
});

test("the safety promise and legal note are on the page", () => {
  render(<MemoryRouter><Landing /></MemoryRouter>);
  expect(screen.getByText(/No bank passwords, UPI PIN, OTP or card PIN/)).toBeInTheDocument();
  expect(screen.getByText(/not a registered investment adviser/)).toBeInTheDocument();
});

test("no fake numbers: no customer counts, ratings or reviews", () => {
  const { container } = render(<MemoryRouter><Landing /></MemoryRouter>);
  const text = container.textContent ?? "";
  expect(text).not.toMatch(/\d+\s*(k|K|M|lakh|crore)?\+\s*(users|customers|downloads)/);
  expect(text).not.toMatch(/rating|reviews|testimonial|trusted by/i);
});
