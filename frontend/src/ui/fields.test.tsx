import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { dayHeading } from "../money/types";
import { AmountInput, DateField, groupDigits, longDate } from "./fields";
import { Sheet, useToast } from "./overlays";

test.each([["", ""], ["0", "0"], ["950", "950"], ["28000", "28,000"], ["150000", "1,50,000"], ["12345678", "1,23,45,678"]])(
  "groupDigits(%s) is %s", (digits, shown) => {
    expect(groupDigits(digits)).toBe(shown);
  });

function Amount({ onChange }: { onChange: (v: string) => void }) {
  const [v, setV] = useState("");
  return <AmountInput aria-label="Amount" value={v} maxDigits={7} onChange={(d) => { setV(d); onChange(d); }} />;
}

test("amount box shows commas, keeps only digits, drops leading zeros and stops at the limit", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<Amount onChange={onChange} />);
  const box = screen.getByLabelText("Amount");
  await user.type(box, "0012,5a0.0-0");
  expect(box).toHaveValue("1,25,000");
  expect(onChange).toHaveBeenLastCalledWith("125000");
  await user.type(box, "99999");
  expect(onChange).toHaveBeenLastCalledWith("1250009"); // 7 digits at most
});

test("deleting digits in the amount box works through the commas", async () => {
  const user = userEvent.setup();
  render(<Amount onChange={vi.fn()} />);
  const box = screen.getByLabelText("Amount");
  await user.type(box, "28000");
  await user.type(box, "{Backspace}{Backspace}");
  expect(box).toHaveValue("280");
});

test("longDate reads the Indian way", () => {
  expect(longDate("2026-11-26")).toBe("26 Nov 2026");
  expect(longDate("2026-01-05")).toBe("5 Jan 2026");
  expect(longDate("")).toBe("");
});

test("dayHeading says Today, Yesterday, or the weekday and date", () => {
  const now = new Date(2026, 10, 26, 9, 0); // 26 Nov 2026
  expect(dayHeading("2026-11-26", now)).toBe("Today");
  expect(dayHeading("2026-11-25", now)).toBe("Yesterday");
  expect(dayHeading("2026-11-24", now)).toBe("Tue, 24 Nov");
  expect(dayHeading("2026-10-31", new Date(2026, 10, 1))).toBe("Yesterday"); // across a month end
});

test("date box shows the tidy date at rest, and stays a real date control", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<DateField aria-label="Date" value="2026-11-26" max="2026-11-26" onChange={onChange} />);
  const input = screen.getByLabelText("Date");
  expect(input).toHaveAttribute("type", "date");
  expect(input).toHaveAttribute("max", "2026-11-26");
  expect(screen.getByText("26 Nov 2026")).toBeInTheDocument();
  await user.click(input); // while editing, the browser's own boxes show instead
  expect(screen.queryByText("26 Nov 2026")).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByText("26 Nov 2026")).toBeInTheDocument();
});

test("pop-up sheet: named dialog, closes on Escape, close button and outside click, restores focus", async () => {
  const user = userEvent.setup();
  function Demo() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        {open && <Sheet title="Add an entry" onClose={() => setOpen(false)}><input aria-label="First" /><button>Last</button></Sheet>}
      </>
    );
  }
  const { container } = render(<Demo />);
  const opener = screen.getByRole("button", { name: "Open" });

  await user.click(opener);
  expect(screen.getByRole("dialog", { name: "Add an entry" })).toBeInTheDocument();
  expect(screen.getByLabelText("First")).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  expect(document.body.style.overflow).toBe("");

  await user.click(opener);
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await user.click(opener);
  await user.click(container.ownerDocument.querySelector('[aria-hidden="true"].absolute')!);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("pop-up sheet keeps Tab inside it", async () => {
  const user = userEvent.setup();
  render(<Sheet title="T" onClose={vi.fn()}><input aria-label="First" /><button>Last</button></Sheet>);
  screen.getByRole("button", { name: "Last" }).focus();
  await user.tab(); // from the last control, Tab wraps to the first one (the close button)
  expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
});

test("toast shows a message and then clears it", async () => {
  function Demo() {
    const [toast, show] = useToast(200);
    return <><button onClick={() => show("Entry added")}>Go</button>{toast}</>;
  }
  const user = userEvent.setup();
  render(<Demo />);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  await user.click(screen.getByRole("button", { name: "Go" }));
  expect(screen.getByRole("status")).toHaveTextContent("Entry added");
  await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
});
