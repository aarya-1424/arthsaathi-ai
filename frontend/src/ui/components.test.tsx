import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home, Plus, User, Wallet } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { AppShell } from "./AppShell";
import { Button, Chip, CountUpRupees, Progress } from "./components";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/money", label: "My Money", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

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

function shell(at: string, onAdd = vi.fn(), side?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <AppShell items={NAV} action={{ label: "Add entry", icon: Plus, onClick: onAdd }} side={side}><p>Page content</p></AppShell>
    </MemoryRouter>,
  );
}

test("app shell menus are real links, with the current page marked", () => {
  shell("/money");
  expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(2); // side panel + phone tab bar
  expect(screen.getByRole("main")).toHaveTextContent("Page content");
  for (const link of screen.getAllByRole("link", { name: "My Money" })) {
    expect(link).toHaveAttribute("href", "/money");
    expect(link).toHaveAttribute("aria-current", "page");
  }
  for (const link of screen.getAllByRole("link", { name: "Home" })) expect(link).not.toHaveAttribute("aria-current");
});

test("the menu only lists pages that exist (no unfinished pages)", () => {
  shell("/");
  const tabBar = screen.getAllByRole("navigation", { name: "Main" })[1];
  expect(Array.from(tabBar.querySelectorAll("a")).map((a) => a.textContent)).toEqual(["Home", "My Money", "Profile"]);
  expect(screen.queryByText(/Ask ArthSaathi|Goals/)).not.toBeInTheDocument();
});

test("the main action button works from both the side panel and the phone button", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  shell("/", onAdd);
  const buttons = screen.getAllByRole("button", { name: "Add entry" });
  expect(buttons).toHaveLength(2);
  for (const b of buttons) await user.click(b);
  expect(onAdd).toHaveBeenCalledTimes(2);
});

test("Saathi panel appears when provided", () => {
  shell("/", vi.fn(), <p>Next steps</p>);
  expect(screen.getByRole("complementary", { name: "Saathi panel" })).toHaveTextContent("Next steps");
});
