import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home, MessageCircle, Target, User, Wallet } from "lucide-react";
import { expect, test, vi } from "vitest";
import { AppShell } from "./AppShell";
import { Button, Chip, CountUpRupees, Progress } from "./components";

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "money", label: "My Money", icon: Wallet },
  { id: "goals", label: "Goals", icon: Target },
  { id: "profile", label: "Profile", icon: User },
];
const ASK = { id: "ask", label: "Ask ArthSaathi", icon: MessageCircle };

test("buttons are real buttons and don't submit forms by accident", () => {
  render(<form><Button>Cancel</Button></form>);
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
});

test("primary button can submit a form when asked", () => {
  render(<Button type="submit" variant="primary">Save</Button>);
  expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
});

test("chips tell screen readers whether they are selected", () => {
  render(<><Chip selected>This month</Chip><Chip selected={false}>Budget</Chip></>);
  expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Budget" })).toHaveAttribute("aria-pressed", "false");
});

test.each([
  [4500, 5000, "90"],
  [0, 5000, "0"],
  [6000, 5000, "100"], // over the limit: bar stops at 100%
  [-50, 5000, "0"],
  [100, 0, "0"], // no limit set: no division by zero
])("progress %i of %i reports %s%%", (value, max, expected) => {
  render(<Progress value={value} max={max} label="Food budget used" />);
  expect(screen.getByRole("progressbar", { name: "Food budget used" })).toHaveAttribute("aria-valuenow", expected);
});

test("count-up shows the exact final amount to screen readers immediately", async () => {
  render(<CountUpRupees value={14000} />);
  expect(screen.getByText("₹14,000", { selector: ".sr-only" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText("₹14,000")).toHaveLength(2), { timeout: 3000 }); // animation ends on the same number
});

test("count-up never shows a negative or overshooting number while animating", async () => {
  const { container } = render(<CountUpRupees value={14000} />);
  const visible = () => container.querySelector('[aria-hidden="true"]')!.textContent!;
  const seen: string[] = [];
  await waitFor(() => {
    seen.push(visible());
    expect(visible()).toBe("₹14,000");
  }, { timeout: 3000, interval: 16 });
  for (const text of seen) {
    const n = Number(text.replace(/[₹,]/g, ""));
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(14000);
  }
});

test("count-up skips the animation when the user prefers less motion", () => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
  render(<CountUpRupees value={2500} />);
  expect(screen.getAllByText("₹2,500")).toHaveLength(2);
  vi.unstubAllGlobals();
});

test("app shell has a rail (computer) and a dock (phone), with the current page marked", async () => {
  const onNavigate = vi.fn();
  const user = userEvent.setup();
  render(<AppShell items={NAV} ask={ASK} active="money" onNavigate={onNavigate}><p>Page content</p></AppShell>);

  const navs = screen.getAllByRole("navigation", { name: "Main" });
  expect(navs).toHaveLength(2);
  expect(screen.getByRole("main")).toHaveTextContent("Page content");
  for (const current of screen.getAllByRole("button", { name: "My Money" })) {
    expect(current).toHaveAttribute("aria-current", "page");
  }
  await user.click(screen.getAllByRole("button", { name: "Ask ArthSaathi" })[0]);
  expect(onNavigate).toHaveBeenCalledWith("ask");
  await user.click(screen.getAllByRole("button", { name: "Goals" })[1]);
  expect(onNavigate).toHaveBeenCalledWith("goals");
});

test("the Ask button sits in the middle of the dock", () => {
  render(<AppShell items={NAV} ask={ASK} active="home" onNavigate={vi.fn()}><p /></AppShell>);
  const dock = screen.getAllByRole("navigation", { name: "Main" })[1];
  const labels = Array.from(dock.querySelectorAll("button")).map((b) => b.getAttribute("aria-label") ?? b.textContent);
  expect(labels).toEqual(["Home", "My Money", "Ask ArthSaathi", "Goals", "Profile"]);
});

test("Saathi panel appears when provided", () => {
  render(<AppShell items={NAV} ask={ASK} active="home" onNavigate={vi.fn()} side={<p>Next steps</p>}><p /></AppShell>);
  expect(screen.getByRole("complementary", { name: "Saathi panel" })).toHaveTextContent("Next steps");
});
