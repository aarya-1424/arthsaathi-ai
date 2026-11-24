import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

vi.mock("../lib/supabase", () => ({ authConfigured: true, supabase: { auth: {} } }));

import { Landing } from "./Landing";

test("the Try it card updates the example split as you type", async () => {
  const user = userEvent.setup();
  render(<Landing />);
  const income = screen.getByLabelText("Your monthly income");
  expect(income).toHaveValue("28000");
  expect(screen.getByRole("img", { name: /Needs \(rent, food, bills\) ₹14,000 \(50%\)/ })).toBeInTheDocument();

  await user.clear(income);
  await user.type(income, "40000");
  expect(screen.getByRole("img", { name: /Savings ₹8,000 \(20%\)/ })).toBeInTheDocument();
});

test("the income box keeps digits only", async () => {
  const user = userEvent.setup();
  render(<Landing />);
  const income = screen.getByLabelText("Your monthly income");
  await user.clear(income);
  await user.type(income, "-12a.5");
  expect(income).toHaveValue("125");
});

test("the example is clearly labelled as an example, not advice", () => {
  render(<Landing />);
  expect(screen.getAllByText("Example").length).toBeGreaterThan(0);
  expect(screen.getByText(/It isn't advice/)).toBeInTheDocument();
});

test("features say honestly what is available now and what is coming soon", () => {
  render(<Landing />);
  const features = screen.getByRole("region", { name: /Everything about your money/ });
  expect(within(features).getAllByText("Available now")).toHaveLength(2);
  expect(within(features).getAllByText("Coming soon")).toHaveLength(4);
});

test("there is no usual top header or footer, and navigation lives in the floating pill", () => {
  const { container } = render(<Landing />);
  expect(container.querySelector("header")).toBeNull();
  expect(container.querySelector("footer")).toBeNull();
  const pill = screen.getByRole("navigation", { name: "Main" });
  expect(within(pill).getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(within(pill).getByRole("button", { name: "Get started" })).toBeInTheDocument();
});

test("the safety promise and legal note are on the page", () => {
  render(<Landing />);
  expect(screen.getByText(/No bank passwords, UPI PIN, OTP or card PIN/)).toBeInTheDocument();
  expect(screen.getByText(/not a registered investment adviser/)).toBeInTheDocument();
});

test("no fake numbers: no customer counts, ratings or reviews", () => {
  const { container } = render(<Landing />);
  const text = container.textContent ?? "";
  expect(text).not.toMatch(/\d+\s*(k|K|M|lakh|crore)?\+\s*(users|customers|downloads)/);
  expect(text).not.toMatch(/rating|reviews|testimonial|trusted by/i);
});
